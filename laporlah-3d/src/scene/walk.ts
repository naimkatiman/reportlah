import * as THREE from 'three';
import { easeInOutCubic } from '../motion/timeline';
import { EYE_Y, POSES, POSE_NAMES, WALKWAY_Y, forwardVector, isLookingAtDrain, lerpPose, poseAt, tOfPose } from './poses';
import type { Pose, PoseName } from './poses';
import type { WalkHandle, WalkOptions } from './types';
import { buildWorld } from './world';

const MAX_PIXEL_RATIO = 2;
const LOOK_SPEED = 0.0042;
const MAX_YAW_OFFSET = 1.9;
const PITCH_MIN = -0.8;
const PITCH_MAX = 0.62;
const DRAG_THRESHOLD_PX = 5;
/** A tap further than this from every waypoint is ignored (metres). */
const TAP_REACH = 7;

interface Tween {
  from: Pose;
  to: Pose;
  toName: PoseName;
  startMs: number;
  durationMs: number;
  yawOffsetFrom: number;
  pitchOffsetFrom: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Vertical fov that keeps roughly an 80 degree horizontal view on wide and tall screens alike. */
function fovFor(aspect: number): number {
  const horizontal = (84 * Math.PI) / 180;
  const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect);
  return clamp((vertical * 180) / Math.PI, 52, 86);
}

function chevronGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.34, -0.42);
  s.lineTo(0.26, 0);
  s.lineTo(-0.34, 0.42);
  s.lineTo(-0.2, 0.42);
  s.lineTo(0.4, 0);
  s.lineTo(-0.2, -0.42);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function mountWalk(canvas: HTMLCanvasElement, opts: WalkOptions = {}): WalkHandle {
  const pinned = opts.pinTime !== undefined;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const world = buildWorld(renderer);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.12, 700);
  camera.rotation.order = 'YXZ';

  // Waypoint chevrons on the walkway (interactive mode only, stills stay clean).
  const markerGeo = chevronGeometry();
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false });
  const markers = new Map<PoseName, THREE.Mesh>();
  if (!pinned) {
    for (const name of POSE_NAMES) {
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(POSES[name].x + 2.2, WALKWAY_Y + 0.012, POSES[name].z);
      marker.renderOrder = 5;
      world.scene.add(marker);
      markers.set(name, marker);
    }
  }

  // View state
  let base: Pose = typeof opts.initialPose === 'number' ? poseAt(opts.initialPose) : POSES[opts.initialPose ?? 'street'];
  let currentName: PoseName | null = typeof opts.initialPose === 'number' ? null : (opts.initialPose ?? 'street');
  let yawOffset = 0;
  let pitchOffset = 0;
  let tween: Tween | null = null;
  let lastLooking: boolean | null = null;
  const drainListeners = new Set<(looking: boolean) => void>();
  let readyFired = false;
  let disposed = false;
  let renderQueued = false;

  const now = (): number => performance.now();
  const seconds = (): number => (opts.pinTime !== undefined ? opts.pinTime : now() / 1000);

  function updateMarkers(): void {
    markers.forEach((marker, name) => {
      marker.visible = name !== currentName && !tween;
    });
  }

  function currentPose(): Pose {
    if (!tween) return base;
    const raw = clamp((now() - tween.startMs) / tween.durationMs, 0, 1);
    return lerpPose(tween.from, tween.to, easeInOutCubic(raw));
  }

  /** Look offsets as seen right now, including the part still easing out during a move. */
  function currentOffsets(): { yaw: number; pitch: number } {
    if (!tween) return { yaw: yawOffset, pitch: pitchOffset };
    const eased = easeInOutCubic(clamp((now() - tween.startMs) / tween.durationMs, 0, 1));
    return { yaw: tween.yawOffsetFrom * (1 - eased), pitch: tween.pitchOffsetFrom * (1 - eased) };
  }

  function resize(): void {
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = fovFor(camera.aspect);
    camera.updateProjectionMatrix();
  }

  function applyCamera(): { x: number; y: number; z: number; yaw: number; pitch: number } {
    let pose = base;
    let bob = 0;
    let yOff = yawOffset;
    let pOff = pitchOffset;
    if (tween) {
      const raw = clamp((now() - tween.startMs) / tween.durationMs, 0, 1);
      const eased = easeInOutCubic(raw);
      pose = lerpPose(tween.from, tween.to, eased);
      yOff = tween.yawOffsetFrom * (1 - eased);
      pOff = tween.pitchOffsetFrom * (1 - eased);
      bob = Math.sin(raw * Math.PI * 7) * 0.022 * Math.sin(raw * Math.PI);
    }
    const yaw = pose.yaw + yOff;
    const pitch = clamp(pose.pitch + pOff, PITCH_MIN, PITCH_MAX);
    const y = EYE_Y + bob;
    camera.position.set(pose.x, y, pose.z);
    const f = forwardVector(yaw, pitch);
    camera.lookAt(pose.x + f.x, y + f.y, pose.z + f.z);
    return { x: pose.x, y, z: pose.z, yaw, pitch };
  }

  function finishTween(): void {
    if (!tween) return;
    base = tween.to;
    currentName = tween.toName;
    yawOffset = 0;
    pitchOffset = 0;
    tween = null;
    updateMarkers();
    opts.onPoseChange?.(currentName);
  }

  function renderOnce(): void {
    if (disposed) return;
    if (tween && now() - tween.startMs >= tween.durationMs) finishTween();
    world.update(seconds());
    const view = applyCamera();
    world.sky.mesh.position.copy(camera.position);
    renderer.render(world.scene, camera);

    const looking = isLookingAtDrain(view, view.yaw, view.pitch);
    if (looking !== lastLooking) {
      lastLooking = looking;
      drainListeners.forEach((cb) => cb(looking));
    }
    if (!readyFired) {
      readyFired = true;
      opts.onReady?.();
    }
  }

  function requestRender(): void {
    if (!pinned || renderQueued || disposed) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderOnce();
    });
  }

  function moveTo(name: PoseName): void {
    if (disposed) return;
    const from = currentPose();
    const to = POSES[name];
    const instant = pinned || opts.reducedMotion === true;
    if (instant) {
      tween = null;
      base = to;
      currentName = name;
      yawOffset = 0;
      pitchOffset = 0;
      updateMarkers();
      opts.onPoseChange?.(name);
      requestRender();
      return;
    }
    if (tween?.toName === name) return;
    if (!tween && currentName === name) return;
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const carried = currentOffsets();
    tween = {
      from,
      to,
      toName: name,
      startMs: now(),
      durationMs: clamp(900 + distance * 90, 1100, 2400),
      yawOffsetFrom: carried.yaw,
      pitchOffsetFrom: carried.pitch,
    };
    updateMarkers();
    opts.onPoseChange?.(null);
  }

  // Pointer: drag to look, tap the walkway to walk to the nearest waypoint.
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WALKWAY_Y);
  const raycaster = new THREE.Raycaster();
  let pointer: { id: number; x: number; y: number; startX: number; startY: number; dragged: boolean } | null = null;

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragged: false };
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.dragged && Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) < DRAG_THRESHOLD_PX) return;
    pointer.dragged = true;
    canvas.style.cursor = 'grabbing';
    if (tween) return;
    // Grab the world: dragging right turns the view left.
    yawOffset = clamp(yawOffset - dx * LOOK_SPEED, -MAX_YAW_OFFSET, MAX_YAW_OFFSET);
    pitchOffset = clamp(pitchOffset + dy * LOOK_SPEED, PITCH_MIN - base.pitch, PITCH_MAX - base.pitch);
    requestRender();
  }

  function onPointerUp(e: PointerEvent): void {
    if (!pointer || e.pointerId !== pointer.id) return;
    const wasDrag = pointer.dragged;
    pointer = null;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (wasDrag) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
    if (!hit) return;
    let best: PoseName | null = null;
    let bestDistance = TAP_REACH;
    for (const name of POSE_NAMES) {
      const dist = Math.hypot(hit.x - POSES[name].x, hit.z - POSES[name].z);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = name;
      }
    }
    if (best && best !== currentName) moveTo(best);
  }

  function onKeyDown(e: KeyboardEvent): void {
    const index = currentName ? POSE_NAMES.indexOf(currentName) : -1;
    const step = 0.12;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        if (index >= 0 && index < POSE_NAMES.length - 1) moveTo(POSE_NAMES[index + 1] as PoseName);
        break;
      case 'ArrowDown':
      case 's':
        if (index > 0) moveTo(POSE_NAMES[index - 1] as PoseName);
        break;
      case 'ArrowLeft':
      case 'a':
        yawOffset = clamp(yawOffset - step, -MAX_YAW_OFFSET, MAX_YAW_OFFSET);
        break;
      case 'ArrowRight':
      case 'd':
        yawOffset = clamp(yawOffset + step, -MAX_YAW_OFFSET, MAX_YAW_OFFSET);
        break;
      default:
        return;
    }
    e.preventDefault();
    requestRender();
  }

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.tabIndex = 0;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('keydown', onKeyDown);

  const observer = new ResizeObserver(() => {
    resize();
    requestRender();
  });
  observer.observe(canvas);
  resize();
  updateMarkers();

  if (pinned) requestRender();
  else renderer.setAnimationLoop(renderOnce);
  if (currentName) opts.onPoseChange?.(currentName);

  return {
    setPose(pose) {
      if (disposed) return;
      tween = null;
      yawOffset = 0;
      pitchOffset = 0;
      if (typeof pose === 'number') {
        base = poseAt(pose);
        currentName = POSE_NAMES.find((n) => Math.abs(tOfPose(n) - pose) < 1e-6) ?? null;
      } else {
        base = POSES[pose];
        currentName = pose;
      }
      updateMarkers();
      if (currentName) opts.onPoseChange?.(currentName);
      requestRender();
      if (!pinned) renderOnce();
    },
    walkTo(name) {
      moveTo(name);
    },
    onReachDrain(cb) {
      drainListeners.add(cb);
      if (lastLooking !== null) cb(lastLooking);
      return () => void drainListeners.delete(cb);
    },
    snap() {
      renderOnce();
      const width = Math.min(960, canvas.width);
      const height = Math.round((width * canvas.height) / canvas.width);
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      const g = out.getContext('2d');
      if (!g) throw new Error('2D canvas is not available');
      g.drawImage(canvas, 0, 0, width, height);
      return out.toDataURL('image/jpeg', 0.86);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('keydown', onKeyDown);
      drainListeners.clear();
      markerGeo.dispose();
      markerMat.dispose();
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

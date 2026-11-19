/**
 * World layout, in metres. The street runs along +x. Looking down +x, the road is on the
 * left (z < 3.5), the open drain sits between the kerb and the walkway (z about 4.1) and
 * the pedestrian walkway, bus stop and wall are on the right (z > 4.55).
 */
export const WALKWAY_Y = 0.12;
export const EYE_Y = WALKWAY_Y + 1.62;
export const DRAIN_CENTER = { x: 30.2, y: 0, z: 4.1 } as const;

export type PoseName = 'street' | 'bus-stop' | 'approach' | 'drain';
export const POSE_NAMES: readonly PoseName[] = ['street', 'bus-stop', 'approach', 'drain'];

export interface Pose {
  readonly x: number;
  readonly z: number;
  /** Radians about the vertical axis. 0 looks along +x, positive turns toward +z. */
  readonly yaw: number;
  /** Radians, positive looks up. */
  readonly pitch: number;
}

function facing(x: number, z: number, tx: number, ty: number, tz: number): Pose {
  const dx = tx - x;
  const dz = tz - z;
  return { x, z, yaw: Math.atan2(dz, dx), pitch: Math.atan2(ty - EYE_Y, Math.hypot(dx, dz)) };
}

export const POSES: Readonly<Record<PoseName, Pose>> = {
  street: { x: 2, z: 6.1, yaw: -0.07, pitch: -0.03 },
  'bus-stop': { x: 9.5, z: 6, yaw: -0.1, pitch: -0.04 },
  approach: { x: 19.5, z: 6, yaw: -0.07, pitch: -0.1 },
  drain: facing(26, 6.5, DRAIN_CENTER.x, -0.05, DRAIN_CENTER.z),
};

export function tOfPose(name: PoseName): number {
  return POSE_NAMES.indexOf(name) / (POSE_NAMES.length - 1);
}

function lerpAngle(a: number, b: number, f: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * f;
}

export function lerpPose(a: Pose, b: Pose, f: number): Pose {
  return {
    x: a.x + (b.x - a.x) * f,
    z: a.z + (b.z - a.z) * f,
    yaw: lerpAngle(a.yaw, b.yaw, f),
    pitch: a.pitch + (b.pitch - a.pitch) * f,
  };
}

/** Pose at fraction `t` (0..1) of the whole walk, street to drain. */
export function poseAt(t: number): Pose {
  const last = POSE_NAMES.length - 1;
  const u = Math.min(1, Math.max(0, t)) * last;
  const i = Math.min(last - 1, Math.floor(u));
  const from = POSES[POSE_NAMES[i] as PoseName];
  const to = POSES[POSE_NAMES[i + 1] as PoseName];
  return lerpPose(from, to, u - i);
}

export function forwardVector(yaw: number, pitch: number): { x: number; y: number; z: number } {
  return { x: Math.cos(pitch) * Math.cos(yaw), y: Math.sin(pitch), z: Math.cos(pitch) * Math.sin(yaw) };
}

export const DRAIN_VIEW_MAX_DISTANCE = 8;
export const DRAIN_VIEW_MAX_ANGLE = 0.5;

/** True when the camera is close enough to the drain and pointed at it. */
export function isLookingAtDrain(eye: { x: number; y: number; z: number }, yaw: number, pitch: number): boolean {
  const to = { x: DRAIN_CENTER.x - eye.x, y: DRAIN_CENTER.y - eye.y, z: DRAIN_CENTER.z - eye.z };
  const distance = Math.hypot(to.x, to.y, to.z);
  if (distance > DRAIN_VIEW_MAX_DISTANCE) return false;
  const f = forwardVector(yaw, pitch);
  const cos = (f.x * to.x + f.y * to.y + f.z * to.z) / distance;
  return Math.acos(Math.min(1, Math.max(-1, cos))) <= DRAIN_VIEW_MAX_ANGLE;
}

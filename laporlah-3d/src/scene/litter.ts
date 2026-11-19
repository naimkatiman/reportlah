import * as THREE from 'three';
import { WALKWAY_Y } from './poses';
import { createRng } from './rng';
import { leafTexture } from './textures';
import { CHANNEL_Z0, CHANNEL_Z1, CLOG_X0, CLOG_X1, GRATE_Y, PUDDLE } from './street';
import { physical, standard, track } from './util';
import type { Disposables } from './util';

/** The steel grating over the clogged stretch, with leaves, bottles, bags and foam packed against it. */
export function buildClog(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const rng = createRng(2026);

  // Grating: cross bars plus two long bearers
  const steel = standard(d, { color: 0x3c3f42, roughness: 0.55, metalness: 0.75 });
  const rust = standard(d, { color: 0x6a4a34, roughness: 0.85, metalness: 0.3 });
  const barGeo = track(d, new THREE.BoxGeometry(0.035, 0.05, CHANNEL_Z1 - CHANNEL_Z0 + 0.1));
  const bars = new THREE.InstancedMesh(barGeo, steel, 28);
  const m = new THREE.Matrix4();
  const spacing = (CLOG_X1 - CLOG_X0) / 28;
  for (let i = 0; i < 28; i += 1) {
    m.makeTranslation(CLOG_X0 + spacing * (i + 0.5), GRATE_Y, (CHANNEL_Z0 + CHANNEL_Z1) / 2);
    bars.setMatrixAt(i, m);
  }
  bars.castShadow = true;
  bars.receiveShadow = true;
  group.add(bars);
  const bearerGeo = track(d, new THREE.BoxGeometry(CLOG_X1 - CLOG_X0 + 0.2, 0.06, 0.05));
  for (const z of [CHANNEL_Z0 + 0.12, CHANNEL_Z1 - 0.12]) {
    const bearer = new THREE.Mesh(bearerGeo, rust);
    bearer.position.set((CLOG_X0 + CLOG_X1) / 2, GRATE_Y - 0.01, z);
    bearer.castShadow = true;
    group.add(bearer);
  }

  // Leaves: four atlas cells, one instanced mesh each
  const leaves = leafTexture();
  const leafMat = standard(d, { map: leaves, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const cells: ReadonlyArray<readonly [number, number]> = [
    [0, 0.5],
    [0.5, 0.5],
    [0, 0],
    [0.5, 0],
  ];
  const leafCount = 18;
  cells.forEach(([u0, v0]) => {
    const geometry = track(d, new THREE.PlaneGeometry(0.22, 0.13));
    geometry.rotateX(-Math.PI / 2);
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
    const mesh = new THREE.InstancedMesh(geometry, leafMat, leafCount);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    for (let i = 0; i < leafCount; i += 1) {
      // Mostly on the grating, thinning out toward both ends, a few on the paving.
      const onWalkway = rng.next() > 0.86;
      const x = onWalkway ? rng.range(CLOG_X0 - 1.2, CLOG_X1 + 1.2) : rng.range(CLOG_X0 - 0.4, CLOG_X1 + 0.4);
      const z = onWalkway ? rng.range(4.7, 5.9) : rng.range(CHANNEL_Z0 + 0.04, CHANNEL_Z1 - 0.04);
      const pile = 1 - Math.abs((x - (CLOG_X0 + CLOG_X1) / 2) / ((CLOG_X1 - CLOG_X0) / 2 + 0.4));
      const y = onWalkway ? WALKWAY_Y + 0.012 : GRATE_Y + 0.03 + Math.max(0, pile) * rng.range(0, 0.07);
      e.set(rng.range(-0.3, 0.3), rng.range(0, Math.PI * 2), rng.range(-0.3, 0.3));
      q.setFromEuler(e);
      const s = rng.range(0.8, 1.5);
      scale.set(s, 1, s);
      pos.set(x, y, z);
      mesh.setMatrixAt(i, m.compose(pos, q, scale));
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // Plastic bottles, cans and a foam box wedged against the bars
  const bottleMat = physical(d, { color: 0x9fd2e3, roughness: 0.2, transparent: true, opacity: 0.7, clearcoat: 0.8 });
  const bottleGeo = track(d, new THREE.CylinderGeometry(0.036, 0.036, 0.2, 14));
  const neckGeo = track(d, new THREE.CylinderGeometry(0.014, 0.034, 0.05, 14));
  const capMat = standard(d, { color: 0xd23b34, roughness: 0.5 });
  const capGeo = track(d, new THREE.CylinderGeometry(0.017, 0.017, 0.02, 12));
  const bottles: ReadonlyArray<readonly [number, number, number, number]> = [
    [29.4, 0.11, 4.0, 0.7],
    [30.9, 0.12, 4.28, -0.5],
    [31.3, 0.125, 3.9, 1.9],
    [29.9, 0.15, 4.2, 2.6],
  ];
  for (const [x, y, z, rot] of bottles) {
    const bottle = new THREE.Group();
    const body = new THREE.Mesh(bottleGeo, bottleMat);
    const neck = new THREE.Mesh(neckGeo, bottleMat);
    neck.position.y = 0.125;
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.16;
    bottle.add(body, neck, cap);
    bottle.rotation.set(Math.PI / 2 + rng.range(-0.2, 0.2), rot, 0, 'YXZ');
    bottle.position.set(x, y, z);
    bottle.traverse((o) => {
      o.castShadow = true;
    });
    group.add(bottle);
  }
  const canMat = standard(d, { color: 0xb9bcc0, roughness: 0.35, metalness: 0.85 });
  const canGeo = track(d, new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14));
  for (const [x, y, z, rot] of [
    [30.2, 0.125, 4.05, 0.4],
    [31.0, 0.11, 4.4, 1.2],
  ] as const) {
    const can = new THREE.Mesh(canGeo, canMat);
    can.rotation.set(Math.PI / 2, rot, 0, 'YXZ');
    can.position.set(x, y, z);
    can.castShadow = true;
    group.add(can);
  }
  const foam = new THREE.Mesh(
    track(d, new THREE.BoxGeometry(0.34, 0.06, 0.24)),
    standard(d, { color: 0xe8e6dc, roughness: 0.95 }),
  );
  foam.position.set(30.5, 0.14, 3.95);
  foam.rotation.set(0.08, 0.5, -0.06);
  foam.castShadow = true;
  group.add(foam);

  // Plastic bags: squashed, noisy blobs
  const bagGeo = track(d, new THREE.IcosahedronGeometry(0.15, 3));
  const bagPos = bagGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < bagPos.count; i += 1) {
    const f = 1 + rng.range(-0.22, 0.22);
    bagPos.setXYZ(i, bagPos.getX(i) * f, bagPos.getY(i) * f, bagPos.getZ(i) * f);
  }
  bagGeo.computeVertexNormals();
  const bags: ReadonlyArray<readonly [number, number, number, number, number]> = [
    [30.0, 0.135, 4.3, 0xf2f0ea, 0.5],
    [29.2, 0.125, 4.2, 0x1c1d1f, 0.8],
    [31.1, 0.13, 4.1, 0xe9e7df, 0.4],
  ];
  for (const [x, y, z, color, o] of bags) {
    const mat = standard(d, { color, roughness: 0.35, transparent: true, opacity: 0.55 + o * 0.4 });
    const bag = new THREE.Mesh(bagGeo, mat);
    bag.scale.set(1.5, 0.45, 1.1);
    bag.rotation.y = rng.range(0, 3);
    bag.position.set(x, y, z);
    bag.castShadow = true;
    group.add(bag);
  }

  // Twigs
  const twigMat = standard(d, { color: 0x4a3626, roughness: 1 });
  const twigGeo = track(d, new THREE.CylinderGeometry(0.008, 0.012, 0.5, 6));
  for (let i = 0; i < 9; i += 1) {
    const twig = new THREE.Mesh(twigGeo, twigMat);
    twig.rotation.set(Math.PI / 2 + rng.range(-0.15, 0.15), rng.range(0, Math.PI), 0, 'YXZ');
    twig.position.set(rng.range(CLOG_X0, CLOG_X1), GRATE_Y + rng.range(0.05, 0.1), rng.range(CHANNEL_Z0 + 0.1, CHANNEL_Z1 - 0.1));
    twig.scale.y = rng.range(0.5, 1.3);
    group.add(twig);
  }

  // Green-brown scum film on the standing water
  const scumGeo = track(d, new THREE.CircleGeometry(0.5, 18));
  scumGeo.rotateX(-Math.PI / 2);
  const scumMat = standard(d, { color: 0x4f5a2a, roughness: 0.9, transparent: true, opacity: 0.5, depthWrite: false });
  for (const [x, z, s] of [
    [PUDDLE.x - 0.7, PUDDLE.z - 0.1, 0.9],
    [PUDDLE.x + 0.9, PUDDLE.z + 0.15, 0.6],
    [PUDDLE.x + 0.1, PUDDLE.z - 0.35, 0.7],
  ] as const) {
    const scum = new THREE.Mesh(scumGeo, scumMat);
    scum.position.set(x, WALKWAY_Y + 0.011, z);
    scum.scale.set(s * 1.4, 1, s * 0.8);
    scum.renderOrder = 4;
    group.add(scum);
  }

  d.textures.push(leaves);
  return group;
}

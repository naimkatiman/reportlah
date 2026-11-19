import * as THREE from 'three';
import { WALKWAY_Y } from './poses';
import { createRng } from './rng';
import type { Rng } from './rng';
import { concreteTexture, facadeTexture, signTexture, towerTexture } from './textures';
import { WALKWAY_Z1, X_MAX, X_MIN } from './street';
import { boxMesh, physical, standard, track } from './util';
import type { Disposables } from './util';

function cylinder(d: Disposables, material: THREE.Material, rTop: number, rBottom: number, height: number, x: number, y: number, z: number, radial = 12): THREE.Mesh {
  const mesh = new THREE.Mesh(track(d, new THREE.CylinderGeometry(rTop, rBottom, height, radial)), material);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Bus shelter with glass back panel, bench, route sign and a metal bus stop pole. */
export function buildBusStop(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const x0 = 13.5;
  const x1 = 18.5;
  const z0 = 6.55;
  const z1 = 8.25;
  const paint = standard(d, { color: 0x2f4c74, roughness: 0.55, metalness: 0.35 });
  const roofMat = standard(d, { color: 0xdfe3e6, roughness: 0.6, metalness: 0.2 });
  const glass = physical(d, { color: 0xaed4de, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const wood = standard(d, { color: 0x7d5a3b, roughness: 0.75 });

  for (const px of [x0 + 0.1, x1 - 0.1]) {
    for (const pz of [z0 + 0.05, z1 - 0.05]) group.add(cylinder(d, paint, 0.045, 0.05, 2.6, px, WALKWAY_Y, pz));
  }
  // Roof: a slight slope toward the road
  const roof = boxMesh(d, roofMat, [x0 - 0.2, WALKWAY_Y + 2.62, z0 - 0.35], [x1 - x0 + 0.4, 0.09, z1 - z0 + 0.5]);
  roof.rotation.x = 0.04;
  group.add(roof);
  group.add(boxMesh(d, paint, [x0 - 0.2, WALKWAY_Y + 2.52, z0 - 0.35], [x1 - x0 + 0.4, 0.1, 0.07]));
  // Glass panels on the back and one side
  group.add(boxMesh(d, glass, [x0 + 0.1, WALKWAY_Y + 0.25, z1 - 0.06], [x1 - x0 - 0.2, 2.25, 0.02], { cast: false }));
  group.add(boxMesh(d, glass, [x1 - 0.12, WALKWAY_Y + 0.25, z0 + 0.05], [0.02, 2.25, z1 - z0 - 0.1], { cast: false }));
  // Bench with slats
  for (let i = 0; i < 4; i += 1) {
    group.add(boxMesh(d, wood, [x0 + 0.5, WALKWAY_Y + 0.46, z1 - 0.62 + i * 0.13], [x1 - x0 - 1.4, 0.04, 0.1]));
  }
  for (const bx of [x0 + 0.6, x1 - 1.0]) group.add(boxMesh(d, paint, [bx, WALKWAY_Y, z1 - 0.6], [0.05, 0.46, 0.5]));
  // Route pole and sign at the kerb side
  const sign = signTexture('bus');
  const signMat = standard(d, { map: sign, roughness: 0.5 });
  group.add(cylinder(d, standard(d, { color: 0x8c9196, roughness: 0.45, metalness: 0.8 }), 0.03, 0.03, 2.9, x0 - 0.9, WALKWAY_Y, 5.0, 10));
  const plate = boxMesh(d, [paint, paint, paint, paint, signMat, signMat], [x0 - 1.15, WALKWAY_Y + 2.15, 4.96], [0.5, 0.5, 0.03]);
  group.add(plate);
  return group;
}

/** Street lights along the walkway kerb, plus the street name sign. */
export function buildStreetFurniture(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const pole = standard(d, { color: 0x6f757b, roughness: 0.5, metalness: 0.7 });
  const lens = standard(d, { color: 0xfff6d8, emissive: 0xfff2c4, emissiveIntensity: 0.55, roughness: 0.3 });
  const head = standard(d, { color: 0x4d5256, roughness: 0.5, metalness: 0.6 });
  const armGeo = track(d, new THREE.CylinderGeometry(0.035, 0.05, 2.6, 8));
  for (const x of [-12, 4, 22, 35.5, 52, 70]) {
    const z = 5.05;
    const baseH = 8;
    group.add(cylinder(d, pole, 0.06, 0.1, baseH, x, WALKWAY_Y, z, 10));
    group.add(cylinder(d, pole, 0.16, 0.16, 0.5, x, WALKWAY_Y, z, 10));
    const arm = new THREE.Mesh(armGeo, pole);
    arm.rotation.x = Math.PI / 2 - 0.18; // leans toward the road (-z)
    arm.position.set(x, WALKWAY_Y + baseH + 0.1, z - 1.2);
    arm.castShadow = true;
    group.add(arm);
    group.add(boxMesh(d, head, [x - 0.16, WALKWAY_Y + baseH + 0.04, z - 2.65], [0.34, 0.1, 0.8]));
    group.add(boxMesh(d, lens, [x - 0.13, WALKWAY_Y + baseH - 0.005, z - 2.6], [0.26, 0.02, 0.68], { cast: false }));
  }
  // Street name sign
  const signMat = standard(d, { map: signTexture('street'), roughness: 0.5 });
  const post = standard(d, { color: 0x8c9196, roughness: 0.45, metalness: 0.8 });
  group.add(cylinder(d, post, 0.03, 0.03, 2.5, 6.4, WALKWAY_Y, 4.95, 10));
  group.add(boxMesh(d, [post, post, post, post, signMat, signMat], [5.5, WALKWAY_Y + 2.0, 4.92], [1.8, 0.45, 0.03]));
  // A public bin by the bus stop
  const bin = standard(d, { color: 0x2f6b4a, roughness: 0.6 });
  group.add(cylinder(d, bin, 0.27, 0.24, 0.85, 21.4, WALKWAY_Y, 5.2, 16));
  group.add(cylinder(d, standard(d, { color: 0x1d4631, roughness: 0.6 }), 0.28, 0.28, 0.06, 21.4, WALKWAY_Y + 0.85, 5.2, 16));
  return group;
}

/** Low railing along the wall: posts every 2.4 m and a top rail. */
export function buildRailing(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const metal = standard(d, { color: 0x3f5a46, roughness: 0.55, metalness: 0.5 });
  const count = Math.floor((X_MAX - X_MIN) / 2.4);
  const postGeo = track(d, new THREE.BoxGeometry(0.05, 0.55, 0.05));
  const posts = new THREE.InstancedMesh(postGeo, metal, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    m.makeTranslation(X_MIN + i * 2.4, WALKWAY_Y + 0.85 + 0.275, WALKWAY_Z1 + 0.12);
    posts.setMatrixAt(i, m);
  }
  posts.castShadow = true;
  group.add(posts);
  group.add(boxMesh(d, metal, [X_MIN, WALKWAY_Y + 1.36, WALKWAY_Z1 + 0.1], [X_MAX - X_MIN, 0.04, 0.05], { cast: false }));
  group.add(boxMesh(d, metal, [X_MIN, WALKWAY_Y + 1.1, WALKWAY_Z1 + 0.1], [X_MAX - X_MIN, 0.03, 0.04], { cast: false }));
  return group;
}

/** A lumpy foliage blob. Vertex colours darken toward the underside. */
function blobGeometry(d: Disposables, rng: Rng, radius: number, base: THREE.Color, detail = 3): THREE.BufferGeometry {
  const geometry = track(d, new THREE.IcosahedronGeometry(radius, detail));
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const phase = rng.range(0, 10);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 1 + 0.16 * Math.sin(x * 5.1 + phase) * Math.cos(z * 4.3 + phase * 1.3) + 0.1 * Math.sin(y * 7.7 + phase * 0.7);
    pos.setXYZ(i, x * n, y * n * 0.85, z * n);
    const light = 0.55 + 0.55 * ((y / radius + 1) / 2) + rng.range(-0.06, 0.06);
    tmp.copy(base).multiplyScalar(light);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Rain trees with broad crowns behind the wall, plus shrubs along it. */
export function buildTrees(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const rng = createRng(555);
  const foliageMat = standard(d, { vertexColors: true, roughness: 0.92 });
  const bark = standard(d, { color: 0x4d3b2d, roughness: 1, map: concreteTexture(30) });
  const bases = [new THREE.Color(0x3d7a35), new THREE.Color(0x2f6a30), new THREE.Color(0x4f8a3c), new THREE.Color(0x366b2c)];
  const geos = bases.map((c, i) => blobGeometry(d, createRng(900 + i), 1, c));

  const xs = [-30, -17, -6, 7, 18, 29, 40, 52, 63, 76];
  xs.forEach((tx, index) => {
    const x = tx + rng.range(-2, 2);
    const z = 11 + rng.range(-0.8, 2.2);
    const trunkH = rng.range(5, 7);
    const trunk = cylinder(d, bark, 0.28, 0.45, trunkH, x, WALKWAY_Y, z, 10);
    group.add(trunk);
    const crown = rng.range(3.4, 4.6);
    const blobs = rng.int(7, 9);
    for (let i = 0; i < blobs; i += 1) {
      const a = (i / blobs) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const r = i === 0 ? 0 : rng.range(0.4, 0.85) * crown;
      const blob = new THREE.Mesh(geos[(index + i) % geos.length], foliageMat);
      const size = rng.range(0.55, 0.85) * crown;
      blob.scale.setScalar(size);
      blob.position.set(x + Math.cos(a) * r, WALKWAY_Y + trunkH + rng.range(-0.4, 1.6), z + Math.sin(a) * r * 0.9);
      blob.rotation.y = rng.range(0, 6);
      blob.castShadow = true;
      blob.receiveShadow = true;
      group.add(blob);
    }
  });

  // Shrubs hugging the wall on the grass side
  for (let x = X_MIN + 3; x < 90; x += rng.range(3, 6)) {
    const shrub = new THREE.Mesh(geos[rng.int(0, 3)], foliageMat);
    const s = rng.range(0.6, 1.1);
    shrub.scale.set(s * 1.3, s, s);
    shrub.position.set(x, 0.18 + s * 0.55, WALKWAY_Z1 + rng.range(0.9, 1.6));
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    group.add(shrub);
  }
  return group;
}

function car(d: Disposables, bodyColor: number, x: number, z: number, yaw: number): THREE.Group {
  const g = new THREE.Group();
  const paint = standard(d, { color: bodyColor, roughness: 0.32, metalness: 0.55 });
  const glass = standard(d, { color: 0x1c2630, roughness: 0.12, metalness: 0.2 });
  const tyre = standard(d, { color: 0x15171a, roughness: 0.9 });
  g.add(boxMesh(d, paint, [-2.1, 0.32, -0.88], [4.2, 0.62, 1.76]));
  g.add(boxMesh(d, glass, [-1.0, 0.94, -0.8], [2.1, 0.55, 1.6]));
  g.add(boxMesh(d, paint, [-0.9, 1.48, -0.75], [1.9, 0.07, 1.5]));
  const wheel = track(d, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18));
  wheel.rotateX(Math.PI / 2);
  for (const wx of [-1.4, 1.4]) {
    for (const wz of [-0.82, 0.82]) {
      const w = new THREE.Mesh(wheel, tyre);
      w.position.set(wx, 0.33, wz);
      w.castShadow = true;
      g.add(w);
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  return g;
}

export function buildCars(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  group.add(car(d, 0xb8bcc2, 6, -2.75, 0.02));
  group.add(car(d, 0x8d1f27, 19, -2.7, -0.02));
  group.add(car(d, 0xe9ecee, 41, -2.8, 0.01));
  group.add(car(d, 0x20324e, 62, -2.7, 0));
  group.add(car(d, 0xd6d0c4, -14, -2.8, 0.02));
  return group;
}

/** Row of shop-lots across the road, and distant flats fading into haze. */
export function buildBuildings(d: Disposables): THREE.Group {
  const group = new THREE.Group();
  const rng = createRng(777);
  const hues = [
    { hue: 28, sat: 28, light: 78 },
    { hue: 200, sat: 20, light: 74 },
    { hue: 14, sat: 38, light: 70 },
    { hue: 90, sat: 14, light: 76 },
    { hue: 48, sat: 30, light: 82 },
    { hue: 350, sat: 16, light: 72 },
  ];
  const facades = hues.map((h, i) => facadeTexture({ seed: 100 + i, ...h, floors: 3, shopfront: true }));
  const sideMats = hues.map((h) => standard(d, { color: new THREE.Color().setHSL(h.hue / 360, h.sat / 100, (h.light - 10) / 100), roughness: 0.95 }));
  const roofMat = standard(d, { color: 0x75706a, roughness: 0.95 });
  facades.forEach((t) => d.textures.push(t));

  const unitW = 5.4;
  for (let x = X_MIN; x < X_MAX; x += unitW) {
    const i = rng.int(0, hues.length - 1);
    const height = 11 + rng.range(-0.4, 0.8);
    const facadeMat = standard(d, { map: facades[i], roughness: 0.9 });
    const side = sideMats[i] as THREE.Material;
    // Faces: +x, -x, +y, -y, +z (toward the street), -z
    group.add(boxMesh(d, [side, side, roofMat, side, facadeMat, side], [x, 0, -22], [unitW - 0.05, height, 12.6], { cast: x > -40 && x < 90 }));
    group.add(boxMesh(d, roofMat, [x + 1, height, -12], [1.2, 1.1, 1.2], { cast: false }));
  }

  // Distant flats
  const flatXs = [-70, -30, 10, 50, 95, 140];
  flatXs.forEach((fx, i) => {
    const tex = towerTexture(300 + i, 190 + (i % 3) * 18);
    tex.repeat.set(1, 1);
    d.textures.push(tex);
    const mat = standard(d, { map: tex, roughness: 0.85 });
    const h = 60 + rng.range(0, 55);
    group.add(boxMesh(d, [mat, mat, roofMat, mat, mat, mat], [fx + rng.range(-8, 8), 0, 40 + rng.range(0, 25)], [22, h, 16], { cast: false }));
  });
  const farTowers = [-140, -55, 30, 120];
  farTowers.forEach((fx, i) => {
    const tex = towerTexture(400 + i, 205);
    d.textures.push(tex);
    const mat = standard(d, { map: tex, roughness: 0.7, metalness: 0.2 });
    const h = 120 + i * 25;
    group.add(boxMesh(d, mat, [fx, 0, -120 - i * 30], [26, h, 26], { cast: false }));
  });
  return group;
}

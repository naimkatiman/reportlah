import * as THREE from 'three';
import { WALKWAY_Y } from './poses';
import {
  asphaltTexture,
  concreteTexture,
  dashTexture,
  grassTexture,
  pavingTexture,
  rippleNormalTexture,
  stainTexture,
  tactileTexture,
  zebraTexture,
} from './textures';
import { boxMesh, flatPlane, physical, standard, track } from './util';
import type { Disposables } from './util';
import { createRng } from './rng';

export const X_MIN = -90;
export const X_MAX = 230;
export const ROAD_Z0 = -4.2;
export const ROAD_Z1 = 3.5;
export const CHANNEL_Z0 = 3.72;
export const CHANNEL_Z1 = 4.48;
export const WALKWAY_Z0 = 4.62;
export const WALKWAY_Z1 = 8.5;
export const CHANNEL_FLOOR = -0.5;
export const CLOG_X0 = 28.6;
export const CLOG_X1 = 31.8;
export const GRATE_Y = 0.105;
export const PUDDLE = { x: 30.6, z: 5.45 } as const;

export interface StreetResult {
  group: THREE.Group;
  /** Materials whose normal map scrolls with time. */
  rippleMaps: THREE.Texture[];
}

/** Water surface between x0 and x1 inside the channel, rising linearly from y0 to y1. */
function channelWater(d: Disposables, material: THREE.Material, x0: number, x1: number, y0: number, y1: number): THREE.Mesh {
  const geometry = track(d, new THREE.BufferGeometry());
  const z0 = CHANNEL_Z0 + 0.03;
  const z1 = CHANNEL_Z1 - 0.03;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z0, x1, y1, z0, x1, y1, z1, x0, y0, z1], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, (x1 - x0) / 1.5, 0, (x1 - x0) / 1.5, 0.5, 0, 0.5], 2));
  geometry.setIndex([0, 3, 2, 0, 2, 1]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Closed blob outline in the XZ plane, deterministic. */
function blobShape(cx: number, cz: number, rx: number, rz: number, seed: number): THREE.Shape {
  const rng = createRng(seed);
  const shape = new THREE.Shape();
  const n = 28;
  const wobble = Array.from({ length: n }, () => rng.range(0.78, 1.15));
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const w = ((wobble[i] ?? 1) + (wobble[(i + 1) % n] ?? 1) + (wobble[(i + n - 1) % n] ?? 1)) / 3;
    const x = cx + Math.cos(a) * rx * w;
    const z = cz + Math.sin(a) * rz * w;
    // Shape y is -z so that rotateX(-PI/2) lands it on the right side of the street, facing up.
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  shape.closePath();
  return shape;
}

export function buildStreet(d: Disposables): StreetResult {
  const group = new THREE.Group();
  const length = X_MAX - X_MIN;

  const asphalt = asphaltTexture();
  const concrete = concreteTexture();
  const paving = pavingTexture();
  const grass = grassTexture();
  const ripple = rippleNormalTexture();

  // Materials
  const asphaltMat = standard(d, { map: asphalt, roughness: 0.93, metalness: 0 });
  const concreteMat = standard(d, { map: concrete, roughness: 0.9 });
  const kerbMat = standard(d, { map: concrete, roughness: 0.88, color: 0xe6e3da });
  const innerMat = standard(d, { map: concrete, roughness: 0.95, color: 0x77746a });
  const pavingMat = standard(d, { map: paving, roughness: 0.88 });
  const grassMat = standard(d, { map: grass, roughness: 1 });
  const lineMat = standard(d, { color: 0xe4e2d8, roughness: 0.8 });

  // Ground under everything, so no gap shows the background.
  group.add(flatPlane(d, grassMat, X_MIN - 60, X_MAX + 60, -140, 140, -0.04, 6));

  // Road
  const road = flatPlane(d, asphaltMat, X_MIN, X_MAX, ROAD_Z0, ROAD_Z1, 0, 6);
  group.add(road);
  const dashMat = standard(d, { map: dashTexture(), transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const dashes = flatPlane(d, dashMat, X_MIN, X_MAX, -0.5, -0.36, 0.004, 6);
  dashes.receiveShadow = true;
  group.add(dashes);
  const dashUv = (dashes.geometry as THREE.PlaneGeometry).getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < dashUv.count; i += 1) dashUv.setY(i, i < 2 ? 1 : 0);
  group.add(flatPlane(d, lineMat, X_MIN, X_MAX, 3.2, 3.3, 0.004, 4));
  group.add(flatPlane(d, lineMat, X_MIN, X_MAX, -3.95, -3.85, 0.004, 4));

  // Zebra crossing, worn
  const zebraGeo = track(d, new THREE.PlaneGeometry(ROAD_Z1 - ROAD_Z0 - 0.5, 4.6));
  zebraGeo.rotateX(-Math.PI / 2);
  zebraGeo.rotateY(Math.PI / 2);
  const zebraMat = standard(d, { map: zebraTexture(), transparent: true, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const zebra = new THREE.Mesh(zebraGeo, zebraMat);
  zebra.position.set(47, 0.006, (ROAD_Z0 + ROAD_Z1) / 2);
  zebra.receiveShadow = true;
  group.add(zebra);

  // Kerbs (road side of the drain, and the far side)
  // The +z face of the road-side kerb is the inside of the drain: darker, grimy concrete.
  const kerbWithInner = [kerbMat, kerbMat, kerbMat, kerbMat, innerMat, kerbMat];
  group.add(boxMesh(d, kerbWithInner, [X_MIN, CHANNEL_FLOOR, ROAD_Z1], [length, 0.15 - CHANNEL_FLOOR, CHANNEL_Z0 - ROAD_Z1], { tile: 2 }));
  group.add(boxMesh(d, kerbMat, [X_MIN, 0, ROAD_Z0 - 0.22], [length, 0.15, 0.22], { tile: 2 }));

  // Drain channel: floor, far wall (walkway side), inner faces
  group.add(boxMesh(d, innerMat, [X_MIN, CHANNEL_FLOOR - 0.1, CHANNEL_Z0], [length, 0.1, CHANNEL_Z1 - CHANNEL_Z0 + 0.14], { tile: 2 }));
  const wallWithInner = [concreteMat, concreteMat, concreteMat, concreteMat, concreteMat, innerMat];
  group.add(boxMesh(d, wallWithInner, [X_MIN, CHANNEL_FLOOR, CHANNEL_Z1], [length, WALKWAY_Y - CHANNEL_FLOOR, WALKWAY_Z0 - CHANNEL_Z1], { tile: 2 }));

  // Walkway
  group.add(flatPlane(d, pavingMat, X_MIN, X_MAX, WALKWAY_Z0, WALKWAY_Z1, WALKWAY_Y, 2));
  // Far-side walkway
  group.add(flatPlane(d, pavingMat, X_MIN, X_MAX, -9.2, ROAD_Z0 - 0.22, WALKWAY_Y, 2));
  group.add(boxMesh(d, concreteMat, [X_MIN, 0, -9.4], [length, WALKWAY_Y, 5.2 - 0.22], { cast: false, tile: 2 }));
  // Tactile paving along the bus stop kerb edge
  const tactileMat = standard(d, { map: tactileTexture(), roughness: 0.7 });
  group.add(flatPlane(d, tactileMat, 11.5, 20.5, 4.75, 5.3, WALKWAY_Y + 0.002, 0.6));

  // Raised grass bank behind the wall, and the low wall itself
  group.add(flatPlane(d, grassMat, X_MIN, X_MAX, WALKWAY_Z1 + 0.25, 60, 0.18, 4));
  group.add(boxMesh(d, concreteMat, [X_MIN, WALKWAY_Y, WALKWAY_Z1], [length, 0.78, 0.25], { tile: 2 }));
  group.add(boxMesh(d, kerbMat, [X_MIN, WALKWAY_Y + 0.78, WALKWAY_Z1 - 0.03], [length, 0.07, 0.31], { tile: 2 }));

  // Water
  const waterBase: THREE.MeshPhysicalMaterialParameters = {
    color: 0x4d4a30,
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
    normalMap: ripple,
    normalScale: new THREE.Vector2(0.35, 0.35),
    envMapIntensity: 1.6,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
  };
  const waterMat = physical(d, waterBase);
  const murk = physical(d, { ...waterBase, color: 0x39361f, opacity: 0.94 });
  group.add(channelWater(d, waterMat, X_MIN, 14, -0.34, -0.34));
  group.add(channelWater(d, murk, 14, CLOG_X0, -0.34, WALKWAY_Y + 0.004));
  group.add(channelWater(d, murk, CLOG_X0, CLOG_X1, WALKWAY_Y + 0.004, WALKWAY_Y + 0.004));
  group.add(channelWater(d, waterMat, CLOG_X1, CLOG_X1 + 0.01, WALKWAY_Y + 0.004, -0.4));
  group.add(channelWater(d, waterMat, CLOG_X1 + 0.01, X_MAX, -0.4, -0.4));

  // Standing water spilling onto the walkway
  const puddleGeo = track(d, new THREE.ShapeGeometry(blobShape(PUDDLE.x, PUDDLE.z, 1.9, 0.95, 7)));
  puddleGeo.rotateX(-Math.PI / 2);
  const puddleMat = physical(d, { ...waterBase, color: 0x45422a, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -4 });
  const puddle = new THREE.Mesh(puddleGeo, puddleMat);
  puddle.position.y = WALKWAY_Y + 0.006;
  puddle.receiveShadow = true;
  puddle.renderOrder = 2;
  group.add(puddle);
  // thin tongue where the water first crests the wall
  const lipGeo = track(d, new THREE.ShapeGeometry(blobShape(30.4, 4.55, 1.55, 0.2, 13)));
  lipGeo.rotateX(-Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, puddleMat);
  lip.position.y = WALKWAY_Y + 0.008;
  lip.renderOrder = 3;
  group.add(lip);

  // Wet, grimy halo on the paving under and around the puddle
  const stainGeo = track(d, new THREE.PlaneGeometry(7.5, 4.6));
  stainGeo.rotateX(-Math.PI / 2);
  const stainMat = standard(d, { map: stainTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const stain = new THREE.Mesh(stainGeo, stainMat);
  stain.position.set(PUDDLE.x + 0.2, WALKWAY_Y + 0.003, PUDDLE.z + 0.3);
  stain.receiveShadow = true;
  group.add(stain);

  return { group, rippleMaps: [ripple] };
}

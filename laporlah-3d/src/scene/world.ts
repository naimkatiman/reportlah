import * as THREE from 'three';
import { buildClog } from './litter';
import { buildBuildings, buildBusStop, buildCars, buildRailing, buildStreetFurniture, buildTrees } from './props';
import { HAZE_SRGB, SUN_DIRECTION, createSky } from './sky';
import type { Sky } from './sky';
import { buildStreet } from './street';
import { createDisposables, disposeAll } from './util';

export interface World {
  scene: THREE.Scene;
  sky: Sky;
  /** Advance the animated parts (water ripples, clouds) to `seconds`. */
  update(seconds: number): void;
  dispose(): void;
}

const SHADOW_CENTER = new THREE.Vector3(28, 0, 0);

export function buildWorld(renderer: THREE.WebGLRenderer): World {
  const d = createDisposables();
  const scene = new THREE.Scene();
  const haze = new THREE.Color().setRGB(HAZE_SRGB[0], HAZE_SRGB[1], HAZE_SRGB[2], THREE.SRGBColorSpace);
  scene.background = haze;
  scene.fog = new THREE.FogExp2(haze, 0.0062);

  // Sky, also baked once into an environment map so water, glass and metal reflect it.
  const sky = createSky();
  sky.mesh.scale.setScalar(400);
  const envScene = new THREE.Scene();
  const envSky = createSky();
  envSky.mesh.scale.setScalar(50);
  envScene.add(envSky.mesh);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, 0, 0.1, 200);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.55;
  envSky.dispose();
  pmrem.dispose();
  scene.add(sky.mesh);

  // Light: hemisphere fill plus one warm sun with a static shadow map covering the whole walk.
  scene.add(new THREE.HemisphereLight(0xcfe3f7, 0x6d6450, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.1);
  sun.position.copy(SHADOW_CENTER).addScaledVector(SUN_DIRECTION, 90);
  sun.target.position.copy(SHADOW_CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -56;
  cam.right = 56;
  cam.top = 40;
  cam.bottom = -40;
  cam.near = 5;
  cam.far = 220;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);

  const street = buildStreet(d);
  scene.add(street.group, buildClog(d), buildBusStop(d), buildStreetFurniture(d), buildRailing(d), buildTrees(d), buildCars(d), buildBuildings(d));

  // Static geometry: freeze matrices and render the shadow map once.
  scene.traverse((o) => {
    if (o !== sky.mesh) {
      o.updateMatrix();
      o.matrixAutoUpdate = false;
    }
  });
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  return {
    scene,
    sky,
    update(seconds) {
      sky.uniforms.uTime.value = seconds;
      for (const map of street.rippleMaps) map.offset.set(seconds * 0.012, seconds * 0.007);
    },
    dispose() {
      envTarget.dispose();
      sky.dispose();
      disposeAll(d);
    },
  };
}

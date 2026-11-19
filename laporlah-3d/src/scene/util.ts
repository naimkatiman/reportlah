import * as THREE from 'three';

export interface Disposables {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

export function createDisposables(): Disposables {
  return { geometries: [], materials: [], textures: [] };
}

export function disposeAll(d: Disposables): void {
  d.geometries.forEach((g) => g.dispose());
  d.materials.forEach((m) => m.dispose());
  d.textures.forEach((t) => t.dispose());
}

export interface MeshOptions {
  cast?: boolean;
  receive?: boolean;
  /** Metres covered by one texture tile. UVs are scaled to world size so long boxes do not stretch the texture. */
  tile?: number;
}

/** Axis-aligned box from a min corner and a size, in world metres. */
export function boxMesh(
  d: Disposables,
  material: THREE.Material | THREE.Material[],
  min: readonly [number, number, number],
  size: readonly [number, number, number],
  opts: MeshOptions = {},
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  d.geometries.push(geometry);
  if (opts.tile) {
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
    // Face order: +x, -x, +y, -y, +z, -z. Each face has 4 vertices.
    const dims: ReadonlyArray<readonly [number, number]> = [
      [size[2], size[1]],
      [size[2], size[1]],
      [size[0], size[2]],
      [size[0], size[2]],
      [size[0], size[1]],
      [size[0], size[1]],
    ];
    for (let i = 0; i < uv.count; i += 1) {
      const [du = 1, dv = 1] = dims[Math.floor(i / 4)] ?? [];
      uv.setXY(i, (uv.getX(i) * du) / opts.tile, (uv.getY(i) * dv) / opts.tile);
    }
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2);
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  return mesh;
}

/** Horizontal rectangle lying at height y, spanning x0..x1 and z0..z1. UVs run in metres divided by `metresPerTile`. */
export function flatPlane(
  d: Disposables,
  material: THREE.Material,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  metresPerTile: number,
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, ((uv.getX(i) - 0.5) * (x1 - x0)) / metresPerTile, ((uv.getY(i) - 0.5) * (z1 - z0)) / metresPerTile);
  }
  d.geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  mesh.receiveShadow = true;
  return mesh;
}

/** Use a texture whose UVs are already in tile units (set by flatPlane), with no extra repeat. */
export function standard(d: Disposables, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial(params);
  d.materials.push(material);
  if (params.map) d.textures.push(params.map);
  return material;
}

export function physical(d: Disposables, params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial(params);
  d.materials.push(material);
  if (params.normalMap) d.textures.push(params.normalMap);
  return material;
}

export function track<T extends THREE.BufferGeometry>(d: Disposables, geometry: T): T {
  d.geometries.push(geometry);
  return geometry;
}

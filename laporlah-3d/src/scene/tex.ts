import * as THREE from 'three';
import type { Field } from './noise';

/** Colour texture plus the optional maps that go with it. */
export interface Surface {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}

export interface TexOptions {
  srgb?: boolean;
  /** Wrap in both directions. Defaults to true. */
  repeat?: boolean;
  aniso?: number;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) throw new Error('2D canvas is not available');
  return [c, g];
}

function finish<T extends THREE.Texture>(tex: T, opts: TexOptions): T {
  const wrap = opts.repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = opts.aniso ?? 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function canvasTexture(canvas: HTMLCanvasElement, opts: TexOptions = {}): THREE.CanvasTexture {
  return finish(new THREE.CanvasTexture(canvas), opts);
}

/** Straight-alpha RGBA bytes, row 0 at the top like a canvas. */
export function dataTexture(data: Uint8Array | Uint8ClampedArray, w: number, h: number, opts: TexOptions = {}): THREE.DataTexture {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const tex = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.flipY = true;
  return finish(tex, opts);
}

/** Draw with the 2D API, then edit the pixels in place. */
export function pixels(g: CanvasRenderingContext2D, w: number, h: number, edit: (data: Uint8ClampedArray) => void): void {
  const img = g.getImageData(0, 0, w, h);
  edit(img.data);
  g.putImageData(img, 0, 0);
}

/** Read a canvas drawn in greyscale into a 0..1 field (red channel). */
export function fieldFromCanvas(g: CanvasRenderingContext2D, size: number): Field {
  const data = g.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i += 1) out[i] = data[i * 4]! / 255;
  return out;
}

/** Tangent-space normal map from a tileable height field. */
export function normalFromHeight(height: Field, size: number, strength: number, opts: TexOptions = {}): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const mask = size - 1;
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1) & mask) * size;
    const down = ((y + 1) & mask) * size;
    const row = y * size;
    for (let x = 0; x < size; x += 1) {
      const dx = (height[row + ((x + 1) & mask)]! - height[row + ((x - 1) & mask)]!) * strength;
      const dy = (height[down + x]! - height[up + x]!) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (row + x) * 4;
      data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      // Canvas rows run downward while v runs upward, so the y slope flips sign.
      data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return dataTexture(data, size, size, { ...opts, srgb: false });
}

/**
 * Canvas RGBA to a straight-alpha data texture. Fully transparent texels take `fill` as their
 * colour so mip levels of alpha-tested cards do not pick up a black fringe.
 */
export function cutoutTexture(g: CanvasRenderingContext2D, w: number, h: number, fill: readonly [number, number, number], opts: TexOptions = {}): THREE.DataTexture {
  const src = g.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3]!;
    if (a < 8) {
      out[i] = fill[0];
      out[i + 1] = fill[1];
      out[i + 2] = fill[2];
      out[i + 3] = 0;
    } else {
      const k = a / 255;
      // Blend toward the fill colour on soft edges for the same reason.
      out[i] = src[i]! * k + fill[0] * (1 - k);
      out[i + 1] = src[i + 1]! * k + fill[1] * (1 - k);
      out[i + 2] = src[i + 2]! * k + fill[2] * (1 - k);
      out[i + 3] = a;
    }
  }
  return dataTexture(out, w, h, opts);
}

export function rgb(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

export function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a})`;
}

/** Draw `fn` at every wrapped offset so shapes crossing an edge reappear on the other side. */
export function wrapDraw(w: number, h: number, wrapX: boolean, wrapY: boolean, fn: (ox: number, oy: number) => void): void {
  const xs = wrapX ? [-w, 0, w] : [0];
  const ys = wrapY ? [-h, 0, h] : [0];
  for (const ox of xs) for (const oy of ys) fn(ox, oy);
}

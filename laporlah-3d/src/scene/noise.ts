import { createRng } from './rng';

/** A square scalar field, row-major, `size` by `size`. */
export type Field = Float32Array;

const fieldCache = new Map<string, Field>();

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Tileable fractal value noise in 0..1. `cells` is the lattice period of the first octave, so
 * the result repeats exactly at the texture edge. Cached: several textures share the same fields.
 */
export function fbmField(size: number, cells: number, octaves: number, seed: number, gain = 0.5): Field {
  const key = `${size}:${cells}:${octaves}:${seed}:${gain}`;
  const cached = fieldCache.get(key);
  if (cached) return cached;
  const out = new Float32Array(size * size);
  const rng = createRng(seed);
  let amplitude = 1;
  let total = 0;
  let period = cells;
  for (let o = 0; o < octaves && period <= size; o += 1) {
    const lattice = new Float32Array(period * period);
    for (let i = 0; i < lattice.length; i += 1) lattice[i] = rng.next();
    const scale = period / size;
    const xi0 = new Int32Array(size);
    const xi1 = new Int32Array(size);
    const xf = new Float32Array(size);
    for (let x = 0; x < size; x += 1) {
      const fx = x * scale;
      const ix = Math.floor(fx);
      xi0[x] = ix % period;
      xi1[x] = (ix + 1) % period;
      xf[x] = smooth(fx - ix);
    }
    for (let y = 0; y < size; y += 1) {
      const fy = y * scale;
      const iy = Math.floor(fy);
      const ty = smooth(fy - iy);
      const r0 = (iy % period) * period;
      const r1 = ((iy + 1) % period) * period;
      const row = y * size;
      for (let x = 0; x < size; x += 1) {
        const a = xi0[x]!;
        const b = xi1[x]!;
        const t = xf[x]!;
        const top = lattice[r0 + a]! + (lattice[r0 + b]! - lattice[r0 + a]!) * t;
        const bottom = lattice[r1 + a]! + (lattice[r1 + b]! - lattice[r1 + a]!) * t;
        out[row + x] = out[row + x]! + (top + (bottom - top) * ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= gain;
    period *= 2;
  }
  for (let i = 0; i < out.length; i += 1) out[i] = out[i]! / total;
  fieldCache.set(key, out);
  return out;
}

/** Per-pixel white noise in 0..1. */
export function whiteField(size: number, seed: number): Field {
  const key = `w:${size}:${seed}`;
  const cached = fieldCache.get(key);
  if (cached) return cached;
  const out = new Float32Array(size * size);
  const rng = createRng(seed);
  for (let i = 0; i < out.length; i += 1) out[i] = rng.next();
  fieldCache.set(key, out);
  return out;
}

/** Drop the cached fields once the world has been built. */
export function clearFieldCache(): void {
  fieldCache.clear();
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

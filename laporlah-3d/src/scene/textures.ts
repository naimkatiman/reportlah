import * as THREE from 'three';
import { createRng } from './rng';
import type { Rng } from './rng';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas is not available');
  return [c, g];
}

interface TexOptions {
  repeat?: [number, number];
  srgb?: boolean;
  aniso?: number;
}

function texture(w: number, h: number, draw: Draw, opts: TexOptions = {}): THREE.CanvasTexture {
  const [c, g] = canvas(w, h);
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = opts.aniso ?? 8;
  tex.needsUpdate = true;
  return tex;
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${a})`;
}

/** Scatter fine speckle that wraps at the edges so the texture tiles. */
function speckle(g: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number, lMin: number, lMax: number, sat: number, hue: number, size = 1.6): void {
  for (let i = 0; i < count; i += 1) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const s = rng.range(0.5, size);
    g.fillStyle = hsl(hue + rng.range(-6, 6), sat, rng.range(lMin, lMax), rng.range(0.25, 0.9));
    for (const ox of [0, x > w - s ? -w : 0]) {
      for (const oy of [0, y > h - s ? -h : 0]) g.fillRect(x + ox, y + oy, s, s);
    }
  }
}

function blotches(g: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number, color: (r: Rng) => string, rMin: number, rMax: number): void {
  for (let i = 0; i < count; i += 1) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const r = rng.range(rMin, rMax);
    for (const ox of [-w, 0, w]) {
      for (const oy of [-h, 0, h]) {
        const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        grad.addColorStop(0, color(rng));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
}

/** Road asphalt, tiles every 6 m. */
export function asphaltTexture(): THREE.CanvasTexture {
  const rng = createRng(11);
  return texture(
    1024,
    1024,
    (g, w, h) => {
      g.fillStyle = hsl(215, 5, 24);
      g.fillRect(0, 0, w, h);
      blotches(g, w, h, rng, 60, () => hsl(215, 4, rng.range(18, 30), 0.35), 40, 160);
      // wheel tracks, wrapping horizontally
      for (const y of [h * 0.3, h * 0.72]) {
        const grad = g.createLinearGradient(0, y - 60, 0, y + 60);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(10,12,16,0.28)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, y - 60, w, 120);
      }
      speckle(g, w, h, rng, 14000, 18, 62, 4, 215, 2.2);
      speckle(g, w, h, rng, 2400, 55, 78, 3, 215, 1.4);
      // hairline cracks
      g.strokeStyle = 'rgba(8,9,12,0.55)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 7; i += 1) {
        let x = rng.range(0, w);
        let y = rng.range(0, h);
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 9; k += 1) {
          x += rng.range(-22, 22);
          y += rng.range(6, 26);
          g.lineTo(x, y);
        }
        g.stroke();
      }
    },
    { repeat: [1, 1] },
  );
}

/** Weathered concrete for kerbs, the drain, walls. Tiles every 2 m. */
export function concreteTexture(tint = 0): THREE.CanvasTexture {
  const rng = createRng(21 + tint);
  return texture(512, 512, (g, w, h) => {
    g.fillStyle = hsl(40 + tint, 5, 62);
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 50, () => hsl(40, 6, rng.range(48, 70), 0.4), 20, 110);
    blotches(g, w, h, rng, 14, () => hsl(95, 22, 30, 0.22), 14, 60);
    speckle(g, w, h, rng, 5000, 36, 80, 5, 40, 1.8);
    // pores
    for (let i = 0; i < 140; i += 1) {
      g.fillStyle = 'rgba(40,40,36,0.45)';
      g.beginPath();
      g.arc(rng.range(0, w), rng.range(0, h), rng.range(0.6, 2.1), 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Pedestrian walkway: 0.5 m concrete tiles, tiles every 2 m. */
export function pavingTexture(): THREE.CanvasTexture {
  const rng = createRng(31);
  return texture(1024, 1024, (g, w, h) => {
    const cells = 4;
    const size = w / cells;
    for (let cx = 0; cx < cells; cx += 1) {
      for (let cy = 0; cy < cells; cy += 1) {
        g.fillStyle = hsl(32 + rng.range(-5, 5), rng.range(4, 9), rng.range(56, 66));
        g.fillRect(cx * size, cy * size, size, size);
        const grad = g.createLinearGradient(cx * size, cy * size, (cx + 1) * size, (cy + 1) * size);
        grad.addColorStop(0, 'rgba(255,255,255,0.07)');
        grad.addColorStop(1, 'rgba(0,0,0,0.08)');
        g.fillStyle = grad;
        g.fillRect(cx * size, cy * size, size, size);
      }
    }
    blotches(g, w, h, rng, 40, () => hsl(35, 8, rng.range(34, 50), 0.28), 30, 140);
    blotches(g, w, h, rng, 12, () => hsl(100, 25, 28, 0.2), 20, 70);
    speckle(g, w, h, rng, 9000, 34, 78, 5, 35, 1.8);
    // joints
    g.strokeStyle = 'rgba(40,36,30,0.75)';
    g.lineWidth = 4;
    for (let i = 0; i <= cells; i += 1) {
      g.beginPath();
      g.moveTo(i * size, 0);
      g.lineTo(i * size, h);
      g.moveTo(0, i * size);
      g.lineTo(w, i * size);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1.5;
    for (let i = 0; i <= cells; i += 1) {
      g.beginPath();
      g.moveTo(i * size + 3, 0);
      g.lineTo(i * size + 3, h);
      g.moveTo(0, i * size + 3);
      g.lineTo(w, i * size + 3);
      g.stroke();
    }
  });
}

export function grassTexture(): THREE.CanvasTexture {
  const rng = createRng(41);
  return texture(512, 512, (g, w, h) => {
    g.fillStyle = hsl(98, 42, 28);
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 90, () => hsl(rng.range(80, 110), 45, rng.range(20, 40), 0.5), 12, 60);
    speckle(g, w, h, rng, 9000, 16, 48, 55, 100, 2.4);
  });
}

/** Dashed centre line on a transparent strip. One tile is 6 m: 3 m paint, 3 m gap. */
export function dashTexture(): THREE.CanvasTexture {
  const rng = createRng(51);
  return texture(
    512,
    64,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(236,236,228,0.92)';
      g.fillRect(0, 12, w * 0.5, h - 24);
      speckle(g, w, h, rng, 700, 10, 40, 0, 0, 2);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 80; i += 1) {
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(rng.range(0, w * 0.5), rng.range(12, h - 12), rng.range(2, 8), rng.range(1, 3));
      }
      g.globalCompositeOperation = 'source-over';
    },
    { srgb: true },
  );
}

/** Zebra crossing stripes, deliberately worn. Whole crossing in one texture, 9 m wide. */
export function zebraTexture(): THREE.CanvasTexture {
  const rng = createRng(61);
  return texture(
    512,
    512,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const stripes = 9;
      const sw = h / (stripes * 2);
      for (let i = 0; i < stripes; i += 1) {
        g.fillStyle = 'rgba(232,232,224,0.78)';
        g.fillRect(0, i * 2 * sw + sw * 0.15, w, sw * 0.7);
      }
      // wear: knock out blotches
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 260; i += 1) {
        g.fillStyle = `rgba(0,0,0,${rng.range(0.15, 0.7)})`;
        const s = rng.range(4, 26);
        g.fillRect(rng.range(0, w), rng.range(0, h), s, s * rng.range(0.3, 1));
      }
      g.globalCompositeOperation = 'source-over';
    },
    { aniso: 8 },
  );
}

/** Yellow tactile paving strip. */
export function tactileTexture(): THREE.CanvasTexture {
  const rng = createRng(71);
  return texture(256, 256, (g, w, h) => {
    g.fillStyle = hsl(46, 82, 52);
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, rng, 20, () => hsl(40, 40, 30, 0.25), 20, 70);
    const n = 8;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const x = (i + 0.5) * (w / n);
        const y = (j + 0.5) * (h / n);
        const grad = g.createRadialGradient(x - 2, y - 2, 1, x, y, 11);
        grad.addColorStop(0, hsl(48, 90, 70));
        grad.addColorStop(1, hsl(42, 80, 40));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y, 10, 0, Math.PI * 2);
        g.fill();
      }
    }
    speckle(g, w, h, rng, 1200, 20, 60, 20, 40, 1.6);
  });
}

/** Radial wet/grime stain used under the puddle. Alpha only. */
export function stainTexture(): THREE.CanvasTexture {
  const rng = createRng(81);
  return texture(
    512,
    512,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 26; i += 1) {
        const x = w / 2 + rng.range(-110, 110);
        const y = h / 2 + rng.range(-90, 90);
        const r = rng.range(60, 150);
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(30,26,18,0.20)');
        grad.addColorStop(1, 'rgba(30,26,18,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
    },
    { srgb: true },
  );
}

/** Leaf sprite atlas: 4 leaf shapes in dry browns, olive and green. Alpha-tested. */
export function leafTexture(): THREE.CanvasTexture {
  const rng = createRng(91);
  return texture(
    256,
    256,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const palette = [
        [28, 55, 30],
        [34, 60, 24],
        [48, 50, 30],
        [90, 40, 24],
      ];
      for (let i = 0; i < 4; i += 1) {
        const cx = (i % 2) * (w / 2) + w / 4;
        const cy = Math.floor(i / 2) * (h / 2) + h / 4;
        const [hh = 30, ss = 50, ll = 30] = palette[i] ?? [];
        g.save();
        g.translate(cx, cy);
        g.rotate(rng.range(-0.3, 0.3));
        g.fillStyle = hsl(hh, ss, ll);
        g.beginPath();
        g.moveTo(-52, 0);
        g.bezierCurveTo(-24, -34, 24, -34, 54, 0);
        g.bezierCurveTo(24, 30, -24, 30, -52, 0);
        g.fill();
        g.strokeStyle = hsl(hh, ss, ll - 12);
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-56, 0);
        g.lineTo(54, 0);
        g.stroke();
        g.lineWidth = 1;
        for (let k = -3; k <= 3; k += 1) {
          if (k === 0) continue;
          g.beginPath();
          g.moveTo(k * 12, 0);
          g.lineTo(k * 12 + 10, k > 0 ? 22 : -22);
          g.stroke();
        }
        g.restore();
      }
    },
    { srgb: true },
  );
}

/** Height field turned into a tangent-space normal map. Tiles seamlessly. */
export function rippleNormalTexture(): THREE.CanvasTexture {
  const size = 256;
  const height = new Float32Array(size * size);
  const rng = createRng(101);
  const waves = Array.from({ length: 9 }, () => ({
    fx: rng.int(1, 6),
    fy: rng.int(1, 6),
    phase: rng.range(0, Math.PI * 2),
    amp: rng.range(0.4, 1),
  }));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let v = 0;
      for (const wv of waves) v += wv.amp * Math.sin(((x * wv.fx + y * wv.fy) / size) * Math.PI * 2 + wv.phase);
      height[y * size + x] = v;
    }
  }
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const at = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface FacadeOptions {
  seed: number;
  hue: number;
  sat: number;
  light: number;
  floors: number;
  shopfront: boolean;
}

/** Shop-lot or flat facade: shutter or glass shopfront below, grilled windows above. */
export function facadeTexture(o: FacadeOptions): THREE.CanvasTexture {
  const rng = createRng(o.seed);
  const w = 256;
  const h = 128 * o.floors;
  return texture(
    w,
    h,
    (g) => {
      g.fillStyle = hsl(o.hue, o.sat, o.light);
      g.fillRect(0, 0, w, h);
      blotches(g, w, h, rng, 18, () => hsl(o.hue, o.sat, o.light - 14, 0.28), 20, 80);
      // rain streaks
      for (let i = 0; i < 40; i += 1) {
        const x = rng.range(0, w);
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(30,30,28,0)');
        grad.addColorStop(1, 'rgba(30,30,28,0.12)');
        g.fillStyle = grad;
        g.fillRect(x, 0, rng.range(1, 3), h);
      }
      for (let f = 0; f < o.floors; f += 1) {
        const y0 = h - (f + 1) * 128;
        if (f === 0 && o.shopfront) {
          g.fillStyle = hsl(210, 8, 38);
          g.fillRect(16, y0 + 26, w - 32, 96);
          g.strokeStyle = 'rgba(0,0,0,0.35)';
          g.lineWidth = 1;
          for (let y = y0 + 30; y < y0 + 122; y += 5) {
            g.beginPath();
            g.moveTo(16, y);
            g.lineTo(w - 16, y);
            g.stroke();
          }
          g.fillStyle = hsl(o.hue + 150, 45, 40);
          g.fillRect(8, y0 + 8, w - 16, 20);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(14, y0 + 14, w - 80, 7);
        } else {
          for (const wx of [30, 148]) {
            g.fillStyle = hsl(200, 20, 24);
            g.fillRect(wx, y0 + 28, 78, 72);
            g.fillStyle = 'rgba(160,200,225,0.55)';
            g.fillRect(wx + 4, y0 + 32, 70, 64);
            g.strokeStyle = 'rgba(25,25,25,0.8)';
            g.lineWidth = 2;
            for (let k = 1; k < 5; k += 1) {
              g.beginPath();
              g.moveTo(wx + k * 15.6, y0 + 28);
              g.lineTo(wx + k * 15.6, y0 + 100);
              g.stroke();
            }
            g.beginPath();
            g.moveTo(wx, y0 + 64);
            g.lineTo(wx + 78, y0 + 64);
            g.stroke();
          }
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.fillRect(0, y0 + 118, w, 6);
        }
      }
    },
    { aniso: 4 },
  );
}

/** Distant tower or flat block: a grid of lit and dark windows. */
export function towerTexture(seed: number, hue: number): THREE.CanvasTexture {
  const rng = createRng(seed);
  return texture(
    128,
    512,
    (g, w, h) => {
      g.fillStyle = hsl(hue, 8, 74);
      g.fillRect(0, 0, w, h);
      const cols = 6;
      const rows = 30;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          g.fillStyle = rng.next() > 0.82 ? hsl(45, 30, 70) : hsl(205, 22, rng.range(34, 52));
          g.fillRect(c * (w / cols) + 3, r * (h / rows) + 3, w / cols - 6, h / rows - 6);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.08)';
      for (let c = 0; c <= cols; c += 3) g.fillRect(c * (w / cols) - 1, 0, 2, h);
    },
    { aniso: 2 },
  );
}

/** Blue-and-white sign canvas: bus stop plate or street name plate. */
export function signTexture(kind: 'bus' | 'street'): THREE.CanvasTexture {
  return texture(
    kind === 'bus' ? 256 : 512,
    kind === 'bus' ? 256 : 128,
    (g, w, h) => {
      if (kind === 'bus') {
        g.fillStyle = hsl(214, 78, 36);
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        g.beginPath();
        g.roundRect(34, 46, 188, 120, 22);
        g.fill();
        g.fillStyle = hsl(214, 78, 36);
        g.beginPath();
        g.roundRect(48, 60, 160, 54, 10);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(76, 150, 12, 0, Math.PI * 2);
        g.arc(180, 150, 12, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.font = '600 30px "Segoe UI", Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('BUS STOP', w / 2, 226);
      } else {
        g.fillStyle = hsl(214, 78, 30);
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#fff';
        g.lineWidth = 5;
        g.strokeRect(8, 8, w - 16, h - 16);
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.font = '600 46px "Segoe UI", Arial, sans-serif';
        g.fillText('Jalan Seri Kerinchi', w / 2, 62);
        g.font = '500 26px "Segoe UI", Arial, sans-serif';
        g.fillText('Taman Seri Kerinchi', w / 2, 100);
      }
    },
    { repeat: [1, 1] },
  );
}

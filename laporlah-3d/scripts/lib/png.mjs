import zlib from 'node:zlib';

/** Minimal PNG decoder: 8-bit, non-interlaced, grey / grey+alpha / RGB / RGBA. Enough for Chrome screenshots and ffmpeg output. */
export function decodePng(buffer) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i += 1) if (buffer[i] !== signature[i]) throw new Error('Not a PNG file');
  let offset = 8;
  let header = null;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!header) throw new Error('PNG has no IHDR');
  if (header.bitDepth !== 8 || header.interlace !== 0) throw new Error(`Unsupported PNG (bit depth ${header.bitDepth}, interlace ${header.interlace})`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${header.colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const pixels = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? pixels[dst + x - channels] : 0;
      const b = y > 0 ? pixels[dst - stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[dst - stride + x - channels] : 0;
      let value = raw[src + x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[dst + x] = value & 255;
    }
  }
  return { width: header.width, height: header.height, channels, pixels };
}

/** Luma standard deviation and distinct coarse colours inside a rectangle (defaults to the whole image). */
export function regionStats(png, rect = { x: 0, y: 0, width: png.width, height: png.height }) {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(png.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(png.height, Math.ceil(rect.y + rect.height));
  if (x1 <= x0 || y1 <= y0) throw new Error('Empty region');
  const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 40000)));
  const colors = new Set();
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * png.width + x) * png.channels;
      const r = png.pixels[i];
      const g = png.channels >= 3 ? png.pixels[i + 1] : r;
      const b = png.channels >= 3 ? png.pixels[i + 2] : r;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += luma;
      sumSq += luma * luma;
      n += 1;
      colors.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
    }
  }
  const mean = sum / n;
  return { stdev: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), distinctColors: colors.size, samples: n };
}

/** A picture is blank when it is nearly one flat colour. Thresholds sit far below any real render and far above compression noise. */
export function isBlank(stats) {
  return stats.stdev < 2.5 || stats.distinctColors < 12;
}

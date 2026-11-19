// Type-checks and builds for production. Prints BUILD_AND_TYPES_OK only after both pass.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bin } from './lib/paths.mjs';
import { fail, runNode } from './lib/run.mjs';

if (runNode([bin.tsc, '--noEmit']) !== 0) fail('tsc --noEmit reported errors');

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'laporlah-build-'));
try {
  if (runNode([bin.vite, 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn']) !== 0) fail('vite build failed');
  const index = path.join(out, 'index.html');
  if (!fs.existsSync(index)) fail('build produced no index.html');
  const html = fs.readFileSync(index, 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => m[1]);
  if (assets.length === 0) fail('index.html references no built assets');
  for (const asset of assets) {
    if (!fs.existsSync(path.join(out, asset.replace(/^\.?\//, '')))) fail(`missing built asset ${asset}`);
  }
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
console.log('BUILD_AND_TYPES_OK');

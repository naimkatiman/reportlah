// Renders every shot preset at desktop and phone into cook/stills/rNN. With --check, also asserts every PNG is
// non-blank (including the WebGL canvas region) and that no page logged a console error. Prints STILLS_OK <count>.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VIEWPORTS, launchChrome, newContext, watchErrors } from './lib/browser.mjs';
import { ROOT } from './lib/paths.mjs';
import { decodePng, isBlank, regionStats } from './lib/png.mjs';
import { startApp } from './lib/serve.mjs';

const SHOTS = ['walk-street', 'walk-approach', 'walk-drain', 'draft', 'merge', 'rank', 'approval', 'approved', 'type'];
const MOTIONS = ['confirm-merge', 'rank-jump', 'walk-move'];
const FRAMES = [0, 0.2, 0.4, 0.6, 0.8, 1];

const args = process.argv.slice(2);
const roundIndex = args.indexOf('--round');
const round = roundIndex >= 0 ? Number(args[roundIndex + 1]) : 0;
if (!Number.isInteger(round) || round < 0) {
  console.error('FAIL: --round needs a non-negative integer');
  process.exit(1);
}
const check = args.includes('--check');
const outDir = path.join(ROOT, 'cook', 'stills', `r${String(round).padStart(2, '0')}`);
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const written = [];
const canvasRects = new Map();

async function render(context, vp, query, file) {
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors, `${query} ${vp.name}`);
  await page.goto(`${app.url}?${query}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__SHOT_READY === true, null, { timeout: 60000 });
  } catch {
    failures.push(`${query} ${vp.name}: window.__SHOT_READY never became true`);
  }
  const canvas = page.getByTestId('walk-canvas');
  if (await canvas.count()) {
    const box = await canvas.boundingBox();
    if (box) canvasRects.set(file, { x: box.x * vp.deviceScaleFactor, y: box.y * vp.deviceScaleFactor, width: box.width * vp.deviceScaleFactor, height: box.height * vp.deviceScaleFactor });
  }
  await page.screenshot({ path: file });
  errors.forEach((e) => failures.push(e));
  await page.close();
}

function tile(frames, columns, rows, file) {
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(path.dirname(frames[0]), 'f%d.png'), '-vf', `tile=${columns}x${rows}`, '-frames:v', '1', file], { stdio: 'inherit' });
  if (result.status !== 0) failures.push(`ffmpeg tile failed for ${path.basename(file)}`);
}

const app = await startApp();
const browser = await launchChrome();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'laporlah-frames-'));
try {
  for (const vp of VIEWPORTS) {
    const context = await newContext(browser, vp);
    for (const shot of SHOTS) {
      const file = path.join(outDir, `${shot}-${vp.name}.png`);
      await render(context, vp, `shot=${shot}`, file);
      written.push(file);
    }
    for (const motion of MOTIONS) {
      const dir = fs.mkdtempSync(path.join(scratch, `${motion}-`));
      const frames = [];
      for (let i = 0; i < FRAMES.length; i += 1) {
        const frame = path.join(dir, `f${i + 1}.png`);
        await render(context, vp, `motion=${motion}&t=${FRAMES[i]}`, frame);
        frames.push(frame);
      }
      const file = path.join(outDir, `motion-${motion}-${vp.name}-strip.png`);
      if (vp.name === 'desktop') tile(frames, 6, 1, file);
      else tile(frames, 3, 2, file);
      written.push(file);
      if (check) {
        // Each frame must itself be a real render, not only the strip.
        frames.forEach((frame, i) => {
          const rect = canvasRects.get(frame);
          assertPicture(frame, `motion ${motion} ${vp.name} t=${FRAMES[i]}`, rect);
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await app.stop();
}

function assertPicture(file, label, rect) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: file missing`);
    return;
  }
  const png = decodePng(fs.readFileSync(file));
  const whole = regionStats(png);
  if (isBlank(whole)) failures.push(`${label}: blank image (stdev ${whole.stdev.toFixed(2)}, ${whole.distinctColors} colours)`);
  if (rect) {
    const canvas = regionStats(png, rect);
    if (isBlank(canvas)) failures.push(`${label}: blank WebGL canvas (stdev ${canvas.stdev.toFixed(2)}, ${canvas.distinctColors} colours)`);
  }
}

if (check) {
  for (const file of written) assertPicture(file, path.basename(file), canvasRects.get(file));
}
fs.rmSync(scratch, { recursive: true, force: true });

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Wrote ${written.length} files to ${path.relative(ROOT, outDir)}`);
if (check) console.log(`STILLS_OK ${written.length}`);

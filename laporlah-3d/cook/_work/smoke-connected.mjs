// Smoke test: serve dist under /3d/ beside a stub of Reportlah's API, the way Reportlah will serve it.
// Usage: node cook/_work/smoke-connected.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE, DESKTOP, launchChrome, newContext, watchErrors } from '../../scripts/lib/browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'cook', '_work');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const seedTexts = [
  ['c_1', '2026-11-10', 'Longkang depan perhentian bas Jalan Kerinchi tersumbat, air bertakung dah tiga hari.'],
  ['c_2', '2026-11-12', 'The drain near the Jalan Kerinchi bus stop is clogged again. Smells terrible.'],
  ['c_3', '2026-11-14', 'Parit tepi Jalan Kerinchi penuh sampah, nyamuk makin banyak.'],
  ['c_4', '2026-11-16', 'Drain blocked opposite the bus stop at Kerinchi, water overflowed onto the walkway after the rain.'],
  ['c_5', '2026-11-17', 'Longkang tersumbat kat Kerinchi tu bila nak clear? Dah seminggu.'],
];
let complaints = seedTexts.map(([id, date, text]) => ({ id, date, text, has_photo: false, channel: 'seed', tag: 'in_report', issue_key: null }));
let posts = 0;
let apiUp = true;

function view() {
  const main = complaints.filter((c) => c.tag === 'in_report');
  const hasPhoto = main.some((c) => c.has_photo);
  const latest = main[main.length - 1].date;
  const period = `10 Nov to ${Number(latest.slice(8))} Nov 2026`;
  const message = `To the local authority: ${main.length} complaints between ${period} report a clogged drain at the Jalan Kerinchi bus stop.`;
  return {
    complaints,
    issues: [],
    report: {
      report_id: 'r_1', version: posts + 1, place: 'Jalan Kerinchi bus stop', issue: 'Clogged drain', main_ids: main.map((c) => c.id),
      count: main.length, first_date: '2026-11-10', latest_date: latest, message_template: message,
      gaps: hasPhoto ? ['agency_unconfirmed'] : ['no_photo', 'agency_unconfirmed'],
      recipient: { label: 'Local authority', confirmed: false, source_url: null }, has_photo: hasPhoto,
      message, period, gap_labels: hasPhoto ? ['Responsible agency not confirmed'] : ['No photo yet', 'Responsible agency not confirmed'],
    },
    last_changed: [], last_trace: [], running: false, last_error: null,
  };
}

function json(res, body) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    if (!apiUp) { res.writeHead(404); res.end('not found'); return; }
    if (url.pathname === '/api/state' && req.method === 'GET') return json(res, view());
    if (url.pathname === '/api/run' && req.method === 'POST') return json(res, { ok: true, error: null, state: view() });
    if (url.pathname === '/api/complaints' && req.method === 'POST') {
      let raw = '';
      req.on('data', (d) => { raw += d; });
      req.on('end', () => {
        posts += 1;
        const body = JSON.parse(raw);
        if (complaints.some((c) => c.text === body.text)) return json(res, { outcome: 'duplicate', complaint_id: null, state: view(), reply: 'That complaint is already in.' });
        const id = `c_${complaints.length + 1}`;
        complaints = [...complaints, { id, date: '2026-11-19', text: body.text, has_photo: body.has_photo === true, channel: 'web', tag: 'in_report', issue_key: null }];
        return json(res, { outcome: 'joined', complaint_id: id, state: view(), reply: `Added to the report. There are now ${complaints.length} complaints.` });
      });
      return undefined;
    }
    res.writeHead(404); res.end(); return undefined;
  }
  if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Reportlah stub home</h1>'); return undefined; }
  if (!url.pathname.startsWith('/3d/')) { res.writeHead(404); res.end(); return undefined; }
  const file = path.join(DIST, url.pathname.slice(4) || 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return undefined; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
  return undefined;
});

const fail = (message) => { throw new Error(message); };

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launchChrome();
const errors = [];
try {
  for (const vp of [DESKTOP, PHONE]) {
    const context = await newContext(browser, vp);
    const page = await context.newPage();
    watchErrors(page, errors, vp.name);
    await page.goto(`${base}/3d/index.html`);
    await page.waitForSelector('[data-testid="mode-label"]', { timeout: 60000 });
    const mode = await page.textContent('[data-testid="mode-label"]');
    if (mode.trim() !== 'Live from Reportlah') fail(`${vp.name}: expected connected mode, saw "${mode}"`);
    const back = await page.getAttribute('[data-testid="back-link"]', 'href');
    if (back !== '/') fail(`${vp.name}: back link is "${back}"`);
    await page.click('[data-testid="stage-reviewer"]');
    await page.waitForTimeout(500);
    const text = await page.innerText('body');
    if (!/\b5\b/.test(text)) fail(`${vp.name}: reviewer does not show the stub count 5`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) fail(`${vp.name}: page overflows sideways by ${overflow}px`);
    await page.screenshot({ path: path.join(OUT, `connected-reviewer-${vp.name}.png`) });
    await context.close();
  }

  apiUp = false;
  const context = await newContext(browser, PHONE);
  const page = await context.newPage();
  await page.goto(`${base}/3d/index.html`);
  await page.waitForSelector('[data-testid="mode-label"]', { timeout: 60000 });
  const mode = await page.textContent('[data-testid="mode-label"]');
  if (mode.trim() !== 'Demo data') fail(`fallback: expected "Demo data", saw "${mode}"`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'demo-walk-phone.png') });
  await context.close();

  const real = errors.filter((e) => !/404|Failed to load resource/.test(e));
  if (real.length) fail(`console errors: ${real.join(' | ')}`);
  process.stdout.write('SMOKE_CONNECTED_OK\n');
} finally {
  await browser.close();
  server.close();
}

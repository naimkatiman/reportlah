import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { build, preview } from 'vite';
import { ROOT } from './paths.mjs';

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** Production build into a temporary folder. Call cleanup() to delete it. */
export async function buildApp() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laporlah-app-'));
  const cleanup = () => fs.rmSync(outDir, { recursive: true, force: true });
  try {
    await build({ root: ROOT, logLevel: 'error', build: { outDir, emptyOutDir: true } });
  } catch (error) {
    cleanup();
    throw error;
  }
  return { outDir, cleanup };
}

/** Runs cleanup on exit signals so a killed script does not leave servers or builds behind. */
export function onShutdown(stop) {
  const handler = () => {
    Promise.resolve(stop()).finally(() => process.exit(130));
  };
  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
}

/**
 * Builds the app into a temporary folder and serves it with `vite preview` on a free port.
 * Always call stop(): it closes the server and deletes the build.
 */
export async function startApp() {
  const built = await buildApp();
  let server = null;
  let stopped = false;

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (server) await new Promise((resolve) => server.httpServer.close(() => resolve()));
    built.cleanup();
  };
  onShutdown(stop);

  try {
    const port = await freePort();
    server = await preview({
      root: ROOT,
      logLevel: 'error',
      build: { outDir: built.outDir },
      preview: { port, strictPort: true, host: '127.0.0.1', open: false },
    });
    return { url: `http://127.0.0.1:${port}/`, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Serves a built folder's files for a request path already stripped of its prefix. Returns false when not found. */
export function serveFile(dir, relPath, res) {
  const clean = decodeURIComponent(relPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(dir, clean);
  if (!file.startsWith(path.resolve(dir)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(file));
  return true;
}

export function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}


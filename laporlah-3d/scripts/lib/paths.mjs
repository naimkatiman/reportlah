import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Project root with an upper-case drive letter. Vitest loads two copies of itself when the
 * working directory is spelled "d:\..." instead of "D:\...", and then fails every test with
 * "Vitest failed to find the current suite". Every script spawns children from this path.
 */
function normalizeDrive(p) {
  return /^[a-z]:/.test(p) ? p[0].toUpperCase() + p.slice(1) : p;
}

export const ROOT = normalizeDrive(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
export const bin = {
  tsc: path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
  vite: path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
  vitest: path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
};
export { normalizeDrive };

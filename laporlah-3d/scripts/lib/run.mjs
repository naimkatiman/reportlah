import { spawnSync } from 'node:child_process';
import { ROOT } from './paths.mjs';

/** Runs a node script from the project root, streaming its output. Returns the exit status. */
export function runNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

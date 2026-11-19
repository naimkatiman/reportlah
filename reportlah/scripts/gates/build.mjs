import { spawnSync } from 'node:child_process';

const MAX_BUFFER = 64 * 1024 * 1024;
const TAIL_LENGTH = 3000;

const steps = [
  {
    name: 'type check',
    args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', '.'],
  },
  {
    name: 'lint',
    args: ['node_modules/eslint/bin/eslint.js', '.'],
  },
  {
    name: 'tests',
    args: ['node_modules/vitest/vitest.mjs', 'run'],
  },
  {
    name: 'build',
    args: ['node_modules/next/dist/bin/next', 'build', '.'],
  },
];

const env = { ...process.env };
delete env.DASHSCOPE_API_KEY;
delete env.REPORTLAH_LIVE;

const tail = (text) => (text ?? '').slice(-TAIL_LENGTH);

let stopped = false;

for (const step of steps) {
  console.log(`step: ${step.name}`);

  const result = spawnSync(process.execPath, [...step.args], {
    stdio: 'pipe',
    encoding: 'utf8',
    env,
    maxBuffer: MAX_BUFFER,
  });

  if (result.status !== 0) {
    console.error(tail(result.stdout));
    console.error(tail(result.stderr));
    console.error(`build chain stopped at ${step.name}`);
    process.exitCode = 1;
    stopped = true;
    break;
  }
}

if (!stopped) {
  console.log('build chain: verified');
}

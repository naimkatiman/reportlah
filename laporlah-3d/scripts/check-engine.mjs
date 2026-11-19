// Runs vitest once. Fails when vitest exits nonzero or ran zero tests. Prints ENGINE_RULES_OK last.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bin } from './lib/paths.mjs';
import { fail, runNode } from './lib/run.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'laporlah-vitest-'));
const report = path.join(dir, 'report.json');
try {
  const status = runNode([bin.vitest, 'run', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`]);
  if (status !== 0) fail(`vitest exited with ${status}`);
  if (!fs.existsSync(report)) fail('vitest wrote no JSON report');
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (!(result.numTotalTests > 0)) fail('vitest ran zero tests');
  if (result.numFailedTests !== 0 || result.numFailedTestSuites !== 0) fail('vitest reported failures');
  console.log(`${result.numPassedTests} tests passed in ${result.numTotalTestSuites} suites`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('ENGINE_RULES_OK');

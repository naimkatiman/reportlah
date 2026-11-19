// Runs one gate's test file and prints the success marker only when every test in it passed.
// Usage: node scripts/gates/run.mjs <name>   ->  tests/gates/<name>.test.ts(x)
// Names starting with "live-" need the real model: they load .env.local and require DASHSCOPE_API_KEY.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const name = process.argv[2] ?? ''
if (!/^[a-z0-9-]+$/.test(name)) {
  console.error('usage: node scripts/gates/run.mjs <name>')
  process.exitCode = 2
} else {
  main(name)
}

function main(gate) {
  const file = ['ts', 'tsx'].map((ext) => `tests/gates/${gate}.test.${ext}`).find((f) => existsSync(f))
  if (!file) return fail(`no test file for gate "${gate}" under tests/gates/`)

  const env = { ...process.env }
  if (gate.startsWith('live-')) {
    if (existsSync('.env.local')) {
      try {
        process.loadEnvFile('.env.local')
      } catch {
        return fail('.env.local could not be read')
      }
      Object.assign(env, process.env)
    }
    if (!env.DASHSCOPE_API_KEY) return fail('no model access: DASHSCOPE_API_KEY is not set')
    env.REPORTLAH_LIVE = '1'
  } else {
    // Offline gates must never reach the real model.
    delete env.DASHSCOPE_API_KEY
    delete env.REPORTLAH_LIVE
  }

  const dir = mkdtempSync(join(tmpdir(), 'reportlah-gate-'))
  const out = join(dir, 'result.json')
  const run = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', file, '--reporter=json', `--outputFile=${out}`],
    { env, encoding: 'utf8' },
  )
  let result = null
  try {
    result = JSON.parse(readFileSync(out, 'utf8'))
  } catch {
    // handled below
  }
  rmSync(dir, { recursive: true, force: true })

  if (!result) return fail(`vitest gave no result for ${file}\n${tail(run.stdout)}\n${tail(run.stderr)}`)
  const passed = result.numPassedTests ?? 0
  const notPassed = (result.numTotalTests ?? 0) - passed
  if (run.status !== 0 || passed === 0 || notPassed !== 0) {
    const failures = (result.testResults ?? [])
      .flatMap((f) => f.assertionResults ?? [])
      .filter((a) => a.status !== 'passed')
      .map((a) => `- [${a.status}] ${a.fullName}: ${tail((a.failureMessages ?? []).join(' '), 300)}`)
    return fail(`${passed} passed, ${notPassed} not passed in ${file}\n${failures.join('\n')}\n${tail(run.stderr)}`)
  }
  console.log(`${passed} tests passed in ${file}`)
  console.log(`gate ${gate}: verified`)
}

function tail(text, n = 1500) {
  const t = String(text ?? '')
  return t.length > n ? t.slice(-n) : t
}

function fail(message) {
  console.error(`gate not met: ${message}`)
  process.exitCode = 1
}

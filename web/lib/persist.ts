import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { State } from '@/lib/types'
import { seed } from '@/lib/seed'

// On Cloudflare the state is one D1 row and every write is a compare-and-swap on `rev`, so two
// messages arriving together are applied one after the other. Locally it lives in process memory.
type Stmt = { bind(...args: unknown[]): Stmt; first<T>(): Promise<T | null>; run(): Promise<{ meta: { changes: number } }> }
type D1 = { prepare(sql: string): Stmt }
const g = globalThis as unknown as { __reportlah?: State }

function d1(): D1 | null {
  try { return ((getCloudflareContext().env as unknown as { DB?: D1 }).DB) ?? null } catch { return null }
}
let ready = false
async function load(db: D1): Promise<{ rev: number; state: State; json: string }> {
  if (!ready) { await db.prepare('CREATE TABLE IF NOT EXISTS reportlah (id INTEGER PRIMARY KEY, rev INTEGER NOT NULL, data TEXT NOT NULL)').run(); ready = true }
  const row = await db.prepare('SELECT rev, data FROM reportlah WHERE id = 1').first<{ rev: number; data: string }>()
  if (row) return { rev: row.rev, state: JSON.parse(row.data) as State, json: row.data }
  const state = seed()
  return { rev: 0, state, json: JSON.stringify(state) }
}

export async function read(): Promise<State> {
  const db = d1()
  return db ? (await load(db)).state : structuredClone((g.__reportlah ??= seed()))
}

export async function mutate<T>(fn: (s: State) => T): Promise<T> {
  const db = d1()
  if (!db) {
    const copy = structuredClone((g.__reportlah ??= seed()))
    const result = fn(copy) // a thrown error leaves the state untouched
    g.__reportlah = copy
    return result
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await load(db)
    const result = fn(cur.state)
    const next = JSON.stringify(cur.state)
    if (next === cur.json && cur.rev > 0) return result
    const res = cur.rev === 0
      ? await db.prepare('INSERT OR IGNORE INTO reportlah (id, rev, data) VALUES (1, 1, ?)').bind(next).run()
      : await db.prepare('UPDATE reportlah SET rev = rev + 1, data = ? WHERE id = 1 AND rev = ?').bind(next, cur.rev).run()
    if (res.meta.changes === 1) return result
  }
  throw new Error('store busy')
}

export async function resetAll(): Promise<void> {
  const db = d1()
  if (!db) { g.__reportlah = seed(); return }
  await load(db)
  await db.prepare('DELETE FROM reportlah WHERE id = 1').run()
}

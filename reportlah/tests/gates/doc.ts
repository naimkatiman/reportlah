import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PLAN = fileURLToPath(new URL('../../.cache/plan.txt', import.meta.url))

function quoted(line: string): string[] {
  return [...line.matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

function planLines(): string[] {
  if (!existsSync(PLAN)) throw new Error(`plan doc missing: expected ${PLAN}`)
  return readFileSync(PLAN, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
}

// The table sits between the line 'You send' and the first line starting with 'Before <digit>'.
// After its 'You should see' header the lines alternate: what to send, then what to expect.
function table(): { sends: string[]; results: string[] } {
  const lines = planLines()
  const start = lines.findIndex((l) => l.trim() === 'You send')
  if (start < 0) throw new Error("plan doc has no 'You send' line")
  const end = lines.findIndex((l, i) => i > start && /^\s*Before \d/.test(l))
  if (end < 0) throw new Error("plan doc has no line starting 'Before <digit>' after the table")
  const rows = lines.slice(start + 1, end).map((l) => l.trim()).filter(Boolean)
  const body = rows.slice(1)
  return {
    sends: body.filter((_, i) => i % 2 === 0),
    results: body.filter((_, i) => i % 2 === 1),
  }
}

export function docSentences(): { offTopic: string; injection: string; sixth: string } {
  const sent = table().sends.filter((l) => /^"[^"]+"$/.test(l)).map((l) => l.slice(1, -1))
  if (sent.length < 2) throw new Error('plan doc table: expected two quoted messages to send')
  const line = planLines().find((l) => l.includes('usual sixth'))
  const sixth = line ? quoted(line).at(-1) : undefined
  if (!sixth) throw new Error("plan doc has no quoted sentence on the 'usual sixth' line")
  return { offTopic: sent[0], injection: sent[1], sixth }
}

export function docReplies(): { other: string; repeat: string; invalid: string; missingPhoto: string } {
  const all = table().results.flatMap(quoted)
  if (all.length < 4) throw new Error('plan doc table: expected at least four quoted expected results')
  return { other: all[0], repeat: all[1], invalid: all[2], missingPhoto: all[all.length - 1] }
}

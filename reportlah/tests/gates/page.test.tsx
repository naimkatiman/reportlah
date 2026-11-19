import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import type { StateView } from '@/lib/types'
import { docSentences } from './doc'
import { fakeChat, freshStore, renderBoard, seed } from './helpers'

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const decode = (s: string) =>
  s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
function marker(html: string, id: string): string {
  const m = html.match(new RegExp(`<(\\w+)[^>]*data-testid="${id}"[^>]*>(.*?)</\\1>`, 's'))
  if (!m) throw new Error(`marker ${id} missing`)
  return text(m[2])
}
function complaintRows(html: string) {
  return [...html.matchAll(/<li[^>]*data-testid="complaint"[^>]*>(.*?)<\/li>/gs)].map((m) => {
    const tag = m[0].match(/data-tag="(\w+)"/)![1]
    const channel = m[0].match(/data-channel="(\w+)"/)![1]
    return { tag, channel, text: text(m[1]) }
  })
}

const TAG: Record<string, string> = { in_report: 'In report', other: 'Other complaint', not_processed: 'Not checked yet' }
const CHANNEL: Record<string, string> = { seed: 'Sample', web: 'Web', telegram: 'Telegram' }

async function seeded(): Promise<StateView> {
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
  return getState()
}

beforeEach(() => freshStore())

describe('page', () => {
  it('puts the complaints column before the report column', async () => {
    const html = renderBoard(await seeded())
    const a = html.indexOf('data-testid="complaints"')
    const b = html.indexOf('data-testid="report"')
    expect(a).toBeGreaterThan(-1)
    expect(b).toBeGreaterThan(a)
  })

  it('labels every complaint with the tag and channel texts matching its attributes', async () => {
    const s = await seeded()
    await addComplaint({ text: docSentences().offTopic, channel: 'web' }, { chat: fakeChat() })
    await addComplaint({ text: docSentences().sixth, channel: 'telegram' }, { chat: fakeChat() })
    const state = getState()
    const rows = complaintRows(renderBoard(state))
    expect(rows).toHaveLength(state.complaints.length)
    expect(rows.length).toBeGreaterThan(s.complaints.length)
    for (const r of rows) {
      expect(Object.keys(TAG)).toContain(r.tag)
      expect(Object.keys(CHANNEL)).toContain(r.channel)
      expect(r.text).toContain(TAG[r.tag])
      expect(r.text).toContain(CHANNEL[r.channel])
      for (const other of Object.keys(TAG).filter((k) => k !== r.tag)) expect(r.text).not.toContain(TAG[other])
    }
  })

  it('says In report for every seed row after a seed run', async () => {
    const rows = complaintRows(renderBoard(await seeded())).filter((r) => r.channel === 'seed')
    expect(rows).toHaveLength(seed.complaints.length)
    for (const r of rows) {
      expect(r.tag).toBe('in_report')
      expect(r.text).toContain('In report')
    }
  })

  it('shows Other complaint and Web for a web other, and Telegram for a telegram one', async () => {
    await seeded()
    const o = await addComplaint({ text: docSentences().offTopic, channel: 'web' }, { chat: fakeChat() })
    expect(o.outcome).toBe('other')
    const t = await addComplaint({ text: docSentences().sixth, channel: 'telegram' }, { chat: fakeChat() })
    expect(t.outcome).toBe('joined')
    const rows = complaintRows(renderBoard(getState()))
    const web = rows.find((r) => r.channel === 'web')!
    expect(web.tag).toBe('other')
    expect(web.text).toContain('Other complaint')
    expect(web.text).toContain('Web')
    const tg = rows.find((r) => r.channel === 'telegram')!
    expect(tg.text).toContain('Telegram')
  })

  it('shows the count exactly and equal to the number in the message', async () => {
    const s = await seeded()
    await addComplaint({ text: docSentences().sixth, channel: 'web' }, { chat: fakeChat() })
    const state = getState()
    const html = renderBoard(state)
    const n = state.report!.count
    expect(n).toBeGreaterThan(s.report!.count)
    expect(marker(html, 'report-count')).toBe(`${n} complaints`)
    const inMsg = decode(marker(html, 'report-message')).match(/(\d+) complaints/)
    expect(inMsg?.[1]).toBe(String(n))
  })

  it('names the recipient and says not confirmed', async () => {
    const r = marker(renderBoard(await seeded()), 'recipient')
    expect(r).toContain(seed.recipient.label)
    expect(r).toContain('not confirmed')
  })

  it('never says resident or people outside complaint texts and the message', async () => {
    await runAgent({ chat: fakeChat() })
    await addComplaint({ text: docSentences().sixth, channel: 'web' }, { chat: fakeChat() })
    const state = getState()
    let t = decode(text(renderBoard(state)))
    // longest first so a complaint text is removed whole before any shorter overlap
    const strip = [...state.complaints.map((c) => c.text), state.report!.message].sort((a, b) => b.length - a.length)
    for (const s of strip) t = t.split(text(s)).join(' ')
    expect(t).not.toMatch(/resident/i)
    expect(t).not.toMatch(/people/i)
  })

  it('has one copy-message button and nothing that sends', async () => {
    const html = renderBoard(await seeded())
    expect(html.match(/data-testid="copy-message"/g)).toHaveLength(1)
    const labels = [...html.matchAll(/<(button|a)\b[^>]*>(.*?)<\/\1>/gs)].map((m) => text(m[2]))
    expect(labels.length).toBeGreaterThan(0)
    for (const l of labels) expect(l).not.toMatch(/send/i)
  })

  it('has exactly one page file under app/', () => {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(dir, e.name))
        else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(e.name)) found.push(join(dir, e.name))
      }
    }
    walk(join(process.cwd(), 'app'))
    expect(found).toHaveLength(1)
  })
})

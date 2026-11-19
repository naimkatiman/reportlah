import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { mostReported } from '@/lib/core/ranking'
import { docSentences } from './doc'
import { fakeChat, freshStore, renderBoard } from './helpers'

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const decode = (s: string) =>
  s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
function marker(html: string, id: string): string {
  const m = html.match(new RegExp(`<(\\w+)[^>]*data-testid="${id}"[^>]*>(.*?)</\\1>`, 's'))
  if (!m) throw new Error(`marker ${id} missing`)
  return text(m[2])
}

const inReportCount = () => getState().complaints.filter((c) => c.tag === 'in_report').length

async function seeded() {
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
  return getState()
}

beforeEach(() => freshStore())

describe('ranking', () => {
  it('is empty before any run', () => {
    expect(mostReported(getState())).toEqual([])
    const html = renderBoard(getState())
    expect(html).toContain('data-testid="ranking"')
    expect(text(marker(html, 'ranking'))).toContain('Most reported')
    expect(text(marker(html, 'ranking'))).toContain('Nothing ranked yet')
    expect(html).not.toContain('data-testid="rank-row"')
  })

  it('has exactly one report row after the seed run, matching the report count', async () => {
    const state = await seeded()
    const rows = mostReported(state)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ rank: 1, kind: 'report' })
    expect(rows[0].count).toBe(inReportCount())
    expect(rows[0].count).toBe(state.report!.count)
    const html = renderBoard(state)
    expect(html.match(/data-testid="rank-row"/g)).toHaveLength(1)
    expect(marker(html, 'rank-count')).toBe(marker(html, 'report-count'))
  })

  it('adds an other row with count 1 after an off-topic complaint', async () => {
    const before = mostReported(await seeded())[0]
    const o = await addComplaint({ text: docSentences().offTopic, channel: 'web' }, { chat: fakeChat() })
    expect(o.outcome).toBe('other')
    const rows = mostReported(getState())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ rank: 1, kind: 'report', count: before.count })
    expect(rows[1]).toMatchObject({ rank: 2, kind: 'other', count: 1 })
    const html = renderBoard(getState())
    const other = html.match(/<(\w+)[^>]*data-testid="rank-row"[^>]*data-kind="other"[^>]*>(.*?)<\/\1>/s)
    expect(other).not.toBeNull()
    expect(text(other![2])).toContain('1 complaint')
    expect(text(other![2])).not.toContain('1 complaints')
  })

  it('raises the report row by one when a sixth complaint joins', async () => {
    const before = mostReported(await seeded())[0]
    const j = await addComplaint({ text: docSentences().sixth, channel: 'web' }, { chat: fakeChat() })
    expect(j.outcome).toBe('joined')
    const state = getState()
    const row = mostReported(state)[0]
    expect(row.kind).toBe('report')
    expect(row.count).toBe(before.count + 1)
    const html = renderBoard(state)
    expect(marker(html, 'rank-count')).toBe(`${row.count} complaints`)
    expect(marker(html, 'rank-count')).toBe(marker(html, 'report-count'))
    const inMsg = decode(marker(html, 'report-message')).match(/(\d+) complaints/)
    expect(inMsg?.[1]).toBe(String(row.count))
  })

  it('does not mutate its input', async () => {
    await seeded()
    await addComplaint({ text: docSentences().offTopic, channel: 'web' }, { chat: fakeChat() })
    const state = getState()
    const copy = structuredClone(state)
    mostReported(state)
    expect(state).toEqual(copy)
  })

  it('renders the ranking after the complaints and report markers', async () => {
    const html = renderBoard(await seeded())
    const r = html.indexOf('data-testid="ranking"')
    expect(r).toBeGreaterThan(html.indexOf('data-testid="complaints"'))
    expect(r).toBeGreaterThan(html.indexOf('data-testid="report"'))
    expect(html.indexOf('data-testid="complaints"')).toBeGreaterThan(-1)
    expect(html.indexOf('data-testid="report"')).toBeGreaterThan(-1)
  })
})

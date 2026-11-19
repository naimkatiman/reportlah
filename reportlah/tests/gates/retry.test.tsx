import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { docSentences } from './doc'
import { fakeChat, freshStore, renderBoard } from './helpers'

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`)
function marker(html: string, id: string): string {
  const m = html.match(new RegExp(`<(\\w+)[^>]*data-testid="${id}"[^>]*>(.*?)</\\1>`, 's'))
  if (!m) throw new Error(`marker ${id} missing`)
  return text(m[2])
}

beforeEach(() => freshStore())

describe('retry', () => {
  it('keeps the old report and offers retry when a later run fails, then recovers', async () => {
    const first = await runAgent({ chat: fakeChat() })
    expect(first.ok).toBe(true)
    const before = renderBoard(getState())
    expect(has(before, 'model-error')).toBe(false)
    expect(has(before, 'retry')).toBe(false)
    const old = {
      count: marker(before, 'report-count'),
      period: marker(before, 'report-period'),
      message: marker(before, 'report-message'),
    }

    const r = await addComplaint(
      { text: docSentences().sixth, channel: 'web' },
      { chat: fakeChat({ failCluster: true }) },
    )
    expect(r.outcome).toBe('model_unavailable')
    const state = getState()
    expect(state.last_error).not.toBeNull()
    const html = renderBoard(state)
    expect(has(html, 'model-error')).toBe(true)
    expect(has(html, 'retry')).toBe(true)
    expect(marker(html, 'model-error')).toContain('The report below is the last good one.')
    expect(marker(html, 'report-count')).toBe(old.count)
    expect(marker(html, 'report-period')).toBe(old.period)
    expect(marker(html, 'report-message')).toBe(old.message)

    const again = await runAgent({ chat: fakeChat() })
    expect(again.ok).toBe(true)
    const after = getState()
    expect(after.last_error).toBeNull()
    const html2 = renderBoard(after)
    expect(has(html2, 'model-error')).toBe(false)
    expect(has(html2, 'retry')).toBe(false)
    expect(after.report!.count).toBeGreaterThan(first.state.report!.count)
    expect(marker(html2, 'report-count')).toBe(`${after.report!.count} complaints`)
  })

  it('shows model-error, retry and No report yet when the first run fails', async () => {
    const res = await runAgent({ chat: fakeChat({ failCluster: true }) })
    expect(res.ok).toBe(false)
    const html = renderBoard(getState())
    expect(has(html, 'model-error')).toBe(true)
    expect(has(html, 'retry')).toBe(true)
    expect(html).toContain('No report yet')
    expect(has(html, 'report-count')).toBe(false)
    expect(marker(html, 'model-error')).not.toContain('last good one')
  })

  it('has no retry marker when last_error is null', () => {
    const html = renderBoard(getState())
    expect(getState().last_error).toBeNull()
    expect(has(html, 'retry')).toBe(false)
    expect(has(html, 'model-error')).toBe(false)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { docSentences } from './doc'
import { freshStore } from './helpers'

beforeEach(freshStore)

const shown = (message: string): number => Number(/(\d+) complaints?\b/.exec(message)?.[1])

describe.skipIf(!process.env.REPORTLAH_LIVE)('live doc table', () => {
  it('sixth joins, off-topic and injection leave the report unchanged', async () => {
    const first = await runAgent()
    expect(first.ok).toBe(true)
    const base = first.state.report!.count

    const j = await addComplaint({ text: docSentences().sixth, channel: 'web' })
    expect(j.outcome).toBe('joined')
    expect(j.state.report!.count).toBe(base + 1)
    expect(shown(j.state.report!.message)).toBe(base + 1)

    const before = structuredClone(getState().report)
    const o = await addComplaint({ text: docSentences().offTopic, channel: 'web' })
    expect(o.outcome).toBe('other')
    expect(o.state.report).toEqual(before)

    for (let i = 0; i < 3; i++) {
      const r = await addComplaint({ text: `${docSentences().injection} ${i}`, channel: 'web' })
      expect(r.outcome).toBe('other')
      expect(r.state.report).toEqual(before)
      expect(r.state.report!.message).not.toMatch(/tomorrow|guarantee/i)
    }
  }, 120_000)
})

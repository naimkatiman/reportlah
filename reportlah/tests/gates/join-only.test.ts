import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, resetAll, runAgent } from '@/lib/core/engine'
import { getStore } from '@/lib/store'
import { docSentences } from './doc'
import { fakeChat, freshStore } from './helpers'

beforeEach(freshStore)

const extra = (n: number) => `${docSentences().sixth} ${n}`

describe('join-only', () => {
  it('later runs that return fewer, none or unknown ids never shrink main_ids', async () => {
    await runAgent({ chat: fakeChat() })
    const base = [...getState().report!.main_ids]
    expect(base.length).toBeGreaterThan(1)

    const models = [
      fakeChat({ ids: (items) => [items[0].id] }),
      fakeChat({ ids: () => [] }),
      fakeChat({ ids: () => ['c_9999', 'nope'] }),
    ]
    let n = 0
    for (const chat of models) {
      const r = await addComplaint({ text: extra(n++), channel: 'web' }, { chat })
      expect(r.outcome).toBe('other')
      const now = r.state.report!.main_ids
      for (const id of base) expect(now).toContain(id)
      expect(now).toEqual(base)
      expect(r.state.report!.count).toBe(base.length)
    }
  })

  it('a later run may add ids and the earlier ones stay', async () => {
    await runAgent({ chat: fakeChat() })
    const base = [...getState().report!.main_ids]
    const r = await addComplaint(
      { text: extra(0), channel: 'web' },
      { chat: fakeChat({ ids: (items) => [items.at(-1)!.id] }) },
    )
    expect(r.outcome).toBe('joined')
    expect(r.state.report!.main_ids).toEqual([...base, r.complaint_id])
  })

  it('only a reset empties the group', async () => {
    await runAgent({ chat: fakeChat() })
    expect(getState().report!.main_ids.length).toBeGreaterThan(0)
    await addComplaint({ text: extra(0), channel: 'web' }, { chat: fakeChat({ ids: () => [] }) })
    expect(getState().report!.main_ids.length).toBeGreaterThan(0)
    const after = resetAll()
    expect(after.report).toBeNull()
    expect(getStore().processed_ids).toEqual([])
    expect(after.complaints.every((c) => c.tag === 'not_processed')).toBe(true)
  })
})

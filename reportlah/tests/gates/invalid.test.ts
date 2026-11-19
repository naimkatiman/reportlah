import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'
import { getStore } from '@/lib/store'
import { docReplies } from './doc'
import { fakeChat, freshStore, seed } from './helpers'

beforeEach(freshStore)

const inputs: [string, unknown][] = [
  ['empty', ''],
  ['whitespace', '   \n\t  '],
  ['number', 123],
  ['null', null],
  ['undefined', undefined],
  ['object', { text: 'a long enough text' }],
  ['four characters', 'abcd'],
  ['four characters padded', '   abcd   '],
]

describe('invalid', () => {
  it.each(inputs)('%s is invalid and nothing is stored', async (_n, text) => {
    const chat = fakeChat()
    const r = await addComplaint({ text, channel: 'web' }, { chat })
    expect(r.outcome).toBe('invalid')
    expect(r.complaint_id).toBeNull()
    expect(replyFor(r)).toBe(docReplies().invalid)
    expect(getStore().complaints).toHaveLength(seed.complaints.length)
    expect(getStore().next_id).toBe(seed.complaints.length + 1)
    expect(chat.stats.cluster + chat.stats.draft).toBe(0)
    expect(r.state.report).toBeNull()
  })

  it('leaves an existing report untouched', async () => {
    const chat = fakeChat()
    await runAgent({ chat })
    const report = structuredClone(getState().report)
    const calls = chat.stats.cluster + chat.stats.draft
    for (const [, text] of inputs) {
      const r = await addComplaint({ text, channel: 'telegram' }, { chat })
      expect(r.outcome).toBe('invalid')
    }
    expect(getState().report).toEqual(report)
    expect(getStore().complaints).toHaveLength(seed.complaints.length)
    expect(chat.stats.cluster + chat.stats.draft).toBe(calls)
  })
})

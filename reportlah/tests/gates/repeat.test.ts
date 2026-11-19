import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'
import { getStore } from '@/lib/store'
import { docReplies, docSentences } from './doc'
import { fakeChat, freshStore, seed } from './helpers'

beforeEach(freshStore)

describe('repeat', () => {
  it('an already processed text is skipped and nothing changes', async () => {
    const chat = fakeChat()
    await runAgent({ chat })
    const j = await addComplaint({ text: docSentences().sixth, channel: 'web' }, { chat })
    expect(j.outcome).toBe('joined')
    const variants = [
      docSentences().sixth,
      docSentences().sixth.toUpperCase(),
      `  ${docSentences().sixth.replace(/ /g, '   ')}  `,
      seed.complaints[0].text.toLowerCase(),
    ]
    for (const text of variants) {
      const calls = chat.stats.cluster + chat.stats.draft
      const complaints = structuredClone(getState().complaints)
      const report = structuredClone(getState().report)
      const processed = [...getStore().processed_ids]
      const r = await addComplaint({ text, channel: 'telegram' }, { chat })
      expect(r.outcome).toBe('duplicate')
      expect(replyFor(r)).toBe(docReplies().repeat)
      expect(chat.stats.cluster + chat.stats.draft).toBe(calls)
      expect(getState().complaints).toEqual(complaints)
      expect(getState().report).toEqual(report)
      expect(getStore().processed_ids).toEqual(processed)
    }
  })
})

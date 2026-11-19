import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'
import { docReplies, docSentences } from './doc'
import { fakeChat, freshStore, type FakeChat } from './helpers'

beforeEach(freshStore)

async function addOther(text: string, chat: FakeChat) {
  const before = structuredClone(getState().report)
  const r = await addComplaint({ text, channel: 'web' }, { chat })
  expect(r.outcome).toBe('other')
  expect(r.state.complaints.find((c) => c.id === r.complaint_id)?.tag).toBe('other')
  expect(r.state.report).toEqual(before)
  expect(r.state.report!.version).toBe(before!.version)
  expect(r.state.last_changed).toEqual([])
  expect(replyFor(r)).toContain(docReplies().other)
  return r
}

describe('other', () => {
  it('an off-topic complaint is tagged other and the report is unchanged', async () => {
    const chat = fakeChat()
    await runAgent({ chat })
    const drafts = chat.stats.draft
    await addOther(docSentences().offTopic, chat)
    expect(chat.stats.draft).toBe(drafts)
  })

  it('the same holds after a sixth complaint has joined', async () => {
    const chat = fakeChat()
    await runAgent({ chat })
    const j = await addComplaint({ text: docSentences().sixth, channel: 'telegram' }, { chat })
    expect(j.outcome).toBe('joined')
    const drafts = chat.stats.draft
    await addOther(`${docSentences().offTopic} again`, chat)
    expect(chat.stats.draft).toBe(drafts)
  })
})

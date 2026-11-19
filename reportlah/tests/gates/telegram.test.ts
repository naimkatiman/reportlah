import { beforeEach, describe, expect, it } from 'vitest'
import { getState, runAgent } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'
import { getStore } from '@/lib/store'
import { handleUpdate, type SendFn } from '@/lib/telegram'
import { docSentences } from './doc'
import { fakeChat, freshStore } from './helpers'

const SENDER = { id: 918273645, first_name: 'Zorbin', username: 'zorbin_test_handle' }
const CHAT_ID = 5550142

const klToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())

function recorder() {
  const sent: { chatId: number; text: string }[] = []
  const send: SendFn = async (chatId, text) => {
    sent.push({ chatId, text })
  }
  return { sent, send }
}

const update = (fields: Record<string, unknown>) => ({
  update_id: 1,
  message: { message_id: 7, from: SENDER, chat: { id: CHAT_ID, type: 'private' }, ...fields },
})

let seedCount = 0

beforeEach(async () => {
  freshStore()
  seedCount = getStore().complaints.length
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
})

describe('telegram updates', () => {
  it('turns the sixth sentence into complaint seed+1 and replies with the new count', async () => {
    const { sent, send } = recorder()
    const out = await handleUpdate(update({ text: docSentences().sixth }), { chat: fakeChat(), send })
    expect(out.outcome).toBe('joined')
    const st = getStore()
    expect(st.complaints).toHaveLength(seedCount + 1)
    const added = st.complaints.at(-1)!
    expect(added).toMatchObject({ id: `c_${seedCount + 1}`, channel: 'telegram', date: klToday() })
    expect(st.processed_ids).toContain(added.id)
    expect(st.report?.main_ids).toContain(added.id)
    const count = st.report!.count
    expect(count).toBe(seedCount + 1)
    expect(sent).toHaveLength(1)
    expect(sent[0].chatId).toBe(CHAT_ID)
    expect(sent[0].text).toContain(String(count))
    const view = getState()
    expect(view.complaints.find((c) => c.id === added.id)?.tag).toBe('in_report')
    expect(sent[0].text).toBe(replyFor({ outcome: 'joined', complaint_id: added.id, state: view }))
    expect(out.reply).toBe(sent[0].text)
  })

  it('a photo with a caption removes the missing-photo gap', async () => {
    expect(getStore().report?.gaps).toContain('no_photo')
    const { send } = recorder()
    await handleUpdate(
      update({ caption: docSentences().sixth, photo: [{ file_id: 'x', width: 10, height: 10 }] }),
      { chat: fakeChat(), send },
    )
    const st = getStore()
    expect(st.complaints.at(-1)?.has_photo).toBe(true)
    expect(st.report?.gaps).not.toContain('no_photo')
    expect(st.report?.version).toBeGreaterThan(1)
  })

  it('never stores anything about the sender', async () => {
    const { send } = recorder()
    await handleUpdate(update({ text: docSentences().sixth }), { chat: fakeChat(), send })
    const dump = JSON.stringify(getStore())
    for (const secret of [SENDER.first_name, SENDER.username, String(SENDER.id), String(CHAT_ID)]) {
      expect(dump).not.toContain(secret)
    }
  })

  it('ignores an update without a message and sends nothing', async () => {
    const { sent, send } = recorder()
    const before = JSON.stringify(getStore())
    const out = await handleUpdate({ update_id: 2, edited_channel_post: {} }, { chat: fakeChat(), send })
    expect(out).toEqual({ outcome: 'ignored', reply: null })
    expect(sent).toHaveLength(0)
    expect(JSON.stringify(getStore())).toBe(before)
  })

  it('answers a photo with no caption with the invalid reply', async () => {
    const { sent, send } = recorder()
    const out = await handleUpdate(update({ photo: [{ file_id: 'x', width: 10, height: 10 }] }), { chat: fakeChat(), send })
    expect(out.outcome).toBe('invalid')
    expect(sent).toHaveLength(1)
    expect(sent[0].text).toBe(replyFor({ outcome: 'invalid', complaint_id: null, state: getState() }))
    expect(getStore().complaints).toHaveLength(seedCount)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { runAgent } from '@/lib/core/engine'
import { getStore } from '@/lib/store'
import { handleUpdate, type SendFn } from '@/lib/telegram'
import { docSentences } from './doc'
import { fakeChat, freshStore } from './helpers'

beforeEach(async () => {
  freshStore()
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
})

describe('telegram queue', () => {
  it('handles two simultaneous updates one after the other', async () => {
    const seedCount = getStore().complaints.length
    const chat = fakeChat({ delayMs: 150 })
    const sent: { chatId: number; text: string }[] = []
    const send: SendFn = async (chatId, text) => {
      sent.push({ chatId, text })
    }
    const mk = (id: number, text: string) => ({ update_id: id, message: { message_id: id, chat: { id: 1000 + id }, text } })
    const first = docSentences().sixth
    const second = `${getStore().seed.complaints[1].text} Still the same today.`

    const a = handleUpdate(mk(1, first), { chat, send })
    const b = handleUpdate(mk(2, second), { chat, send })
    const [ra, rb] = await Promise.all([a, b])

    expect(ra.outcome).toBe('joined')
    expect(rb.outcome).toBe('joined')
    expect(chat.stats.maxActive).toBe(1)
    expect(sent.map((s) => s.chatId)).toEqual([1001, 1002])
    const st = getStore()
    expect(st.complaints).toHaveLength(seedCount + 2)
    expect(st.complaints.slice(-2).map((c) => c.text)).toEqual([first, second])
    expect(st.report?.count).toBe(seedCount + 2)
    expect(sent[1].text).toContain(String(seedCount + 2))
  })
})

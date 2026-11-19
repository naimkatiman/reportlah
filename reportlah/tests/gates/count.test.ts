import { beforeEach, describe, expect, it } from 'vitest'
import { GAP_LABELS } from '@/lib/core/guards'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import type { StateView } from '@/lib/types'
import { docReplies, docSentences } from './doc'
import { fakeChat, freshStore, GOOD_DRAFT, seed } from './helpers'

beforeEach(freshStore)

const shown = (message: string): number => {
  const m = /(\d+) complaints?\b/.exec(message)
  if (!m) throw new Error(`no count in message: ${message}`)
  return Number(m[1])
}
const extra = (n: number) => `${docSentences().sixth} ${n}`
const dayN = (n: number) => () => new Date(`2026-11-${String(18 + n).padStart(2, '0')}T04:00:00Z`)

function checkReport(state: StateView, expected: number) {
  const r = state.report!
  expect(r.count).toBe(r.main_ids.length)
  expect(r.count).toBe(expected)
  expect(shown(r.message)).toBe(r.count)
  const dates = state.complaints.filter((c) => r.main_ids.includes(c.id)).map((c) => c.date).sort()
  expect(r.first_date).toBe(dates[0])
  expect(r.latest_date).toBe(dates.at(-1))
}

describe('count', () => {
  it('count, dates and message number follow the group for 5, 6 and 7', async () => {
    const chat = fakeChat()
    const base = seed.complaints.length
    const first = await runAgent({ chat })
    expect(first.ok).toBe(true)
    checkReport(first.state, base)
    const a = await addComplaint({ text: extra(0), channel: 'web' }, { chat, now: dayN(1) })
    expect(a.outcome).toBe('joined')
    checkReport(a.state, base + 1)
    const b = await addComplaint({ text: extra(1), channel: 'telegram' }, { chat, now: dayN(2) })
    expect(b.outcome).toBe('joined')
    checkReport(b.state, base + 2)
    expect(b.state.report!.latest_date).toBe('2026-11-20')
  })

  it.each([
    ['a digit', 'To {{recipient}}: a drain problem. 4242 people wrote in. {{count}} complaints, {{period}}.', '4242'],
    ['a number word', 'To {{recipient}}: twelve complaints about a drain. {{count}} complaints, {{period}}.', 'twelve'],
  ])('a model that writes %s never reaches the message', async (_n, bad, marker) => {
    const chat = fakeChat({ draft: bad })
    const r = await runAgent({ chat })
    expect(r.state.report!.message).not.toContain(marker)
    expect(shown(r.state.report!.message)).toBe(r.state.report!.count)
    const j = await addComplaint({ text: extra(0), channel: 'web' }, { chat })
    expect(j.state.report!.message).not.toContain(marker)
    expect(shown(j.state.report!.message)).toBe(j.state.report!.count)
    expect(j.state.report!.count).toBe(seed.complaints.length + 1)
  })

  it('a rejected first draft is retried and the count still matches', async () => {
    const chat = fakeChat({
      draft: (n) => (n === 1 ? 'To {{recipient}}: 4242 reports. {{count}} complaints {{period}}.' : GOOD_DRAFT),
    })
    const r = await runAgent({ chat })
    expect(chat.stats.draft).toBe(2)
    expect(r.state.report!.message).not.toContain('4242')
    expect(shown(r.state.report!.message)).toBe(r.state.report!.count)
  })

  it('no-photo gap stays until a complaint with a photo joins', async () => {
    const chat = fakeChat()
    const r = await runAgent({ chat })
    expect(r.state.report!.gap_labels).toContain(docReplies().missingPhoto)
    const j = await addComplaint({ text: extra(0), has_photo: true, channel: 'web' }, { chat })
    expect(j.outcome).toBe('joined')
    expect(j.state.report!.gap_labels).not.toContain(docReplies().missingPhoto)
    expect(j.state.report!.has_photo).toBe(true)
  })

  it('the recipient comes from the seed and is unconfirmed', async () => {
    const r = await runAgent({ chat: fakeChat() })
    const rep = r.state.report!
    expect(seed.recipient.confirmed).toBe(false)
    expect(rep.recipient.label).toBe(seed.recipient.label)
    expect(rep.recipient.confirmed).toBe(false)
    expect(rep.message).toContain(seed.recipient.label)
    expect(rep.gaps).toContain('agency_unconfirmed')
    expect(rep.gap_labels).toContain(GAP_LABELS.agency_unconfirmed)
    expect(getState().report!.gap_labels).toEqual(rep.gap_labels)
  })
})

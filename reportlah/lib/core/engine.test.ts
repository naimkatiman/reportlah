import { beforeEach, describe, expect, it } from 'vitest'
import prompts from '@/agent/prompts.json'
import { addComplaint, getState, resetAll, runAgent } from '@/lib/core/engine'
import { getStore, resetStore } from '@/lib/store'
import type { ChatCall, ChatFn, ChatReply } from '@/lib/types'

const GOOD =
  'To {{recipient}}: residents describe a blocked drain near the bus stop. {{count}} complaints were received between {{period}}. Please ensure it is inspected and cleared in the future.'
const PLACE = 'Drain near the bus stop, Jalan Kerinchi'
const BM_SIXTH = 'Longkang depan bus stop Kerinchi melimpah lagi pagi tadi.'
const LIGHT = 'Lampu jalan di Jalan Kerinchi tak menyala.'

type Reply = ChatReply | Promise<ChatReply>
type Script = {
  cluster?: (n: number, ids: string[], texts: string[]) => Reply
  draft?: (n: number) => Reply
}

const toolReply = (name: string, args: unknown): ChatReply => ({
  tool_calls: [{ name, arguments: typeof args === 'string' ? args : JSON.stringify(args) }],
  content: null,
})
const clusterReply = (ids: string[], place = PLACE): ChatReply =>
  toolReply('cluster', { main_ids: ids, place, issue: 'Blocked drain', reason: 'same drain' })
const draftReply = (text: string): ChatReply => toolReply('draft_report', { text })
const never = (): Promise<ChatReply> => new Promise(() => {})

function sent(call: ChatCall): { id: string; text: string }[] {
  const last = call.messages.at(-1) as { content: string }
  return (JSON.parse(last.content) as { complaints: { id: string; text: string }[] }).complaints
}

// Default model: groups every drain complaint, ignores the rest.
function scripted(script: Script = {}) {
  const calls = { cluster: 0, draft: 0, active: 0, maxActive: 0 }
  const chat: ChatFn = async (call) => {
    const name = call.tool_name as 'cluster' | 'draft'
    const key = name === 'cluster' ? 'cluster' : 'draft'
    calls[key]++
    calls.active++
    calls.maxActive = Math.max(calls.maxActive, calls.active)
    try {
      if (key === 'cluster') {
        const items = sent(call)
        if (script.cluster) return await script.cluster(calls.cluster, items.map((i) => i.id), items.map((i) => i.text))
        return clusterReply(items.filter((i) => /longkang|drain|parit/i.test(i.text)).map((i) => i.id))
      }
      return await (script.draft ? script.draft(calls.draft) : draftReply(GOOD))
    } finally {
      calls.active--
    }
  }
  return { chat, calls }
}

const add = (text: string, chat: ChatFn, extra: Record<string, unknown> = {}, deps = {}) =>
  addComplaint({ text, channel: 'web', ...extra }, { chat, ...deps })

async function v1(chat: ChatFn) {
  const r = await runAgent({ chat })
  expect(r.ok).toBe(true)
  return r
}

beforeEach(() => {
  resetStore()
})

describe('cluster guards', () => {
  it('drops unknown ids and tags unlisted complaints other', async () => {
    const { chat } = scripted({ cluster: () => clusterReply(['c_1', 'c_2', 'c_3', 'c_99', 'c_1']) })
    const r = await v1(chat)
    expect(r.state.report?.main_ids).toEqual(['c_1', 'c_2', 'c_3'])
    expect(r.state.report?.count).toBe(3)
    const tags = Object.fromEntries(r.state.complaints.map((c) => [c.id, c.tag]))
    expect(tags).toMatchObject({ c_1: 'in_report', c_4: 'other', c_5: 'other' })
  })

  it('fails the run when the first group is empty twice', async () => {
    const { chat, calls } = scripted({ cluster: () => clusterReply([]) })
    const r = await runAgent({ chat })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('model_unavailable')
    expect(r.state.report).toBeNull()
    expect(calls.cluster).toBe(2)
    expect(calls.draft).toBe(0)
    expect(r.state.running).toBe(false)
  })

  it('keeps c_3 when a later run omits it', async () => {
    await v1(scripted().chat)
    const { chat } = scripted({ cluster: () => clusterReply(['c_1', 'c_2', 'c_4', 'c_5', 'c_6']) })
    const r = await add(BM_SIXTH, chat)
    expect(r.outcome).toBe('joined')
    expect(r.state.report?.main_ids).toContain('c_3')
    expect(r.state.report?.count).toBe(6)
  })

  it('fails after one retry on an unparseable later answer and leaves the complaint not processed', async () => {
    await v1(scripted().chat)
    const { chat, calls } = scripted({ cluster: () => toolReply('cluster', 'not json') })
    const r = await add(BM_SIXTH, chat)
    expect(r.outcome).toBe('model_unavailable')
    expect(calls.cluster).toBe(2)
    expect(r.state.report?.version).toBe(1)
    expect(r.state.report?.count).toBe(5)
    expect(r.state.complaints.find((c) => c.id === 'c_6')?.tag).toBe('not_processed')
    expect(r.state.last_error).toBe('model_unavailable')
  })

  it('does not call the model when nothing is waiting', async () => {
    await v1(scripted().chat)
    const { chat, calls } = scripted()
    const r = await runAgent({ chat })
    expect(r.ok).toBe(true)
    expect(calls.cluster + calls.draft).toBe(0)
  })
})

describe('stop early and growth', () => {
  it('leaves an unrelated complaint out of the report, from v1 and from v2', async () => {
    await v1(scripted().chat)
    const before = getState().report!
    const s1 = scripted()
    const r1 = await add(LIGHT, s1.chat)
    expect(r1.outcome).toBe('other')
    expect(r1.state.report).toEqual(before)
    expect(r1.state.report?.version).toBe(1)
    expect(s1.calls.draft).toBe(0)
    expect(r1.state.last_changed).toEqual([])

    const j = await add(BM_SIXTH, scripted().chat)
    expect(j.outcome).toBe('joined')
    expect(j.state.report?.version).toBe(2)
    const v2 = j.state.report!

    const s2 = scripted()
    const r2 = await add('Lampu jalan rosak di Kerinchi sejak semalam.', s2.chat)
    expect(r2.outcome).toBe('other')
    expect(r2.state.report).toEqual(v2)
    expect(r2.state.report?.message).toBe(v2.message)
    expect(s2.calls.draft).toBe(0)
    expect(r2.state.last_changed).toEqual([])
  })

  it('raises the count by exactly one when a run names an other complaint and a new drain complaint', async () => {
    await v1(scripted().chat)
    await add(LIGHT, scripted().chat)
    const { chat } = scripted({
      cluster: (_n, ids) => clusterReply(ids), // names the street light (already other) too, if it were sent
    })
    const r = await add(BM_SIXTH, chat)
    expect(r.state.report?.count).toBe(6)
    expect(r.state.report?.main_ids).not.toContain('c_6')
    expect(r.state.complaints.find((c) => c.id === 'c_6')?.tag).toBe('other')
  })

  it('reports which fields changed on a new version', async () => {
    await v1(scripted().chat)
    const r = await add(BM_SIXTH, scripted().chat)
    expect(r.state.last_changed).toEqual(expect.arrayContaining(['count', 'latest_date', 'message']))
    expect(r.state.report?.latest_date).toBe(getStore().complaints.at(-1)!.date)
  })

  it('no_photo gap follows has_photo', async () => {
    const first = await v1(scripted().chat)
    expect(first.state.report?.gaps).toEqual(['no_photo', 'agency_unconfirmed'])
    expect(first.state.report?.gap_labels).toEqual(['No photo yet', 'Responsible agency not confirmed'])
    expect(first.state.last_changed).toEqual([])
    const r = await add(BM_SIXTH, scripted().chat, { has_photo: true })
    expect(r.state.report?.gaps).toEqual(['agency_unconfirmed'])
    expect(r.state.report?.has_photo).toBe(true)
    expect(r.state.last_changed).toContain('gaps')
  })
})

describe('draft guards', () => {
  it.each([
    ['DBKL', GOOD + ' DBKL should act.'],
    ['missing recipient', GOOD.replace('{{recipient}}', 'them')],
    ['digit', GOOD + ' There are 5 of them.'],
    ['five complaints', GOOD.replace('{{count}} complaints', 'five complaints')],
  ])('rejects a draft with %s and retries', async (_n, bad) => {
    const { chat, calls } = scripted({ draft: (n) => draftReply(n === 1 ? bad : GOOD) })
    const r = await v1(chat)
    expect(calls.draft).toBe(2)
    expect(r.state.report?.message_template).toBe(GOOD)
    expect(r.state.last_trace.filter((t) => t.tool === 'draft_report').map((t) => t.by)).toEqual(['qwen', 'qwen'])
  })

  it.each([
    ['ensure', 'To {{recipient}}: please ensure the drain is cleared. {{count}} complaints, {{period}}.'],
    ['in the future', 'To {{recipient}}: keep it clear in the future. {{count}} complaints, {{period}}.'],
  ])('accepts a draft with %s', async (_n, text) => {
    const { chat, calls } = scripted({ draft: () => draftReply(text) })
    const r = await v1(chat)
    expect(calls.draft).toBe(1)
    expect(r.state.report?.message_template).toBe(text)
  })

  it('uses the template after two rejections', async () => {
    const { chat, calls } = scripted({ draft: () => draftReply('We guarantee DBKL will come.') })
    const r = await v1(chat)
    expect(calls.draft).toBe(2)
    expect(r.state.report?.message_template).toBe(prompts.fallback_template)
    expect(r.state.last_trace.at(-1)).toMatchObject({ tool: 'draft_report', by: 'fallback' })
    expect(r.state.report?.message).toContain('5 complaints')
  })

  it('the number in the message equals the count', async () => {
    await v1(scripted().chat)
    const r = await add(BM_SIXTH, scripted().chat)
    const rep = r.state.report!
    expect(rep.message).toContain(`${rep.count} complaints`)
    expect(rep.message).toContain(rep.period)
    expect(rep.message).not.toContain('{{')
    expect(rep.period.startsWith('10 Nov to ')).toBe(true)
  })

  it('formats the period for the seed run', async () => {
    const r = await v1(scripted().chat)
    expect(r.state.report?.period).toBe('10 Nov to 17 Nov 2026')
    expect(r.state.report?.message).toContain('5 complaints were received between 10 Nov to 17 Nov 2026')
  })
})

describe('deadline and place', () => {
  it('fails without a retry when cluster uses the whole deadline', async () => {
    const { chat, calls } = scripted({ cluster: never })
    const r = await runAgent({ chat, deadlineMs: 60, clusterMs: 60 })
    expect(r.ok).toBe(false)
    expect(calls.cluster).toBe(1)
    expect(r.state.report).toBeNull()
  })

  it('falls back to the template when the draft is slow', async () => {
    const { chat, calls } = scripted({ draft: never })
    const r = await runAgent({ chat, deadlineMs: 150 })
    expect(r.ok).toBe(true)
    expect(calls.draft).toBe(1)
    expect(r.state.report?.message_template).toBe(prompts.fallback_template)
    expect(r.state.last_trace.at(-1)?.by).toBe('fallback')
  })

  it('uses the fallback place for a foreign word and keeps the grouping', async () => {
    const { chat } = scripted({ cluster: (_n, ids) => clusterReply(ids, 'Drain near Eiffel Tower') })
    const r = await v1(chat)
    expect(r.state.report?.place).toBe('Drain near the bus stop, Jalan Kerinchi, Bangsar South')
    expect(r.state.report?.count).toBe(5)
    expect(r.state.last_trace.find((t) => t.tool === 'cluster')?.by).toBe('fallback')
  })

  it('appends the area to a good place and freezes it', async () => {
    const first = await v1(scripted().chat)
    expect(first.state.report?.place).toBe('Drain near the bus stop, Jalan Kerinchi, Bangsar South')
    const { chat } = scripted({ cluster: (_n, ids) => clusterReply(ids, 'Somewhere else entirely') })
    const r = await add(BM_SIXTH, chat)
    expect(r.state.report?.place).toBe(first.state.report?.place)
  })
})

describe('failure, concurrency, reset', () => {
  it('keeps the old report on a failed run and re-runs the same text instead of duplicate', async () => {
    await v1(scripted().chat)
    const failing: ChatFn = async () => {
      throw new Error('model_unavailable')
    }
    const bad = await add(BM_SIXTH, failing)
    expect(bad.outcome).toBe('model_unavailable')
    expect(bad.state.report?.count).toBe(5)
    expect(bad.state.report?.version).toBe(1)
    const again = await add(BM_SIXTH, scripted().chat)
    expect(again.outcome).toBe('joined')
    expect(again.state.complaints.filter((c) => c.text === BM_SIXTH)).toHaveLength(1)
    expect(again.state.report?.count).toBe(6)
  })

  it('answers duplicate for a processed text and stores nothing', async () => {
    await v1(scripted().chat)
    const s = scripted()
    const r = await add('  LONGKANG   tersumbat kat Kerinchi tu bila nak clear? Dah seminggu.', s.chat)
    expect(r.outcome).toBe('duplicate')
    expect(r.state.complaints).toHaveLength(5)
    expect(s.calls.cluster).toBe(0)
  })

  it('runs one at a time and a second simultaneous request stores nothing', async () => {
    await v1(scripted().chat)
    const s = scripted({ cluster: async (_n, ids) => { await new Promise((r) => setTimeout(r, 30)); return clusterReply(ids) } })
    const [a, b] = await Promise.all([add(BM_SIXTH, s.chat), add('Another drain complaint about Kerinchi.', s.chat)])
    expect([a.outcome, b.outcome]).toEqual(['joined', 'busy'])
    expect(b.complaint_id).toBeNull()
    expect(s.calls.maxActive).toBe(1)
    expect(getStore().complaints).toHaveLength(6)
    expect(getStore().running).toBe(false)
  })

  it('stores nothing for a request during a run', async () => {
    let release: (r: ChatReply) => void = () => {}
    const gate = new Promise<ChatReply>((res) => { release = res })
    const s = scripted({ cluster: () => gate })
    const running = runAgent({ chat: s.chat })
    expect(getStore().running).toBe(true)
    const during = await add(BM_SIXTH, s.chat)
    expect(during.outcome).toBe('busy')
    expect(getStore().complaints).toHaveLength(5)
    release(clusterReply(['c_1', 'c_2']))
    await running
    expect(getStore().running).toBe(false)
  })

  it('writes nothing when a reset happens during the run', async () => {
    let release: (r: ChatReply) => void = () => {}
    const gate = new Promise<ChatReply>((res) => { release = res })
    const s = scripted({ cluster: () => gate })
    const running = runAgent({ chat: s.chat })
    const epoch = getStore().epoch
    resetAll()
    release(clusterReply(['c_1', 'c_2']))
    await running
    const st = getStore()
    expect(st.epoch).toBe(epoch + 1)
    expect(st.report).toBeNull()
    expect(st.processed_ids).toEqual([])
    expect(st.running).toBe(false)
    expect(st.complaints).toHaveLength(5)
  })
})

describe('input', () => {
  it.each([[''], ['abc'], ['x'.repeat(401)], [undefined], [123]])('treats %s as invalid and stores nothing', async (text) => {
    const s = scripted()
    const r = await addComplaint({ text, channel: 'web' }, { chat: s.chat })
    expect(r.outcome).toBe('invalid')
    expect(r.complaint_id).toBeNull()
    expect(getStore().complaints).toHaveLength(5)
    expect(s.calls.cluster).toBe(0)
  })

  it('dates a new complaint in Kuala Lumpur time and records the channel', async () => {
    await v1(scripted().chat)
    const r = await addComplaint(
      { text: BM_SIXTH, channel: 'telegram' },
      { chat: scripted().chat, now: () => new Date('2026-11-18T17:30:00Z') },
    )
    const c = r.state.complaints.find((x) => x.id === 'c_6')!
    expect(c).toMatchObject({ date: '2026-11-19', channel: 'telegram', has_photo: false })
    expect(r.state.report?.latest_date).toBe('2026-11-19')
  })
})

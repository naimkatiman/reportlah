import seedJson from '@/data/seed.json'
import { resetStore } from '@/lib/store'
import type { ChatFn, ChatReply, Seed } from '@/lib/types'

export { renderBoard } from './view'

export const seed = seedJson as Seed

export type Item = { id: string; text: string }
type Flag = boolean | ((n: number) => boolean)

export type FakeOpts = {
  pick?: (item: Item) => boolean // default: the complaints about the seed's issue
  ids?: (items: Item[], n: number) => string[] // overrides pick: exact ids to return
  place?: string
  draft?: string | ((n: number) => string)
  failCluster?: Flag
  failDraft?: Flag
  delayMs?: number
}

export type FakeStats = { cluster: number; draft: number; active: number; maxActive: number }
export type FakeChat = ChatFn & { stats: FakeStats }

export const GOOD_DRAFT =
  'To {{recipient}}: a blocked drain was reported. {{count}} complaints were received between {{period}}.'

const ISSUE = /longkang|drain|parit/i

const toolReply = (name: string, args: unknown): ChatReply => ({
  tool_calls: [{ name, arguments: JSON.stringify(args) }],
  content: null,
})

const on = (f: Flag | undefined, n: number) => (typeof f === 'function' ? f(n) : f === true)

export function sentItems(call: { messages: unknown[] }): Item[] {
  const last = call.messages.at(-1) as { content: string }
  return (JSON.parse(last.content) as { complaints: Item[] }).complaints
}

export function fakeChat(opts: FakeOpts = {}): FakeChat {
  const stats: FakeStats = { cluster: 0, draft: 0, active: 0, maxActive: 0 }
  const chat: ChatFn = async (call) => {
    const kind = call.tool_name === 'cluster' ? 'cluster' : 'draft'
    const n = ++stats[kind]
    stats.active++
    stats.maxActive = Math.max(stats.maxActive, stats.active)
    try {
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs))
      if (on(kind === 'cluster' ? opts.failCluster : opts.failDraft, n)) throw new Error('model_unavailable')
      if (kind === 'cluster') {
        const items = sentItems(call)
        const main_ids = opts.ids
          ? opts.ids(items, n)
          : items.filter(opts.pick ?? ((i) => ISSUE.test(i.text))).map((i) => i.id)
        return toolReply('cluster', {
          main_ids,
          place: opts.place ?? seed.place_fallback,
          issue: 'Blocked drain',
          reason: 'same drain',
        })
      }
      const d = opts.draft ?? GOOD_DRAFT
      return toolReply('draft_report', { text: typeof d === 'function' ? d(n) : d })
    } finally {
      stats.active--
    }
  }
  return Object.assign(chat, { stats })
}

export function freshStore(): void {
  resetStore()
}

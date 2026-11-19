import { addComplaint } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'
import { getStore } from '@/lib/store'
import type { AddResult, Deps, Outcome } from '@/lib/types'

export type SendFn = (chatId: number, text: string) => Promise<void>
export type TelegramDeps = Deps & { send?: SendFn; waitMs?: number }
type Handled = { outcome: Outcome | 'ignored'; reply: string | null }

const POLL_MS = 100

// One module-level chain: an update is fully handled before the next one starts.
let queue: Promise<unknown> = Promise.resolve()

async function defaultSend(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) throw new Error(`sendMessage status ${res.status}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitUntilIdle(ms: number): Promise<void> {
  const until = Date.now() + ms
  while (getStore().running && Date.now() < until) await sleep(POLL_MS)
}

function pick(update: unknown): { text: unknown; hasPhoto: boolean; chatId: number } | null {
  if (typeof update !== 'object' || update === null) return null
  const message = (update as { message?: unknown }).message
  if (typeof message !== 'object' || message === null) return null
  const m = message as {
    text?: unknown
    caption?: unknown
    photo?: unknown
    video?: unknown
    video_note?: unknown
    animation?: unknown
    document?: unknown
    chat?: unknown
  }
  const chatId = typeof m.chat === 'object' && m.chat !== null ? (m.chat as { id?: unknown }).id : undefined
  if (typeof chatId !== 'number') return null
  const isObj = (v: unknown) => typeof v === 'object' && v !== null
  const mime = isObj(m.document) ? (m.document as { mime_type?: unknown }).mime_type : undefined
  const hasPhoto =
    (Array.isArray(m.photo) && m.photo.length > 0) ||
    isObj(m.video) ||
    isObj(m.video_note) ||
    isObj(m.animation) ||
    (typeof mime === 'string' && (mime.startsWith('image/') || mime.startsWith('video/')))
  return { text: m.text ?? m.caption, hasPhoto, chatId }
}

async function process1(update: unknown, deps: TelegramDeps): Promise<Handled> {
  const got = pick(update)
  if (!got) return { outcome: 'ignored', reply: null }
  const input = { text: got.text, has_photo: got.hasPhoto, channel: 'telegram' as const }
  let result: AddResult = await addComplaint(input, deps)
  if (result.outcome === 'busy') {
    await waitUntilIdle(deps.waitMs ?? 10000)
    result = await addComplaint(input, deps)
  }
  const reply = replyFor(result)
  try {
    await (deps.send ?? defaultSend)(got.chatId, reply)
  } catch (e) {
    // Never log the error text: a fetch failure message can carry the bot URL.
    console.error('telegram send failed', e instanceof Error ? e.name : 'error')
  }
  return { outcome: result.outcome, reply }
}

export function handleUpdate(update: unknown, deps: TelegramDeps = {}): Promise<Handled> {
  const run = queue.then(() => process1(update, deps))
  // A rejected handler must not block the next update.
  queue = run.catch(() => undefined)
  return run
}

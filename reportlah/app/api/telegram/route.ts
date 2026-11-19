import { createHash, timingSafeEqual } from 'node:crypto'
import { handleUpdate } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

function secretOk(header: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || header === null) return false
  // Digests are always the same length, so the compare never leaks the secret length.
  const a = createHash('sha256').update(header).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}

export async function POST(request: Request): Promise<Response> {
  if (!secretOk(request.headers.get('x-telegram-bot-api-secret-token'))) {
    return Response.json({ ok: false }, { status: 401 })
  }
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }
  await handleUpdate(body)
  return Response.json({ ok: true })
}

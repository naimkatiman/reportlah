import { addComplaint } from '@/lib/core/engine'
import { replyFor } from '@/lib/replies'

export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {}

  const fields = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await addComplaint({ text: fields.text ?? null, has_photo: fields.has_photo, channel: 'web' })

  return Response.json({ ...result, reply: replyFor(result) })
}

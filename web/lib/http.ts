import { AgentError, DomainError, type ErrCode } from '@/lib/types'

const STATUS: Record<ErrCode, number> = { not_found: 404, invalid_input: 400, too_short: 400, duplicate: 409 }
const SAY: Partial<Record<ErrCode, string>> = { too_short: 'Please write a complaint.', duplicate: 'That complaint is already in.' }

export function fail(e: unknown): Response {
  if (e instanceof DomainError) return Response.json({ error: e.code, reply: SAY[e.code] ?? 'That did not work. Try again.', ...e.extra }, { status: STATUS[e.code] })
  if (e instanceof AgentError) return Response.json({ error: 'model_unavailable', reply: 'The assistant cannot be reached. The report is unchanged.' }, { status: 502 })
  console.error(e)
  return Response.json({ error: 'internal', reply: 'Something went wrong. The report is unchanged.' }, { status: 500 })
}

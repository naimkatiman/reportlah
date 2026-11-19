import { getState } from '@/lib/core/engine'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  return Response.json(getState())
}

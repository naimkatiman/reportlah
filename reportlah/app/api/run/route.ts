import { runAgent } from '@/lib/core/engine'

export const dynamic = 'force-dynamic'

export async function POST(): Promise<Response> {
  return Response.json(await runAgent())
}

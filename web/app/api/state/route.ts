import { fail } from '@/lib/http'
import { view } from '@/lib/core'
import { read } from '@/lib/persist'

export const dynamic = 'force-dynamic'

export async function GET() {
  try { return Response.json(view(await read())) } catch (e) { return fail(e) }
}

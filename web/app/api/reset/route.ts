import { fail } from '@/lib/http'
import { view } from '@/lib/core'
import { read, resetAll } from '@/lib/persist'

export async function POST() {
  try { await resetAll(); return Response.json(view(await read())) } catch (e) { return fail(e) }
}

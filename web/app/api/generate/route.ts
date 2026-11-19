import { fail } from '@/lib/http'
import { view } from '@/lib/core'
import { read } from '@/lib/persist'
import { generate } from '@/lib/flow'

export async function POST() {
  try {
    const { unchanged } = await generate()
    return Response.json({ unchanged, reply: unchanged ? 'Report unchanged. No new complaints.' : '', ...view(await read()) })
  } catch (e) {
    return fail(e)
  }
}

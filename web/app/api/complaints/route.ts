import { AgentError, DomainError, type Media } from '@/lib/types'
import { fail } from '@/lib/http'
import { addComplaint, todayMY, view } from '@/lib/core'
import { mutate, read } from '@/lib/persist'
import { place } from '@/lib/flow'

const MAX = 25 * 1024 * 1024

export async function POST(request: Request) {
  try {
    let form: FormData
    try { form = await request.formData() } catch { throw new DomainError('invalid_input') }
    const file = form.get('media')
    let media: Media | null = null
    if (file instanceof File && file.size > 0) {
      // A photo or a video counts as evidence. The file itself is not read by the assistant and not kept.
      if (file.size > MAX) throw new DomainError('invalid_input', { reply: 'That file is over 25 MB. Send a shorter clip.' })
      if (file.type.startsWith('image/')) media = 'photo'
      else if (file.type.startsWith('video/')) media = 'video'
      else throw new DomainError('invalid_input', { reply: 'Attach a photo or a video.' })
    }
    // Duplicate check and insert are one write, so two identical messages sent together count once.
    const complaint = await mutate((s) => addComplaint(s, { text: String(form.get('text') ?? ''), channel: 'web', media, date: todayMY() }))
    let reply = 'Received. It will be grouped when the report is generated.'
    let status = 201
    let error: string | undefined
    if ((await read()).report) {
      try {
        const outcome = await place(complaint)
        const v = view(await read())
        reply = outcome === 'joined' ? `Added. This report now has ${v.report?.count} complaints.` : 'Recorded as another complaint. The report is unchanged.'
      } catch (e) {
        if (!(e instanceof AgentError)) throw e
        // The complaint is kept and waits; Retry places it.
        reply = 'Your complaint is saved, but the assistant cannot be reached. Press Retry.'; status = 502; error = 'model_unavailable'
      }
    }
    return Response.json({ reply, error, complaint_id: complaint.id, ...view(await read()) }, { status })
  } catch (e) {
    return fail(e)
  }
}

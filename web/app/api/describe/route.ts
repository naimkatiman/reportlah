import { chat } from '@/lib/agent/client'

const KINDS = ['Blocked drain', 'Streetlight not working', 'Pothole in the road', 'Rubbish not collected']
// Sample values, shown to the resident as samples. A photo carries no trustworthy place, and a video
// is not read at all, so these stand in until the resident corrects them.
const SAMPLE_PLACE = 'Jalan Kerinchi bus stop, Bangsar South'
const SAMPLE_VIDEO = 'Video shows the problem at this spot.'

// Suggests a description and a place for an attached photo or video, to save the resident typing.
// Nothing is stored here. The resident can change every field before sending.
export async function POST(request: Request) {
  let file: unknown
  try { file = (await request.formData()).get('media') } catch { return Response.json({ error: 'invalid_input' }, { status: 400 }) }
  if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) return Response.json({ error: 'invalid_input' }, { status: 400 })
  const sample = { place: SAMPLE_PLACE, place_source: 'sample' as const }
  if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) {
    return Response.json({ description: file.type.startsWith('video/') ? SAMPLE_VIDEO : '', description_source: 'sample', kind: '', ...sample })
  }
  try {
    const url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`
    const reply = await chat({
      messages: [
        { role: 'system', content: 'You describe photos of public facility problems for a complaint form. Describe only what is visible. Never guess a location, a cause or who is responsible. Reply in JSON only.' },
        { role: 'user', content: [{ type: 'image_url', image_url: { url } }, { type: 'text', text: `Reply with JSON keys "description" (one or two plain English sentences on the visible problem) and "kind" (exactly one of: ${KINDS.join(' | ')} | other).` }] },
      ],
      response_format: { type: 'json_object' },
    })
    const j = JSON.parse(reply.content ?? '{}') as { description?: unknown; kind?: unknown }
    const description = typeof j.description === 'string' ? j.description.trim().slice(0, 300) : ''
    if (!description) throw new Error('empty')
    return Response.json({ description, description_source: 'assistant', kind: KINDS.includes(String(j.kind)) ? String(j.kind) : '', ...sample })
  } catch {
    return Response.json({ description: '', description_source: 'sample', kind: '', ...sample })
  }
}

import { beforeEach, describe, expect, it } from 'vitest'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { getStore } from '@/lib/store'
import { handleUpdate, type SendFn } from '@/lib/telegram'
import { docReplies, docSentences } from './doc'
import { fakeChat, freshStore, renderBoard } from './helpers'

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const send: SendFn = async () => {}

const IDS = { file_id: 'zq-file-id-4471', file_unique_id: 'zq-unique-id-9082', file_name: 'zq-name-3365.bin' }

const update = (fields: Record<string, unknown>) => ({
  update_id: 1,
  message: { message_id: 7, from: { id: 1 }, chat: { id: 2, type: 'private' }, ...fields },
})

let counter = 0
const fresh = () => `${docSentences().sixth} ${++counter}`
const hasLabel = () => text(renderBoard(getState())).includes(docReplies().missingPhoto)

beforeEach(async () => {
  freshStore()
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
})

async function sendWith(fields: Record<string, unknown>) {
  return handleUpdate(update({ caption: fresh(), ...fields }), { chat: fakeChat(), send })
}

describe('media', () => {
  it('has one file input accepting image and video, and no checkbox', () => {
    const html = renderBoard(getState())
    const form = html.match(/<form[^>]*data-testid="add-form"[^>]*>(.*?)<\/form>/s)
    expect(form).not.toBeNull()
    const inputs = [...form![1].matchAll(/<input\b[^>]*>/g)].map((m) => m[0])
    const files = inputs.filter((i) => /type="file"/.test(i))
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/accept="[^"]*image\/[^"]*"/)
    expect(files[0]).toMatch(/accept="[^"]*video\/[^"]*"/)
    expect(inputs.filter((i) => /type="checkbox"/.test(i))).toHaveLength(0)
  })

  const cases: [string, Record<string, unknown>][] = [
    ['a video', { video: { ...IDS, duration: 3 } }],
    ['a video document', { document: { ...IDS, mime_type: 'video/mp4' } }],
    ['a photo array', { photo: [{ file_id: IDS.file_id, file_unique_id: IDS.file_unique_id, width: 10, height: 10 }] }],
  ]
  for (const [name, fields] of cases) {
    it(`clears the missing-evidence label with ${name}`, async () => {
      expect(hasLabel()).toBe(true)
      const out = await sendWith(fields)
      expect(out.outcome).toBe('joined')
      expect(getStore().complaints.at(-1)?.has_photo).toBe(true)
      expect(hasLabel()).toBe(false)
      const dump = JSON.stringify(getStore())
      for (const v of Object.values(IDS)) expect(dump).not.toContain(v)
    })
  }

  it('keeps the label for a pdf document', async () => {
    await sendWith({ document: { ...IDS, mime_type: 'application/pdf' } })
    expect(getStore().complaints.at(-1)?.has_photo).toBe(false)
    expect(hasLabel()).toBe(true)
    const dump = JSON.stringify(getStore())
    for (const v of Object.values(IDS)) expect(dump).not.toContain(v)
  })

  it('shows Photo or video on a web complaint with has_photo', async () => {
    const r = await addComplaint({ text: fresh(), has_photo: true, channel: 'web' }, { chat: fakeChat() })
    expect(r.complaint_id).not.toBeNull()
    const html = renderBoard(getState())
    const row = [...html.matchAll(/<li[^>]*data-testid="complaint"[^>]*>(.*?)<\/li>/gs)].filter((m) =>
      text(m[1]).includes(r.complaint_id ? getState().complaints.find((c) => c.id === r.complaint_id)!.text : ''),
    )
    expect(row).toHaveLength(1)
    expect(text(row[0][1])).toContain('Photo or video')
  })

  it('has the optional label in the form', () => {
    expect(text(renderBoard(getState()))).toContain('Photo or video (optional)')
  })
})

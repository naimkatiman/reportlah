import { beforeEach, describe, expect, it } from 'vitest'
import { getState, runAgent } from '@/lib/core/engine'
import { fakeChat, freshStore, renderBoard } from './helpers'

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function rows(html: string): { status: string; text: string }[] {
  return [...html.matchAll(/<li[^>]*data-testid="step"[^>]*data-status="(\w+)"[^>]*>(.*?)<\/li>/g)].map((m) => ({
    status: m[1],
    text: text(m[2]),
  }))
}

const LABELS = ['Read the complaints', 'Group the complaints', 'Write the message', 'Check what is missing']

beforeEach(() => freshStore())

describe('steps', () => {
  it('shows four waiting rows before any run', () => {
    const r = rows(renderBoard(getState()))
    expect(r).toHaveLength(4)
    r.forEach((row, i) => {
      expect(row.status).toBe('waiting')
      expect(row.text).toContain(LABELS[i])
    })
  })

  it('shows four done rows in contract order after a real run', async () => {
    const res = await runAgent({ chat: fakeChat() })
    expect(res.ok).toBe(true)
    const r = rows(renderBoard(getState()))
    expect(r).toHaveLength(4)
    const actors = ['The app', 'The assistant', 'The assistant', 'The app']
    r.forEach((row, i) => {
      expect(row.status).toBe('done')
      expect(row.text.indexOf(LABELS[i])).toBe(0)
      expect(row.text).toContain(actors[i])
      expect(row.text).toMatch(/\d+ ms/)
    })
    expect(r[0].text).not.toContain('The assistant')
    expect(r[1].text).not.toContain('The app')
    expect(r[2].text).not.toContain('The app')
    expect(r[3].text).not.toContain('The assistant')
  })

  it('shows the backup wording actor when every draft is rejected', async () => {
    const res = await runAgent({ chat: fakeChat({ draft: 'We guarantee DBKL will come.' }) })
    expect(res.ok).toBe(true)
    const r = rows(renderBoard(getState()))
    expect(r[2].text).toContain('The app (backup wording)')
  })
})

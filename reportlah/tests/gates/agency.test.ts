import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GET, POST } from '@/app/api/mcp/route'
import { addComplaint, getState, runAgent } from '@/lib/core/engine'
import { getStore } from '@/lib/store'
import { docSentences } from './doc'
import { fakeChat, freshStore } from './helpers'

const KEY = 'agency-test-key-abc'
const saved = process.env.AGENCY_KEYS

const mcp = (body: unknown, auth?: string) =>
  POST(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    }),
  )

type Rpc = { result: { tools: { name: string }[]; content: { type: string; text: string }[] } }

async function parse(res: Response): Promise<Rpc> {
  const raw = await res.text()
  if ((res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const data = raw.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim())
    return JSON.parse(data.at(-1)!)
  }
  return JSON.parse(raw)
}

let id = 0
const rpc = async (method: string, params?: unknown) => {
  const res = await mcp({ jsonrpc: '2.0', id: ++id, method, params }, `Bearer ${KEY}`)
  expect(res.status).toBe(200)
  return (await parse(res)).result
}
const callTool = async (name: string) => {
  const result = await rpc('tools/call', { name, arguments: {} })
  return JSON.parse(result.content[0].text)
}

beforeEach(async () => {
  process.env.AGENCY_KEYS = KEY
  freshStore()
  const r = await runAgent({ chat: fakeChat() })
  expect(r.ok).toBe(true)
})

afterEach(() => {
  if (saved === undefined) delete process.env.AGENCY_KEYS
  else process.env.AGENCY_KEYS = saved
})

describe('agency endpoint', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(res.status).toBe(401)
  })

  it('rejects a wrong key', async () => {
    const res = await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, `Bearer ${KEY}x`)
    expect(res.status).toBe(401)
  })

  it('lists exactly the two contract tools', async () => {
    const result = await rpc('tools/list')
    expect(result.tools.map((t: { name: string }) => t.name).sort()).toEqual(['get_report', 'list_reports'])
  })

  it('get_report follows the current count before and after a sixth complaint', async () => {
    const before = await callTool('get_report')
    expect(before.count).toBe(getState().report!.count)
    const r = await addComplaint({ text: docSentences().sixth, channel: 'web' }, { chat: fakeChat() })
    expect(r.outcome).toBe('joined')
    const after = await callTool('get_report')
    expect(after.count).toBe(getState().report!.count)
    expect(after.count).toBe(before.count + 1)
  })

  it('calling every tool leaves the store unchanged', async () => {
    const tools = (await rpc('tools/list')).tools.map((t: { name: string }) => t.name)
    const snapshot = JSON.stringify(getStore())
    for (const name of tools) await callTool(name)
    expect(JSON.stringify(getStore())).toBe(snapshot)
  })

  it('answers GET with 405 and exports no DELETE handler', async () => {
    expect((await GET()).status).toBe(405)
    expect(Object.keys(await import('@/app/api/mcp/route')).sort()).toEqual(['GET', 'POST', 'dynamic'])
  })
})

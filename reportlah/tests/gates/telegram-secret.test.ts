import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/telegram/route'
import { getStore } from '@/lib/store'
import { freshStore } from './helpers'

const HEADER = 'x-telegram-bot-api-secret-token'
const SECRET = 'test-secret-value-123'
const saved = process.env.TELEGRAM_WEBHOOK_SECRET

const call = (headers: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/telegram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ update_id: 1 }),
    }),
  )

beforeEach(() => {
  freshStore()
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET
})

afterEach(() => {
  if (saved === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET
  else process.env.TELEGRAM_WEBHOOK_SECRET = saved
})

describe('telegram webhook secret', () => {
  it('rejects a missing header', async () => {
    const before = JSON.stringify(getStore())
    const res = await call()
    expect(res.status).toBe(401)
    expect(JSON.stringify(getStore())).toBe(before)
  })

  it('rejects a wrong header', async () => {
    const before = JSON.stringify(getStore())
    const res = await call({ [HEADER]: `${SECRET}x` })
    expect(res.status).toBe(401)
    expect(JSON.stringify(getStore())).toBe(before)
  })

  it('rejects everyone when the secret is unset', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    const before = JSON.stringify(getStore())
    expect((await call({ [HEADER]: SECRET })).status).toBe(401)
    expect((await call({ [HEADER]: '' })).status).toBe(401)
    expect((await call()).status).toBe(401)
    expect(JSON.stringify(getStore())).toBe(before)
  })

  it('accepts the right header', async () => {
    const before = JSON.stringify(getStore())
    const res = await call({ [HEADER]: SECRET })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(JSON.stringify(getStore())).toBe(before)
  })
})

// Long-polls Telegram getUpdates and forwards each update to the local webhook route.
import { existsSync } from 'node:fs'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const target = `${process.env.LOCAL_URL ?? 'http://localhost:3000'}/api/telegram`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  if (!token || !secret) {
    console.error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET (env or .env.local).')
    process.exitCode = 1
    return
  }
  let offset = 0
  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?timeout=30&offset=${offset}`)
      const data = await res.json()
      if (!data.ok) throw new Error(`getUpdates status ${res.status}`)
      for (const update of data.result) {
        // One at a time, in order.
        const r = await fetch(target, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
          body: JSON.stringify(update),
        })
        if (!r.ok) console.error(`webhook answered ${r.status}`)
        offset = update.update_id + 1
      }
    } catch (e) {
      // Name only: fetch error messages can contain the request URL, which holds the token.
      console.error('poll error', e instanceof Error ? e.name : 'error')
      await sleep(3000)
    }
  }
}

await main()

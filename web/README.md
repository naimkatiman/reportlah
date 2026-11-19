# Reportlah

Many complaints about one public facility become one report: where it is, how many complaints, the dates, an English message ready to copy, and what is still missing. Below it, issues are ranked by the number of reports posted.

Built for QodeFest (Public Good). Next.js on Cloudflare Workers, Qwen (`qwen/qwen3.7-plus`) through an OpenAI-compatible endpoint, one D1 row for state.

## What decides what

- The assistant decides which complaints belong together and writes the message (`lib/agent/run.ts`).
- Code owns the number, the dates and the missing items (`lib/core.ts`). The assistant writes `{count}` and `{dates}`; code fills them in, so the number in the message always matches the number on screen.
- Complaints join the report and never leave it. An exact repeat is refused. A complaint about something else is marked "Other complaint" and counted under its own issue. Text that tries to give instructions is never joined and never ranked.
- A complaint can carry a photo or a video. Either one clears "No photo or video yet". The file is not read by the assistant and not stored.

## Run

```
npm install
# .env.local: OPENROUTER_API_KEY, QWEN_BASE_URL=https://openrouter.ai/api/v1, QWEN_MODEL=qwen/qwen3.7-plus
npm run build && npm run start
npm test
```

Deploy: `npx wrangler login`, `npx wrangler secret put OPENROUTER_API_KEY`, `npm run deploy`.

## Not built

Telegram intake, the agency read connection, accounts, maps, photo reading, sending the report to anyone.

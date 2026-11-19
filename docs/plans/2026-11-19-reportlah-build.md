# Reportlah build notes

**Status: In progress (19 Nov 2026).** For Naim. The team sheet is `BLUEPRINT-reportlah.md`. If the two disagree about what the audience sees, the team sheet wins. This file is how the app enforces it.

Same decisions as revision 1 (19 Nov, 11:40). App: `reportlah/`. This file wins over `BLUEPRINT-suara-setempat.md` on implementation. Laporlah and Suara Setempat are superseded.

QodeFest, Public Good. Freeze 14:15. Submit 14:45.

## Locked

- The agent groups and writes. Code owns the count, the dates, the gaps and the tokens.
- The group only grows. "Other complaint" leaves version, count, dates and message unchanged.
- Recipient is "Local authority", not confirmed, unless Isyraf supplies a named body and a source URL.
- Railway: one service, one replica, `next start` on `$PORT`, root `reportlah/`. In-memory store. Not serverless.
- `@modelcontextprotocol/sdk` and `zod` are approved.
- Do not build: login, maps, voting, a public feed, moderation, photo reading, WhatsApp or email to agencies, a second neighbourhood, edit or delete, a database, or any MCP write past the stretch label.

Stack: Next.js (App Router), TypeScript, Tailwind, Vitest, `openai` SDK against Model Studio, `qwen3.7-plus` (fallbacks `qwen3.8-flash`, then `qwen4-max`). Telegram via `fetch`. Qoder Agent mode, one chat per task. Do not say "Qoder Quest" (retired in v1.34.0). If a chat stalls, `/coder`. At least 30% of tasks on Qwen. After each task: `git commit -m "qoder T<n>: <outcome>"`, staged by filename.

Model ids are from vendor docs read on 18 Nov. Unproven until the 12:00 smoke check.

## Tasks

Before 12:10: BotFather bot, Model Studio key, Railway live. Secrets in the host env only: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `AGENCY_KEYS`.

| When | Task | Done when |
|------|------|-----------|
| 11:50 to 12:10 | **T1** Two forced Qwen calls. Empty Next app on Railway. Bot created. By hand. | Times noted. URL loads. Region and model fixed. |
| 12:10 to 12:50 | **T2** Store, guards, `addComplaint`, `runAgent` on a scripted model. Qoder. | `npm test` green. |
| 12:50 to 13:15 | **T3** `GET /api/state`, `POST /api/run`, `POST /api/complaints`, `POST /api/reset`, one page. Qoder. | v1 three times: 5 complaints, under 8 s. Record it. |
| 13:15 to 13:40 | **T4** `POST /api/telegram`, replies, `setWebhook`. Qoder. | Phone sends the sixth. Page shows 6. |
| 13:40 to 14:00 | **T5** `POST /api/mcp`, three read-only tools, bearer key, in Qoder. | Qoder answers the demo question. |
| 14:00 to 14:15 | **T6** Rehearsal on the deploy. Freeze. | Checks pass, or the failing piece is cut. |
| 14:15 to 14:45 | **T7** README, public repo, deploy link, video file. | Form has the links. |

## Run

```
Web        POST /api/complaints ─┐
Telegram   POST /api/telegram   ─┼─► core: addComplaint, runAgent, guards, globalThis ─► Qwen
Agency     POST /api/mcp        ─┘
Page polls GET /api/state
```

One core, three adapters. Test the core once with a scripted model.

| Step | Who | Result |
|------|-----|--------|
| `read_complaints` | Code | `{id, text, date}`. First run: all. Later: grouped plus still "Not processed". |
| `cluster` | Qwen | `main_ids[]`, `place`, `issue`, `reason`. |
| `draft_report` | Qwen | English text with `{{recipient}}`, `{{count}}`, `{{period}}`. |
| `list_gaps` | Code | The gap list. |

All four appear in the trace. Ken's line: "Code reads, the agent groups, the agent writes, code checks what is missing."

**Cluster.** Drop unknown ids. Count an exact duplicate once. Anything not grouped is "Other complaint" and is never sent again. First run: empty `main_ids` retries once, then the run fails. Later: new group = old group + returned ids that were "Not processed". `place` and `issue` freeze on the first success. Every word of four or more letters in `place` must be in a grouped complaint or in `seed.place_words`, else `seed.place_fallback` (trace says "fallback"). Code appends `seed.area`.

**Stop early.** Same group and photo state: change nothing, do not call `draft_report`.

**Draft.** Fresh conversation: system prompt, place, issue, grouped texts only. Code fills tokens from the same values as the badge. Reject, one retry, then the `prompts.json` template, on: a missing token, `{{` left behind, any digit, a number word before "complaint(s)", or the whole words guarantee, guaranteed, promise, promised, DBKL, MBPJ, Dewan Bandaraya, City Hall.

**Gaps.** "No photo yet" if no grouped complaint has `has_photo`. "Responsible agency not confirmed" if `seed.recipient.confirmed` is false.

**Limits.** Two model calls normally, four max, no SDK retry, 8 s deadline (`cluster` up to 5 s). One run at a time. Release the lock on every path.

**Intake.** Trim, 5 to 400 characters. Lock held: "Agent is busy", store nothing. Exact duplicate of a processed complaint: "Already in". A failed run keeps the old report and leaves the complaint "Not processed". **Retry** is `POST /api/run`. Version rises only when the group or the photo state changes. `last_changed` drives highlights. `POST /api/reset` restores the seed.

```
Complaint  id, text, date, has_photo, channel: web | telegram | seed
Report     report_id, version, place, issue, main_ids, count,
           first_date, latest_date, message_template, gaps,
           recipient: { label, confirmed, source_url }
Store      complaints, report | null, processed_ids, last_changed, last_trace, running
```

One report per deploy (`r_1`).

## Seed

| id | date | text |
|----|------|------|
| c_1 | 10 Nov | Longkang depan perhentian bas Jalan Kerinchi tersumbat, air bertakung dah tiga hari. |
| c_2 | 12 Nov | The drain near the Jalan Kerinchi bus stop is clogged again. Smells terrible. |
| c_3 | 14 Nov | Parit tepi Jalan Kerinchi penuh sampah, nyamuk makin banyak. |
| c_4 | 16 Nov | Drain blocked opposite the bus stop at Kerinchi, water overflowed onto the walkway after the rain. |
| c_5 | 17 Nov | Longkang tersumbat kat Kerinchi tu bila nak clear? Dah seminggu. |

Default sixth: "Longkang depan bus stop Kerinchi melimpah lagi pagi tadi."

## Telegram

`POST /api/telegram` checks `X-Telegram-Bot-Api-Secret-Token` (403 otherwise), answers 200 at once, then handles the update. After deploy, once: `setWebhook?url=<deploy>/api/telegram&secret_token=<secret>`.

| Input | Reply |
|-------|--------|
| `/start` | "Send me a complaint about a local problem. I group repeat reports into one clear report. I cannot promise the council will act." |
| `/report` | Place, count, dates, gaps. |
| Text that joins | "Added. This joins the report on {place}: now {count} complaints." |
| Other issue | "Logged as another issue. It is not part of the drain report." |
| Duplicate | "That complaint is already in." |
| Lock held | "The agent is busy. Send it again in a few seconds." |
| Bad length | "Please write a complaint (5 to 400 characters)." |
| Model down | "The model could not be reached. Your complaint is saved; it will be included in the next run." |
| Photo, no caption | "Add a caption saying what and where." |

Photo with a caption: `has_photo: true`. The photo is not read. Same `addComplaint` as the web, `source: 'telegram'`.

Store text, date, channel. Do not store names, usernames or user ids. `chat_id` is for the reply only and is not saved.

Deploy down: delete the webhook, then `npm run bot:poll` (posts to `localhost:3000/api/complaints`).

## MCP

`POST /api/mcp`, Streamable HTTP, stateless. `Authorization: Bearer <key>` from `AGENCY_KEYS`. No key: 401.

| Tool | Input | Returns |
|------|-------|---------|
| `list_reports` | `{ area?: string }` | report_id, place, issue, count, first_date, latest_date, gaps, version |
| `get_report` | `{ report_id }` | Full report, substituted message, recipient status |
| `list_complaints` | `{ report_id }` | Grouped id, text, date, channel, has_photo |

Demo question: "Which drain problems in Bangsar South have the most complaints and what is missing?"

Stretch, only if ahead at 14:00: `acknowledge_report { report_id, agency, note }` shows "Acknowledged by {agency} (demo)". A label only. The bot tells nobody.

## If you slip

| Clock | What you do |
|-------|-------------|
| 12:10, no key | Build T2 on the scripted model. No key by 13:00: the live run is the recording. |
| 12:30, deploy down | Keep building locally. At 13:40 choose: fix the deploy, or submit the recording and the best URL you have. |
| 13:15, over 8 s | Switch to `qwen3.8-flash`. Three runs again. |
| 13:45, Telegram down | Demo with `npm run bot:poll`. |
| 14:05, MCP down | `curl` `list_reports` plus a slide. Stop at 14:10. |

One replica: `GET /api/state` twice returns the same `version`. Webhook miss: `getWebhookInfo` last error.

Cut in order: acknowledge tool, highlights, channel tags, then MCP. Never cut: code-side count, grow-only group, stop-early, the trace, Retry, the Telegram sixth complaint.

## Sources

- Organiser slides, 19 Nov 2026.
- https://changelog.qoder.com/ide
- https://www.alibabacloud.com/help/en/model-studio/
- https://core.telegram.org/bots/api
- https://modelcontextprotocol.io/specification

# Reportlah API contract (read 19 Nov 2026, 13:30, from the working tree)

Facts only. Source files are in `../../reportlah/` and are read-only for this app.

## Serving

- Reportlah serves this app's production build at `/3d/index.html` on its own origin. Asset paths must be relative (`base: './'`). API calls use absolute-path URLs on the same origin: `/api/state`, not `./api/state`.
- No CORS headers exist on any route. From the Vite dev server, use a dev proxy for `/api` to `VITE_REPORTLAH_URL` (default `http://localhost:3000`; the owner's local instance has also run on 3210).
- The store is in memory, single process. All four browser routes are open (no key).

## Routes a browser may call

| Route | Request | Response |
|---|---|---|
| `GET /api/state` | none | `StateView` (bare) |
| `POST /api/complaints` | JSON `{ text: string, has_photo: boolean }` | `{ outcome, complaint_id, state: StateView, reply: string }`, always HTTP 200 |
| `POST /api/run` | body ignored | `{ ok, error, state: StateView }` |

Never call `POST /api/reset` from this app: it wipes the stage instance. Never call `/api/telegram` or `/api/mcp`.

## Shapes

```ts
type Channel = 'seed' | 'web' | 'telegram'
type Tag = 'in_report' | 'other' | 'not_processed'
type Complaint = { id: string; text: string; date: string; has_photo: boolean; channel: Channel }
type Issue = { key: string; label: string }
type Recipient = { label: string; confirmed: boolean; source_url: string | null }
type ReportView = {
  report_id: string; version: number; place: string; issue: string; main_ids: string[]
  count: number; first_date: string; latest_date: string; message_template: string
  gaps: ('no_photo' | 'agency_unconfirmed')[]; recipient: Recipient; has_photo: boolean
  message: string      // final text, use as is
  period: string       // e.g. '10 Nov to 17 Nov 2026'
  gap_labels: string[] // 'No photo yet', 'Responsible agency not confirmed'
}
type StateView = {
  complaints: (Complaint & { tag: Tag; issue_key: string | null })[]
  issues: Issue[]
  report: ReportView | null   // null until a run has happened
  last_changed: string[]
  last_trace: unknown[]
  running: boolean
  last_error: string | null   // 'model_unavailable' | null
}
type Outcome = 'joined' | 'other' | 'duplicate' | 'invalid' | 'busy' | 'model_unavailable'
```

## Posting a complaint

- Text is trimmed and must be 5 to 400 characters, else `invalid`.
- `has_photo` is only a flag. No file is uploaded. `true` clears the "No photo yet" gap.
- The post runs the live model inline, bounded at about 8 s. No separate `/api/run` is needed after a post. Typical run is about 5 s.
- Outcomes and what the client must do:
  - `joined`: count went up. `reply` is "Added to the report. There are now N complaints."
  - `other`: stored as an unrelated complaint. Report unchanged.
  - `duplicate`: exact same text was already processed. Nothing changed. Show `reply` ("That complaint is already in."). This is what a second demo run with the same text returns, so it must be a calm, expected state, not an error.
  - `busy`: NOT stored. Resend after a short wait.
  - `model_unavailable`: stored but not processed. Show `reply`, offer Retry, which calls `POST /api/run`.
  - `invalid`: show `reply`.
- If `state.report` is null (fresh instance, nobody pressed Generate), call `POST /api/run` once before showing numbers.

## Ranking

Ranking rows are NOT in the API. Derive them exactly as Reportlah's `lib/core/ranking.ts` does:
- One row for the report: label `place + ': ' + issue`, count = complaints tagged `in_report`.
- One row per issue that has at least one complaint tagged `other`: label = issue label, count = those complaints.
- Sort by count descending, then insertion order. Rank is the 1-based position.
Heading on Reportlah's page: "Most reported". Note under it: "Public facility issues, ranked by how many complaints were posted. Counted by the app."

## Seed (what a fresh Reportlah shows)

Area "Bangsar South". Recipient `{ label: 'Local authority', confirmed: false }`. Five drain complaints about the Jalan Kerinchi bus stop, 10 Nov to 17 Nov 2026, none with a photo. After a run: report count 5. A sixth matching complaint makes it 6.

A complaint text that joins the drain report must mention the drain and Kerinchi. Use for Confirm in connected mode:
"The drain by the Jalan Kerinchi bus stop is clogged and water is standing on the walkway."
Grouping is the model's judgement, so `other` is possible and must be handled.

## Telegram

A browser cannot send a Telegram message through Reportlah. The demo's "Open Telegram" stays a prefilled `https://t.me/` link carrying the exact approved message, which in connected mode is `report.message`.

# Laporlah Implementation Plan

> **Status: Superseded (19 Nov 2026).** Reportlah goes on stage instead. See `BLUEPRINT-reportlah.md`.

> **For agentic workers:** this plan is executed on Thu 19 Nov 2026 inside the Qoder IDE (Agent mode), one Agent chat per sub-task (T2b, T2c, T3a, ...). Read Global Constraints and the Shared Contract, then your task. Steps use checkbox (`- [ ]`) syntax. Write the tests and the implementation in one pass, run `npm test`, fix until green. Do not start a dev server (the developer runs it; Next 16 locks a second instance out). Do not add dependencies beyond `openai` and `vitest`. Test files import `describe, it, expect, vi, beforeEach` from `vitest` (no globals).

**Goal:** a localhost Next.js app where one resident photo becomes a draft report, Sahkan merges it into an existing ticket (4 laporan to 5), a new fact creates ticket version 2, and Lulus approves one exact message to one exact recipient before Buka WhatsApp opens a prefilled composer.

**Positioning (Naim, 18 Nov):** the value is that a resident submits a report with one photo, and an agentic workflow with human review hands it to management or a vendor through one integration (WhatsApp). There is no ranking anywhere in the product.

**Architecture:** a pure TypeScript domain core (store, cluster candidates, idempotent confirm, version-bound approval) holds every gate and is pinned by unit tests. Qwen proposes through function calls (observation, route, cluster, message) whose arguments are guarded by code; the model never commits state. Thin route handlers expose the same JSON API the two pages use.

**Tech stack:** Next.js 16.4 (App Router, Turbopack, Cache Components off), TypeScript, Tailwind, Vitest 5, `openai` npm SDK against Model Studio's OpenAI-compatible endpoint, model `qwen3.7-plus`. In-memory store on `globalThis`. Node 24.12 on Windows 11.

**Spec:** `docs/BLUEPRINT.md` inside the app (copied from [BLUEPRINT.md](../../BLUEPRINT.md) revision 2). Where this plan and the spec differ, the difference is listed under "Spec deviations" and this plan wins.

**App directory:** `D:\Hackthon\Rosak\laporlah` (created Thursday). Tonight's inputs live in `D:\Hackthon\Rosak\prep`.

**Status of the facts in this plan:** model ids, endpoint behaviour and Qoder limits come from vendor documentation read on 18 Nov. Nothing has been called with a real key. Task 1 is where they are proven.

## Global Constraints

- BM only in every UI string and every model output. No English toggle.
- Do not build: login, maps, payments, public feed, vendor marketplace, WhatsApp Business API, English toggle, second recipient, MCP, society mode, database.
- One model for everything: `QWEN_MODEL=qwen3.7-plus`. Every request sends `enable_thinking: false` as a top-level body field. Never send `tool_choice: "required"`. Never combine `response_format` with `tools`.
- The only code that talks to the SDK is `lib/agent/client.ts`. The API key is read from `.env.local`, server side, at call time.
- `confirm`, `approve`, `open` and ticket edits are synchronous: after the handler has awaited `params` and the body, there is no `await` between reading and writing the store, and no model call.
- Core functions never mutate a `Report` or `Ticket`; they write a new object with `store.x.set(id, {...old, ...})`.
- `count` is always `report_ids.length`. It is shown as "N laporan", never "N penghuni".
- Status after opening the composer reads "Dibuka di WhatsApp". The words "Delivered" and "Dihantar" never appear.
- A ticket's message never contains the report count, so a merge never invalidates an approval.
- No emoji in any outbound message.
- There is no closed ticket state. "All tickets" means every ticket in the store whatever its `status`.
- Next 16 route handlers: `{ params }: { params: Promise<{ id: string }> }`, then `await params`. Read `node_modules/next/dist/docs/` before guessing an API.
- Server rejects a photo over 5 MB or not `image/*`. Prep photos are already 1280 px.
- Commit after every task with `git commit -m "qoder T<n>: <outcome>"`. Stage by filename.

## Spec deviations (decided here, with reason)

| # | Spec says | Plan does | Reason |
|---|-----------|-----------|--------|
| D1 | Qwen VL model for `see_photo`, Qwen text model for the rest | One model, `qwen3.7-plus`, takes the image and the tools together | Alibaba's Singapore pages list function calling as unsupported on `qwen3-vl-plus`, `qwen-plus`, `qwen-max`, `qwen-flash`. Proven or disproven at smoke S3. |
| D2 | Five routes | Six: adds `POST /api/tickets/:id/open` | Decision 9 needs a "Dibuka di WhatsApp" status and no route sets it. |
| D3 | `POST /api/tickets/:id/facts` takes a fact | Takes exactly one of `{fact}`, `{message}`, `{recipient}` | Rehearsal check 3 (edit text or recipient after Lulus) has no route in the spec. |
| D4 | Clustering happens at Sahkan on a confirmed report | The agent proposes the cluster at draft time; Sahkan commits it in code after re-checking it | The 4-to-5 moment must not wait on a model call, and a synchronous confirm is the simplest double-tap guarantee. |
| D5 | Approve "returns wa.me link" | Link is `https://api.whatsapp.com/send?phone=..&text=..`, base overridable by `WA_BASE` | `wa.me` redirects to that URL and replaces emoji and symbols with U+FFFD on the way. |
| D6 | Checkpoints at 11:50, 12:30, 13:10, 13:45 | 12:30, 13:10, 13:25, 14:00; T6 runs to 14:30 with no code change after 14:15 | The sprint and lunch both start at 11:50; no code may exist earlier. |
| D7 | `Ticket.count`, `Ticket.gaps` stored | Derived in `TicketView` | A stored count is how a double increment happens. |
| D8 | "Capture the Agent history" | Screen recording, Chat History screenshots, one commit per task, `trace.jsonl` | Qoder IDE has no documented chat export. |
| D9 | Seed holds "1 unrelated leak" | It is a rehearsal input (`seed.rehearsal.unrelated_leak`), not a seeded ticket | The seed screen shows exactly two tickets. |
| D10 | Demo phone in the ticket JSON | Phone comes from `DEMO_RECIPIENT_PHONE` in `.env.local` | Keeps a teammate's number out of the submitted repo. |
| D11 | Corridor light photo = "common property"; aircond drip = "unit owner matter" | Both show Pihak bertanggungjawab "Belum disahkan" at intake. The likely owner appears only in Punca disyaki and Tindakan seterusnya. The party changes only after a matching fact such as "Itu koridor bersama." | Decision 11: a photo shows an observation, not a cause. |
| D12 | Upstairs notice "stays a copyable draft" | No second notice. Decision 10 is shown on any new ticket: recipient is null, the card reads "Nombor tiada, draf sahaja", Salin teks works, there is no Lulus. On the ceiling ticket the missing neighbour contact appears as the gap "nombor unit atas tiada" | A second notice is a second recipient, which the spec forbids. |
| D13 | `list_gaps` is a model tool | `list_gaps` is deterministic code, traced with `source: 'code'`. The model has four tools | Its output would cost a model round on stage and the gaps are rule-derived anyway. |
| D14 | `assess_route` output has no urgency | `assess_route` also returns `urgency` | The wiring twist has to turn the ticket Kritikal. |
| D15 | Decision 6 ranks tickets (critical, count, oldest); the key moment includes "rank 2 to rank 1"; the wiring twist "jumps to rank 1" | No ranking. The manager list is in fixed order, oldest `first_seen` first, and never reorders. The key moment is the merge alone: 4 laporan to 5. Urgency is a badge only | Naim's decision, 18 Nov: the pitch is easy submission and a reviewed handoff, not prioritisation. |

Ken's wording follows D4, D13 and D15: "the agent reads the photo, proposes the route and the grouping, and drafts the message; code counts and holds the gates; a person approves before anything goes to management or the vendor." Do not mention ranking or priority order.

## Review Focus

1. Unit typed loosely (`b-11-3`, trailing space): normalised to `B-11-03`; garbage returns 400 with a BM hint. Tests P2, P3.
2. Model returns unparseable or wrong-shape tool arguments: one forced retry per tool, then fallback or 502 with "Cuba semula". Tests L2, L3.
3. A fact is submitted and the ticket is edited before the model answers: the fact write returns 409 and nothing is half-applied. If the ticket was approved meanwhile, the fact still lands and clears that approval. Tests V10, F8.
4. Message containing `&`, `#`, newline or emoji: link stays valid, emoji stripped. Tests M2, M3.
5. Body that is not JSON, or an upload that is not an image: 400 `invalid_input`, never 500. Tests A1, F7.

---

## Shared Contract

Every task implements against these names. They are final.

### Types (`lib/types.ts`)

```ts
export type Urgency = 'low' | 'medium' | 'critical'
export type Party = 'belum_disahkan' | 'pemilik_unit' | 'jmb_mc' | 'pemaju'
export type ToolName = 'see_photo' | 'assess_route' | 'cluster_report' | 'draft_message' | 'list_gaps'

export type PhotoReading = { observation: string; location_hint: string; severity: Urgency; visible_hazards: string[] }
export type Assessment = { suspected_source: string; next_action: string; responsible_party: Party; urgency: Urgency; rule_cited: string | null; reasoning: string }
export type Proposal = { ticket_id: string; reason: string }          // a ticket id or 'new'
export type Recipient = { label: string; phone: string | null }
export type Approval = { version: number; recipient_phone: string; message_hash: string; at: string }
export type ConfirmResult = { report_id: string; ticket_id: string; merged: boolean; count_before: number; count_after: number }

export type Report = {
  id: string; photo_url: string; text: string; unit: string; location: string
  status: 'draft' | 'confirmed'; confirmed_at: string | null; ticket_id: string | null
  reading: PhotoReading | null; assessment: Assessment | null; proposal: Proposal | null
  confirm_result: ConfirmResult | null
}
export type Ticket = {
  id: string; version: number; title: string; location: string
  cluster_key: { block: string; stack: string | null }
  report_ids: string[]; first_seen: string; urgency: Urgency
  observation: string; suspected_source: string; next_action: string
  responsible_party: Party; rule_cited: string | null; facts: string[]
  recipient: Recipient | null; message: string; approval: Approval | null
  status: 'open' | 'approved' | 'opened_in_whatsapp'
}
export type TicketView = Ticket & { count: number; gaps: string[]; wa_url: string | null; rule_text: string | null }

export type Rules = {
  rules: { id: string; text_bm: string; source: string; verified: boolean }[]
  fact_patterns: { id: string; pattern: string; responsible_party?: Party; urgency?: Urgency }[]
}
export type Seed = {
  building: { name: string; block: string }
  reports: Report[]; tickets: Ticket[]; next_report_seq: number; next_ticket_seq: number
  rehearsal: { unrelated_leak: { unit: string; text: string }; expected: unknown }
}
export type Store = { reports: Map<string, Report>; tickets: Map<string, Ticket>; next_report_seq: number; next_ticket_seq: number }

export type TraceStep = { step: number; tool: ToolName; source: 'llm' | 'code' | 'fallback'; forced: boolean; input: unknown; output: unknown; ms: number }
export type ErrCode = 'not_found' | 'invalid_input' | 'stale_version' | 'not_approved' | 'missing_recipient'
export class DomainError extends Error { constructor(public code: ErrCode, public extra: Record<string, unknown> = {}) { super(code) } }
export class AgentError extends Error {}
```

### HTTP helpers (`lib/http.ts`)

- `fail(e: unknown): Response`. Body `{ error: code, ...extra }`. `not_found` 404, `invalid_input` 400, `stale_version` 409 (extra `current_version`), `not_approved` 409, `missing_recipient` 422, `AgentError` 502 with `error: 'model_unavailable'`, anything else 500 and `console.error`.
- `readJson(req: Request): Promise<Record<string, unknown>>`. Throws `DomainError('invalid_input')` when the body is not a JSON object.

### API

| Route | Request | Success | Errors |
|---|---|---|---|
| `POST /api/reports` | multipart `photo` (File), `unit`, `text` (optional) | 201 `{ report, trace }`, `report.photo_url` blanked | 400, 502 |
| `POST /api/reports/[id]/confirm` | none | 200 `ConfirmResult & { already_confirmed: boolean; ticket: TicketView }`. A repeat confirm is 200 with the stored result and `already_confirmed: true` | 404 |
| `GET /api/tickets` | none | 200 `{ tickets: TicketView[] }` in list order; `export const dynamic = 'force-dynamic'` | none |
| `POST /api/tickets/[id]/facts` | exactly one of `{ fact: string }`, `{ message: string }`, `{ recipient: Recipient }` | 200 `{ ticket: TicketView, trace: TraceStep[] }` (`trace` is `[]` for edits) | 400, 404, 409 `stale_version`, 502 |
| `POST /api/tickets/[id]/approve` | `{ version: number }` | 200 `{ ticket: TicketView, wa_url: string }`. Re-approving the approved current version returns the same 200 | 400, 404, 409 `stale_version`, 422 |
| `POST /api/tickets/[id]/open` | `{ version: number }` | 200 `{ ticket: TicketView }`, status `opened_in_whatsapp` | 400, 404, 409 `not_approved` |

### Rules in code

- **List order:** `first_seen` ascending, then `id` ascending. Nothing else affects order; there is no rank field.
- **Cluster candidates for a unit:** every ticket in the store, whatever its status, whose `cluster_key.block` and `cluster_key.stack` both equal the unit's block and stack.
- **`isApproved(t)`:** `approval` is non-null, `approval.version === t.version`, `approval.recipient_phone === t.recipient?.phone`, and `approval.message_hash === hashMessage(t.message)`. `wa_url` is non-null only when `isApproved(t)`.
- **Version:** a fact, a changed message, or a changed recipient sets `version + 1`, `approval = null`, `status = 'open'`. An edit with identical values changes nothing.
- **Merge:** changes `report_ids` and may raise `urgency`. Never touches `version` or `approval`. Never appends an id already present.
- **Responsible party:** the `responsible_party` of the first `fact_patterns` entry (that has one) matching any fact of the ticket. When none matches it is `belum_disahkan`, whatever the model said. At intake there are no facts, so it is always `belum_disahkan`.
- **Urgency from facts:** a fact matching a `fact_patterns` entry with `urgency: 'critical'` forces `critical`.
- **Urgency at intake:** `critical` only when the model's own urgency is `critical` and a critical pattern matches the resident text or a visible hazard. Otherwise the model's value with `critical` clamped to `medium`.
- **Urgency never falls:** `addFact` and a merge set urgency to the higher of the old and new values (`low < medium < critical`).
- **`rule_cited`** survives only if it is the id of a `verified: true` rule; otherwise null. `TicketView.rule_text` is that rule's `text_bm`.
- An invalid regex in `rules.json` is skipped with `console.error`, never thrown.

### Environment (`.env.local`)

`DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL=qwen3.7-plus`, `QWEN_TIMEOUT_MS=15000`, `AGENT_MODE=loop` (or `forced`), `DEMO_RECIPIENT_PHONE=60XXXXXXXXX`, `WA_BASE=https://api.whatsapp.com/send`.

### BM copy (`lib/copy.ts`, one exported `COPY` object)

Ambil gambar · Unit anda · Keterangan (pilihan) · Hantar untuk draf · Draf laporan · Pemerhatian · Punca disyaki · Tindakan seterusnya · Pihak bertanggungjawab · Belum disahkan · Pemilik unit · JMB / MC · Pemaju · Akan digabung dengan: {title} · Tiket baharu · Sahkan · Laporan disahkan · Digabung: {a} → {b} laporan · Tiket baharu dibuka · {n} laporan · Kritikal · Sederhana · Rendah · Fakta baharu · Kemas kini · Versi {n} · Penerima · Mesej · Simpan · Simpan dahulu · Lulus (versi {n}) · Diluluskan (versi {n}) · Perlu kelulusan semula · Buka WhatsApp · Dibuka di WhatsApp · Salin teks · Nombor tiada, draf sahaja · Maklumat belum lengkap · Jejak ejen · Cuba semula · Model tidak dapat dihubungi · Format unit tidak sah, contoh B-11-03 · Gambar tidak sah atau melebihi 5 MB · Tiket telah berubah, cuba semula.

---

## Schedule

| Time | Task | Done when |
|---|---|---|
| Tonight | T0 | `prep/` complete and shape-checked, dry run done, machine ready |
| 11:00 to 11:50 | T1 | Briefing answers recorded; smoke S1 to S4 run or the no-key branch chosen |
| 11:50 to 12:30 | T2 | `npm test` green on the core; `/manager` lists two tickets, both "4 laporan" |
| 12:30 to 13:10 | T3 | Ceiling photo in, draft out with four separate fields, proposal `t_1`, visible trace |
| 13:10 to 13:25 | T4 | Sahkan: 4 to 5 laporan, shown on both screens; double tap stays 5; `npm run build` green |
| 13:25 to 14:00 | T5 | Fact makes version 2; stale approve is 409; edit clears approval; composer opens; build green |
| 14:00 to 14:30 | T6 | Rehearsal checks pass on `next start`; run recorded; trace saved. No code change after 14:15 |
| 14:30 to 14:45 | T7 | Submitted |

Lunch is eaten while the agent runs T2b. Do not queue for it.

**Triggers.**
- T2 not green by 12:35: skip manager styling and move on.
- T3 not live by 13:15: start T4 against a draft created by `draft()` through a temporary dev route, return to live verification after T4.
- T5 not green by 14:05: ship without the message and recipient edit UI; show the stale-approval gate through the fact path and run the edit checks with `curl.exe`.

**Cut order if still behind** (minutes it frees):
1. Recipient edit UI; the route stays and the T6 recipient check runs as `curl.exe -X POST http://localhost:3000/api/tickets/t_1/facts -H "Content-Type: application/json" -d "{\"recipient\":{\"label\":\"Kontraktor paip (demo)\",\"phone\":\"60111111111\"}}"` followed by a GET showing `wa_url: null` (4).
2. `TracePanel` component; render the trace in a `<details><pre>` block (3).
3. Message edit UI, same curl approach with `{"message":"..."}` (4).

Never cut the merge and its "4 → 5 laporan" highlight on the manager screen, the version-bound approval, tests C3, C4, H2, V2, V4, F8, or `trace.jsonl`.

**Latency rule.** Client timeout is `max(15000, 3 × the S3 wall time)`. S3 over 8 s, or intake over 12 s at T3: set `QWEN_MODEL=qwen3.8-flash` and retest before going further.

---

### Task 0: Tonight's prep (no app code)

**Files (all under `D:\Hackthon\Rosak\prep\`):** `tools.json`, `prompts.json`, `seed.json`, `rules.json`, `agents-additions.md`, `smoke.sh`, `check-seed.mjs`, `photos/`

- [ ] **Step 1: `tools.json`.** Four OpenAI-shape tools (`{type:'function', function:{name, description, parameters}}`), `additionalProperties: false`, every property required.

| Tool | Parameters (the model's decision) | Description must state |
|---|---|---|
| `see_photo` | `observation` string, `location_hint` string, `severity` enum low/medium/critical, `visible_hazards` string[] | Describe only what is visible. List a hazard only if it is visible in the photo. |
| `assess_route` | `suspected_source` string, `next_action` string, `responsible_party` enum of the four `Party` values, `urgency` enum, `rule_cited` string (a rule id or `"tiada"`), `reasoning` string | responsible_party is belum_disahkan unless FACTS contains an inspection finding. |
| `cluster_report` | `ticket_id` string, `reason` string | ticket_id is exactly one candidate id from CONTEXT, or `"new"`. Choose a candidate when the observation describes the same kind of fault at the same location; choose new only for a different kind of fault. |
| `draft_message` | `text` string | Plain BM text, no emoji, under 120 words, addressed to the recipient label, never states a report count. |

- [ ] **Step 2: `prompts.json`** with keys `system`, `intake`, `intake_no_candidates`, `replan_assess`, `replan_draft`, `vision_json`.

`system`, verbatim:

> You are Laporlah, an intake agent for Malaysian strata buildings. Act only by calling tools; never answer in plain text. Write every string value in Bahasa Malaysia. A photo shows an observation, never a cause: keep responsible_party as belum_disahkan until a fact in FACTS states an inspection finding. Set urgency to critical only for a visible electrical, fire or structural hazard. Cite only rule ids listed in RULES, otherwise use tiada. Never invent a phone number, name or regulation. RULES: {{rules}}

- `intake`: "Call see_photo, then assess_route, then cluster_report, in one turn if you can. CONTEXT: {{context}}"
- `intake_no_candidates`: "Call see_photo, then assess_route, in one turn if you can. CONTEXT: {{context}}"
- `replan_assess`: "A new fact arrived. Reassess with assess_route. CONTEXT: {{context}}"
- `replan_draft`: "Write the message to the recipient with draft_message, based on TICKET exactly as given. CONTEXT: {{context}}"
- `vision_json`: "Balas dalam JSON sahaja dengan kunci observation, location_hint, severity (low, medium atau critical), visible_hazards (senarai). CONTEXT: {{context}}"

`{{rules}}` is the verified rules as JSON; `{{context}}` is a JSON object described in T3.

- [ ] **Step 3: `seed.json`.** Naim writes the whole file tonight with every structural field present. Syeeda edits string values only (titles, texts, observations, messages) and fills `rehearsal.expected`. Structure:
  - `tickets[0]`: id `t_1`, title "Siling bocor, Blok B stack 03", `location` "Blok B, stack 03, aras 11 hingga 12", `cluster_key {block:'B', stack:'03'}`, `report_ids ['r_1','r_2','r_3','r_4']`, `first_seen 2026-11-17T09:00:00+08:00`.
  - `tickets[1]`: id `t_2`, title "Paip bocor di tempat letak kereta B2", `location` "Blok B, tempat letak kereta B2", `cluster_key {block:'B', stack:null}`, `report_ids ['r_101','r_102','r_103','r_104']`, `first_seen 2026-11-16T09:00:00+08:00`.
  - Both tickets: `version 1`, `urgency 'medium'`, `responsible_party 'belum_disahkan'`, `suspected_source 'belum disahkan'`, `rule_cited null`, `facts []`, `approval null`, `status 'open'`, `recipient {label:'Kontraktor paip (demo)', phone:null}`, a written BM message with no digit followed by " laporan".
  - `reports`: `r_1..r_4` (ceiling, units `B-11-03`, `B-12-03`, `B-10-03`, `B-11-03`; mixed BM and EN text) and `r_101..r_104` (car park, unit of the reporter). All `status 'confirmed'`, `confirmed_at` set, `ticket_id` set, `photo_url ''`, `reading`, `assessment`, `proposal`, `confirm_result` null.
  - `next_report_seq 5`, `next_ticket_seq 3`.
  - `rehearsal.unrelated_leak {unit:'A-05-07', text:'Siling dapur bocor'}`.
  - Tell Syeeda: expected outputs follow D11 and D12. All three photos read "Belum disahkan" at intake. The neighbour-abroad twist expects: next action mentions inspecting accessible areas and a Monday follow-up, gaps include "nombor unit atas tiada" and "pemeriksaan belum dibuat", party Belum disahkan.

- [ ] **Step 4: `rules.json`.** Isyraf fills `rules` with one entry per statement checked against P.U.(A) 107/2015 (ids like `reg57_pemeriksaan`, `reg59_borang28`). Anything unchecked ships as `verified: false` and is never cited; Reg 58 stays `verified: false` until he confirms it. `fact_patterns` is exactly this (case-insensitive regex source):

```json
[
  { "id": "paip_dikongsi", "pattern": "paip.*(dikongsi|berkongsi|bersama)", "responsible_party": "jmb_mc" },
  { "id": "harta_bersama", "pattern": "koridor|harta bersama|kawasan bersama", "responsible_party": "jmb_mc" },
  { "id": "elektrik", "pattern": "wayar|elektrik|litar pintas|kebakaran", "urgency": "critical" }
]
```

- [ ] **Step 5: `agents-additions.md`**: the Global Constraints section of this plan, verbatim.

- [ ] **Step 6: `smoke.sh`** (Git Bash). Each call writes its body to a file and posts the file, because an inline base64 photo exceeds the Windows command-line limit:

```bash
B64=$(base64 -w0 photos/siling.jpg)
printf '{"model":"%s","enable_thinking":false,"messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,%s"}},{"type":"text","text":"Terangkan gambar ini dalam satu ayat."}]}]}' "$MODEL" "$B64" > s1.json
curl -s -o s1.out -w '%{http_code} %{time_total}\n' "$BASE/chat/completions" -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' --data-binary @s1.json
```

  - S1 vision, as above. Pass: 200 and a BM sentence about a ceiling.
  - S2 forced tool, text only: `tools` = `assess_route`, `tool_choice: {"type":"function","function":{"name":"assess_route"}}`. Pass: `finish_reason "tool_calls"`, arguments parse, enum valid.
  - S3 image plus tools, `tool_choice "auto"`, tools = `see_photo`, `assess_route`, `cluster_report`, user text = the `intake` prompt with a context naming candidate `t_1`. Pass: `see_photo` is called. Note how many tool calls arrive in one turn and the wall time.
  - S4 image plus `response_format {"type":"json_object"}`, no tools, the `vision_json` prompt. Pass: content parses as JSON with the four keys.
  - `BASE` order to try: the workspace API Host given at the event, then `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. A 401 `invalid_api_key` means wrong region: change `BASE`, not the key. A 400 naming `tool_choice` and thinking means `enable_thinking` did not reach the server.
  - Tonight: run all four with `KEY=wrong`. Each must return 401, which proves the bodies are well formed. If anyone on the team has a Singapore Model Studio key, run it for real and record the results.

- [ ] **Step 7: `check-seed.mjs`**, run with `node prep/check-seed.mjs`. It throws unless: all four JSON files parse; exactly 2 tickets with ids `t_1`, `t_2`; each has 4 `report_ids`, `version 1`, array `facts`, `approval null`, `status 'open'`, `recipient.phone null`, a non-empty message not matching `/\d+ laporan/`; `t_1.cluster_key` is `{B,'03'}` and `t_2.cluster_key.stack` is null; 8 reports, each confirmed with a `ticket_id` whose ticket lists it; every `fact_patterns[].pattern` compiles with `new RegExp(p, 'i')`.

- [ ] **Step 8: dry run** in `$env:TEMP` (warms the npm cache; it is deleted afterwards and is not app code). Run the T2 Step 1 commands, add `vitest.config.mts`, a file exporting the `sanitizeMessage` regex from the T2 contract, and one trivial test importing through `@/`. Run `npm test`, `npm run typecheck`, `npm run build`. Note the wall time. If the regex literal fails typecheck or build, the contract line becomes `new RegExp('[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\p{Emoji_Modifier}\\u{FE0F}\\u{200D}\\u{20E3}]', 'gu')`. Delete the folder.

- [ ] **Step 9: machine.** Qoder updated to 1.40.1 and signed in. `node -v` is 22.12 or later. WhatsApp Web logged in on the stage browser. The demo number is a live WhatsApp account. Photos in `prep/photos/` (`siling.jpg`, `lampu-koridor.jpg`, `aircond.jpg`) are JPEG, 1280 px long side, under 1 MB. Screen recorder tested (Win+Alt+R). Teammates' Qoder accounts signed in on their own machines as standby.

---

### Task 1: Briefing and account check (11:00 to 11:50)

- [ ] **Step 1: ask and write down** in `prep/briefing.md`: may prepared prompts, seed data and a written plan be used; scoring weights; pitch length; submission format (repo, video, social post?); Model Studio region and workspace API Host; when Model Studio keys are issued; Qoder Credits per account; whether switching Qoder accounts on the build laptop is allowed.
- [ ] **Step 2: run `smoke.sh`.** Record `BASE`, model and the four wall times. Set `QWEN_TIMEOUT_MS` by the latency rule.
- [ ] **Step 3: decide.**
  - S1 to S3 pass: `AGENT_MODE=loop`.
  - S3 fails, S1, S2 and S4 pass: `AGENT_MODE=forced`.
  - S1 fails: retry with a photo under 300 KB, then the next model.
  - S2 fails (forced `tool_choice` rejected with thinking off): the forced call sends `tool_choice: 'auto'` with a one-tool list instead. Note it for T3a.
  - `qwen3.7-plus` not found or 403: rerun all four with `qwen3.8-flash`, then `qwen4-max`.
  - No key by 11:50: T2 as planned. T3a builds and passes its tests with the scripted `chatFn`. Run `smoke.sh` the minute the key arrives. No working key by 13:00: do T4 and T5 first against a `draft()`-made report and tell Ken the photo step will be the recording.
  - Prepared files not allowed, written plan allowed: Syeeda and Isyraf retype `seed.json` and `rules.json` into the repo from 11:50 while T2b runs on `testSeed`; the agent generates `agent/tools.json` and `agent/prompts.json` from T0 Steps 1 and 2 in T3a.
  - The plan itself not allowed: stop and re-plan against the organisers' wording.
  - Qoder Credits at or under 300 per account: Auto tier for T2b, T3a and T5a; Qwen3.8-Flash for T2c, T3b, T4 and every fix-up.

---

### Task 2: Scaffold and domain core (11:50 to 12:30)

**Files:**
- Create: `lib/types.ts`, `lib/store.ts`, `lib/http.ts`, `lib/copy.ts`, `lib/core/reports.ts`, `lib/core/tickets.ts`, `lib/core/message.ts`, `lib/core/guards.ts`, `lib/core/test-seed.ts`, `app/api/tickets/route.ts`, `app/manager/page.tsx`, `vitest.config.mts`
- Test: `lib/core/reports.test.ts`, `lib/core/tickets.test.ts`, `lib/core/message.test.ts`, `lib/core/guards.test.ts`, `lib/store.test.ts`

**Interfaces produced:**

```ts
// lib/store.ts
buildStore(seed: Seed): Store            // fills null recipient phones from DEMO_RECIPIENT_PHONE when it matches /^60\d{9,10}$/; passes every message through sanitizeMessage
getStore(): Store                        // globalThis.__laporlah ??= buildStore(structuredClone(seedJson as unknown as Seed))
resetStore(seed?: Seed): void            // globalThis.__laporlah = seed ? buildStore(seed) : undefined
loadRules(): Rules                       // rulesJson as unknown as Rules
// lib/core/reports.ts
parseUnit(unit: string): { unit: string; block: string; level: string; stack: string }   // trims, uppercases, pads to B-11-03; throws invalid_input
clusterCandidates(unit: string, ts: Ticket[]): Ticket[]
createDraft(s: Store, d: Pick<Report, 'photo_url' | 'text' | 'unit' | 'location' | 'reading' | 'assessment' | 'proposal'>): Report
confirmReport(s: Store, id: string, now: string): ConfirmResult & { already_confirmed: boolean }
// lib/core/tickets.ts
isApproved(t: Ticket): boolean
listGaps(t: Ticket, rules: Rules): string[]
toView(t: Ticket, rules: Rules): TicketView
viewAll(s: Store, rules: Rules): TicketView[]          // sorted copy in list order (first_seen ascending, then id)
addFact(s: Store, id: string, expectedVersion: number, fact: string, a: Assessment, message: string): Ticket
editTicket(s: Store, id: string, p: { message?: string; recipient?: Recipient }): Ticket
approveTicket(s: Store, id: string, version: number, now: string): Ticket
markOpened(s: Store, id: string, version: number): Ticket
// lib/core/message.ts
hashMessage(text: string): string        // sha256 hex of the exact UTF-8 string, node:crypto
waLink(phone: string, text: string, base?: string): string   // `${base}?phone=${phone}&text=${encodeURIComponent(text)}`; base defaults to WA_BASE, then https://api.whatsapp.com/send
sanitizeMessage(text: string): string    // removes /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u{FE0F}\u{200D}\u{20E3}]/gu, collapses runs of spaces, trims, caps at 900 chars
templateMessage(t: Ticket): string
// lib/core/guards.ts
matchPattern(texts: string[], rules: Rules, want: 'responsible_party' | 'urgency'): Rules['fact_patterns'][number] | null   // first entry having that key whose regex matches any text
guardPhoto(raw: unknown): PhotoReading                                        // throws Error when observation is missing or empty; invalid severity becomes 'medium'; non-array hazards become []
guardAssessment(raw: unknown, ctx: { facts: string[]; intakeTexts: string[] }, rules: Rules): Assessment   // throws Error when suspected_source or next_action is missing; applies the party, urgency and rule_cited rules
guardProposal(raw: unknown, candidateIds: string[]): Proposal                 // trims and lowercases ticket_id; a candidate id or the literal 'new' is returned; anything else throws Error
guardMessage(raw: unknown, t: Ticket): string                                 // sanitize; under 40 chars becomes templateMessage(t)
```

Details the signatures do not settle:
- `guardAssessment` urgency: if a critical pattern matches any of `ctx.facts`, `critical`. Else if raw urgency is `critical` and a critical pattern matches any of `ctx.intakeTexts`, `critical`. Else raw urgency with `critical` clamped to `medium` and an invalid value treated as `medium`.
- `confirmReport`:
  1. Unknown id throws `not_found`.
  2. `report.status === 'confirmed'` returns the stored `confirm_result` with `already_confirmed: true`. When `confirm_result` is null (seed reports), return `{report_id, ticket_id: report.ticket_id, merged: true, count_before: n, count_after: n}` from the ticket's current count.
  3. Target is `report.proposal.ticket_id` if that id is among `clusterCandidates(report.unit, all tickets)`; otherwise (including a null proposal) a new ticket.
  4. Record `count_before` (0 for a new ticket).
  5. Merge: append the report id, urgency is the higher of the two. New ticket: `{ id: 't_' + next_ticket_seq++, version 1, title and observation from reading.observation, location report.location, cluster_key {block, stack} from parseUnit(report.unit), report_ids [report.id], first_seen now, urgency, suspected_source, next_action, responsible_party, rule_cited from assessment, facts [], recipient null, message templateMessage, approval null, status 'open' }`.
  6. The report becomes `confirmed` with `confirmed_at`, `ticket_id`, `confirm_result`.
- `createDraft`: id `'r_' + next_report_seq++`, `status 'draft'`.
- `addFact`: throws `stale_version` (extra `current_version`) when `ticket.version !== expectedVersion`. Otherwise version + 1, fact appended, `suspected_source`, `next_action`, `responsible_party`, `rule_cited` from the assessment, urgency the higher of old and new, message set, approval null, status open.
- `approveTicket`: `invalid_input` when `version` is not an integer; `stale_version` when it is not the current version; `missing_recipient` when `recipient?.phone` is null; already approved at this version returns the ticket unchanged.
- `markOpened`: `invalid_input` when `version` is not an integer; `not_approved` unless `isApproved(t)` and `version === t.version`.
- `editTicket`: a recipient phone that is neither null nor `/^60\d{9,10}$/` throws `invalid_input`; a message is passed through `sanitizeMessage` and an empty result throws `invalid_input`.
- `listGaps`, in this order: no recipient phone gives "nombor penerima tiada"; no fact matching a `responsible_party` pattern and no fact matching `/pemeriksaan|diperiksa|borang 28/i` gives "pemeriksaan belum dibuat"; `/unit atas|jiran/i` in `suspected_source` or any fact gives "nombor unit atas tiada".
- `templateMessage`: `` `Salam ${t.recipient?.label ?? 'pihak pengurusan'}. Laporan di ${t.location}: ${t.observation} Punca disyaki: ${t.suspected_source}. Tindakan dicadangkan: ${t.next_action}. Terima kasih.` ``
- `lib/core/test-seed.ts` exports:
  - `testSeed(): Seed`. Same ids, cluster keys, `first_seen` values and seq numbers as T0 Step 3. Both tickets: recipient `{label:'Kontraktor paip (demo)', phone:'60123456789'}`, `observation 'Kesan air pada siling.'`, `suspected_source 'belum disahkan'`, `next_action 'JMB selaras pemeriksaan'`, message `'Salam. Mohon periksa kebocoran di lokasi ini. Terima kasih.'`.
  - `testRules(): Rules`. The three `fact_patterns` from T0 Step 4, rule `{id:'reg57_pemeriksaan', text_bm:'Pengurusan memeriksa petak terlibat.', source:'ujian', verified:true}` and rule `{id:'reg58', ..., verified:false}`.
  - `draft(s: Store, unit: string, proposalTicketId: string | null): Report`. Calls `createDraft` with reading `{observation:'Kesan air pada siling.', location_hint:'', severity:'medium', visible_hazards:[]}`, assessment `{suspected_source:'belum disahkan', next_action:'JMB selaras pemeriksaan', responsible_party:'belum_disahkan', urgency:'medium', rule_cited:null, reasoning:''}`, and the proposal (null when the argument is null).

- [ ] **Step 1 (developer, by hand, PowerShell in `D:\Hackthon\Rosak`):**

```powershell
npx.cmd --yes create-next-app@16.4.6 laporlah --ts --tailwind --eslint --app --no-src-dir --no-react-compiler --no-cache-components --use-npm --no-agent-feedback --yes
cd laporlah
Get-Content next.config.ts          # must NOT contain cacheComponents: true
npm install openai
npm install -D vitest
npm pkg set scripts.test="vitest run" scripts.typecheck="tsc --noEmit"
New-Item -ItemType Directory agent, docs, public\demo, evidence
Copy-Item ..\prep\seed.json, ..\prep\rules.json .
Copy-Item ..\prep\tools.json, ..\prep\prompts.json agent
Copy-Item ..\prep\photos\*.jpg public\demo
Copy-Item ..\docs\plans\2026-11-18-laporlah-build-plan.md docs\plan.md
Copy-Item ..\BLUEPRINT.md docs\BLUEPRINT.md
Add-Content AGENTS.md (Get-Content ..\prep\agents-additions.md)
```

Create `.env.local` by hand and add `trace.jsonl` to `.gitignore`. Then File, Open Folder, `D:\Hackthon\Rosak\laporlah` in Qoder, and start chat T2b with `@docs/plan.md`.

- [ ] **Step 2 (T2b, agent): `vitest.config.mts`** with `resolve.alias['@']` set to `fileURLToPath(new URL('.', import.meta.url))` and `test.environment: 'node'`. Then the tests and the core. Every test starts from `resetStore(testSeed())` and `const s = getStore()`; rules come from `testRules()`.

*reports.test.ts*
- P1 `parseUnit('B-11-03')` equals `{unit:'B-11-03', block:'B', level:'11', stack:'03'}`.
- P2 `parseUnit(' b-11-3 ')` equals the same object.
- P3 `parseUnit('rumah saya')` throws `DomainError` with code `invalid_input`.
- C1 `clusterCandidates('B-11-03', tickets)` ids equal `['t_1']`.
- C2 `clusterCandidates('A-05-07', tickets)` equals `[]`.
- C3 `confirm merges`: `draft(s,'B-11-03','t_1')` then `confirmReport` returns `{report_id:'r_5', ticket_id:'t_1', merged:true, count_before:4, count_after:5, already_confirmed:false}`.
- C4 `second confirm is a no-op`: returns `already_confirmed:true` with `count_after 5`; `t_1.report_ids.length` is 5; `confirmed_at` unchanged.
- C5 `unrelated block opens a new ticket`: `draft(s,'A-05-07','new')` confirms to `ticket_id:'t_3'`, `merged:false`, `count_before:0`, `count_after:1`; `viewAll` ids are `['t_2','t_1','t_3']`; `t_3.cluster_key` equals `{block:'A', stack:'07'}`, `t_3.recipient` is null; `t_1` still has 4.
- C6 `a proposal naming a non-candidate ticket opens a new ticket`: `draft(s,'A-05-07','t_1')` confirms to `t_3`. A null proposal does the same.
- C7 `merge after approval`: approve `t_1` v1, confirm `draft(s,'B-11-03','t_1')`; `merged` is true, `t_1.report_ids.length` is 5, `isApproved(t_1)` is still true, version is 1.
- C8 `unknown report id throws not_found`.
- C9 `confirming seed report r_1` returns `already_confirmed:true`, `count_after 4`; `t_1.report_ids.length` stays 4.
- C10 `second report from the new ticket's unit merges`: after C5, `draft(s,'A-05-07','t_3')` confirms with `merged:true`, `count_after 2`.

*tickets.test.ts* (`A` = the `draft` helper's assessment)
- V1 `addFact`: version 2, fact appended, approval null, status `open`, `responsible_party` from the assessment passed in.
- V2 `approving a stale version throws stale_version with current_version 2`, approval stays null.
- V3 `approve stores version, phone and hash`: `approval` equals `{version:1, recipient_phone:'60123456789', message_hash: hashMessage(t.message), at: now}`, status `approved`, `toView(...).wa_url` equals `waLink('60123456789', t.message)`.
- V4 `message edit after approve`: version 2, `isApproved` false, `wa_url` null.
- V5 `recipient edit after approve`: same.
- V6 `identical edit keeps version and approval`.
- V7 `approve with a null phone throws missing_recipient`.
- V8 `markOpened before approval throws not_approved`; after approval status is `opened_in_whatsapp`.
- V9 `re-approving the approved current version changes nothing` (same `approval.at`).
- V10 `addFact with a stale expectedVersion throws stale_version and leaves the ticket untouched`.
- V11 `editTicket with phone '0123456789' throws invalid_input`.
- V12 `listGaps`: `t_1` with a null phone gives `['nombor penerima tiada','pemeriksaan belum dibuat']`; with fact "Jiran atas di luar negara sampai Isnin." and a phone gives `['pemeriksaan belum dibuat','nombor unit atas tiada']`; with fact "Pemeriksaan mendapati paip yang dikongsi beberapa unit bocor." and a phone gives `[]`.
- V13 `urgency never falls`: `addFact` with a `medium` assessment on a ticket set to `critical` leaves it `critical`.
- V14 `a critical fact sets the badge and never reorders`: `addFact` on `t_1` with an assessment of urgency `critical` gives `t_1.urgency 'critical'`; `viewAll` ids are still `['t_2','t_1']`. A merge that takes `t_1` to 5 reports leaves the order unchanged too, and `viewAll` does not mutate the store's order.

*message.test.ts*
- M1 `hashMessage('abc')` equals `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.
- M2 `waLink('60123456789','A & B\nC #1','https://api.whatsapp.com/send')` equals `https://api.whatsapp.com/send?phone=60123456789&text=A%20%26%20B%0AC%20%231`.
- M3 `sanitizeMessage('Paip bocor ⚠️ segera 🇲🇾 👍🏽')` equals `'Paip bocor segera'`; a 2000-char input returns 900 chars.
- M4 `templateMessage(t_1)` contains `t_1.location` and `t_1.next_action` and does not match `/\d+ laporan/`.

*guards.test.ts*
- G1 `no facts forces belum_disahkan` when raw says `jmb_mc`.
- G2 `fact "Pemeriksaan mendapati paip yang dikongsi beberapa unit bocor." yields jmb_mc` when raw says `pemilik_unit`.
- G3 `rule ids`: `'reg58'`, `'reg999'`, `'tiada'` become null; `'reg57_pemeriksaan'` survives.
- G4 `fact "Ada wayar elektrik dekat kebocoran." with raw urgency medium returns critical`.
- G5 `intake`: raw `critical` with `intakeTexts ['siling bocor']` returns `medium`; raw `medium` with `intakeTexts ['risiko elektrik']` returns `medium`; raw `critical` with `intakeTexts ['wayar terdedah']` returns `critical`.
- G6 `guardPhoto` with `severity:'teruk'` returns `medium`; with no observation it throws.
- G7 `guardProposal`: `({ticket_id:'t_9'}, ['t_1'])` throws; `({ticket_id:' T_1 '}, ['t_1'])` returns `t_1`; `({ticket_id:'new'}, ['t_1'])` returns `new`.
- G8 `guardMessage({text:'ok'}, t_1)` returns `templateMessage(t_1)`.
- G9 `fact "Jiran atas di luar negara sampai Isnin." with raw pemilik_unit returns belum_disahkan`.
- G10 `a rules entry with pattern '(' is skipped without throwing`.

*store.test.ts*
- SD1 `seed.json loads`: `viewAll(buildStore(seedJson as unknown as Seed), loadRules())` has exactly 2 tickets, ids `['t_2','t_1']`, both `count 4`.
- SD2 `resetStore(testSeed())` then `getStore()` has `t_1.recipient.phone === '60123456789'`.

- [ ] **Step 3 (T2c, agent): `GET /api/tickets`** returns `{ tickets: viewAll(getStore(), loadRules()) }` with `force-dynamic`. `app/manager/page.tsx` is a `'use client'` page that fetches it with `cache: 'no-store'` every 2000 ms and renders one card per ticket in the order received: title, urgency badge, "N laporan", version. Controls come in T5.
- [ ] **Step 4: verify.** `npm test` green; `npm run typecheck` clean. Developer starts `npm run dev` and opens `http://localhost:3000/manager`: car park listed first, then ceiling, both "4 laporan". `curl.exe http://localhost:3000/api/tickets` shows a non-null `recipient.phone` on `t_1`; if it is null, fix `DEMO_RECIPIENT_PHONE` in `.env.local` and restart the server (the `globalThis` store survives hot reload).
- [ ] **Step 5: commit** `qoder T2: domain core with tests, tickets on /manager`.

---

### Task 3: Agent and draft intake (12:30 to 13:10)

**Files:**
- Create: `lib/agent/client.ts`, `lib/agent/loop.ts`, `lib/agent/trace.ts`, `app/api/reports/route.ts`, `app/page.tsx`, `components/TracePanel.tsx`
- Test: `lib/agent/loop.test.ts`, `app/api/reports/route.test.ts`

**Interfaces:**
- Consumes: T2 guards, `createDraft`, `clusterCandidates`, `parseUnit`, `listGaps`, `templateMessage`, `loadRules`, types.
- Produces:

```ts
// lib/agent/client.ts
type ChatBody = { messages: unknown[]; tools?: unknown[]; tool_choice?: unknown; response_format?: { type: 'json_object' } }
type ToolCall = { id: string; name: string; arguments: string }
type ChatReply = { content: string | null; tool_calls: ToolCall[]; raw_message: unknown }
type ChatFn = (body: ChatBody) => Promise<ChatReply>
chat: ChatFn
// lib/agent/loop.ts
type IntakeInput = { photo_data_url: string; text: string; unit: string; location: string; candidates: Ticket[] }
type IntakeResult = { reading: PhotoReading; assessment: Assessment; proposal: Proposal; trace: TraceStep[] }
type ReplanInput = { ticket: Ticket; fact: string }
type ReplanResult = { assessment: Assessment; message: string; gaps: string[]; trace: TraceStep[] }
type Deps = { chatFn?: ChatFn; rules?: Rules }           // defaults: chat, loadRules()
runIntake(input: IntakeInput, deps?: Deps): Promise<IntakeResult>
runReplan(input: ReplanInput, deps?: Deps): Promise<ReplanResult>
// lib/agent/trace.ts
saveTrace(label: string, steps: TraceStep[]): void   // appends one JSON line {label, at, steps} to ./trace.jsonl; never throws; no-op when process.env.VITEST is set
```

**`client.ts`.** The OpenAI client is created inside `chat()` on first call and memoised, with `baseURL` from `QWEN_BASE_URL`, `timeout` from `QWEN_TIMEOUT_MS` (default 15000) and `maxRetries: 1`. A missing `DASHSCOPE_API_KEY` throws `AgentError`. The request is built as a plain object `{ model: process.env.QWEN_MODEL, enable_thinking: false, ...body }` and passed with one cast (`as never`), because `enable_thinking` is not in the SDK types. Any SDK error becomes `AgentError`.

**`loop.ts`.** Imports `@/agent/prompts.json` and `@/agent/tools.json`. Shared handling for every reply:
- Append the assistant `raw_message` once, then for every tool call, in order, exactly one `{role:'tool', tool_call_id, content}`.
- `content` is `JSON.stringify(guarded value)` on success, `'{"error":"invalid_arguments"}'` when `JSON.parse` or the guard throws, `'{"error":"unknown_tool"}'` for a name not offered, `'{"ok":true}'` for a tool already recorded.
- The first valid result per tool wins. Each handled call pushes a `TraceStep` whose `input` is the parsed arguments (the raw string if unparseable; never the messages or the photo) and whose `output` is the guarded value or the error object.
- A forced call is `tool_choice: {type:'function', function:{name}}` with only that tool in `tools`.
- The whole function aborts with `AgentError` after 25 s. Any non-`AgentError` thrown inside is rethrown as `AgentError`.

**`runIntake`, `AGENT_MODE=loop`:**
1. Tools offered: `see_photo`, `assess_route`, plus `cluster_report` when `candidates.length > 0`. Prompt is `intake`, or `intake_no_candidates` with zero candidates. User content: `[{type:'image_url', image_url:{url: photo_data_url}}, {type:'text', text: prompt}]`, context `{unit, location, resident_text, candidates: [{id, title, location, observation}]}`.
2. One call with `tool_choice: 'auto'`, handled as above. `guardAssessment` gets `{facts: [], intakeTexts: [text, ...(reading?.visible_hazards ?? [])]}`. `guardProposal` gets the candidate ids.
3. For each offered tool with no valid result, in the order `see_photo`, `assess_route`, `cluster_report`: one forced call (`forced: true`), appended to the same conversation.
4. Still no valid result: `cluster_report` falls back to `{ticket_id: candidates[0].id, reason: 'padanan blok dan stack'}` (`source: 'fallback'`); `see_photo` or `assess_route` throws `AgentError`.
5. Zero candidates: proposal `{ticket_id:'new', reason:'tiada tiket di lokasi ini'}`, traced `source: 'code'`.
6. Once the reading exists, recompute the assessment's urgency with the intake urgency rule over `[text, ...reading.visible_hazards]`, so the result does not depend on call order.

**`runIntake`, `AGENT_MODE=forced`:** call 1 is `{messages:[system, user(image + vision_json prompt)], response_format:{type:'json_object'}}` with no tools, parsed by `guardPhoto` and traced as `see_photo`. Calls 2 and 3 are forced `assess_route` and `cluster_report` on a text-only user message carrying the context plus the reading as JSON. No image is ever sent with tools. Steps 4 to 6 apply unchanged.

**`runReplan`** (same in both modes, text only):
1. Forced `assess_route` with prompt `replan_assess`, context `{ticket: {location, observation, suspected_source, next_action, responsible_party, facts}, new_fact}`. Guard with `{facts: [...ticket.facts, fact], intakeTexts: []}`. One retry on failure, then `AgentError`.
2. Build `next = {...ticket, facts: [...ticket.facts, fact], suspected_source, next_action, responsible_party, rule_cited from the guarded assessment, urgency: higher of ticket.urgency and assessment.urgency}`.
3. Forced `draft_message` with prompt `replan_draft`, context `{TICKET: {location, observation, suspected_source, next_action, responsible_party, facts} from next, recipient_label}`. `guardMessage(raw, next)`. On failure `templateMessage(next)`, `source: 'fallback'`.
4. `gaps = listGaps(next, rules)`, traced as `list_gaps`, `source: 'code'`.

**`POST /api/reports` flow:** `await request.formData()`; `photo` must be a `File` with type starting `image/` and size at most 5 MB, else `invalid_input`; `parseUnit(unit)`; `location` is `` `Blok ${block}, Aras ${level}, unit ${unit}` ``; data URL from `Buffer.from(await file.arrayBuffer()).toString('base64')`; `runIntake` with `clusterCandidates(unit, all tickets)`; `createDraft`; `saveTrace('intake:' + report.id, trace)`; 201 with `photo_url` blanked. No ticket is touched.

**Resident page (`/`):** photo input, unit input defaulting to `B-11-03`, optional text, "Hantar untuk draf" (disabled while pending). On 201 show the draft card: four separately labelled fields (Pemerhatian, Punca disyaki, Tindakan seterusnya, Pihak bertanggungjawab), then "Akan digabung dengan: {title}" or "Tiket baharu" from the proposal (title looked up from `GET /api/tickets`), then `TracePanel` ("Jejak ejen": step, tool, source, forced, ms, collapsible input and output). 400 shows the matching BM hint; 502 shows "Model tidak dapat dihubungi" and "Cuba semula". The Sahkan button is added in T4.

- [ ] **Step 1 (T3a, agent): client, loop, trace, and `loop.test.ts`.** A scripted `chatFn` stands in for the model; tests pass `{chatFn, rules: testRules()}` and set `process.env.AGENT_MODE` explicitly.
  - L1 `intake in one turn` (loop): the fake returns three valid tool calls; result has the reading, an assessment with `responsible_party 'belum_disahkan'`, proposal `t_1`; trace has 3 steps, none forced; `chatFn` called once; the second message set would contain one tool message per call.
  - L2 `missing tool is forced`: the fake returns only `see_photo`; the next `chatFn` call has `tool_choice.function.name === 'assess_route'` and a one-tool list; that trace step has `forced: true`.
  - L3 `bad cluster arguments`: turn 1 returns `see_photo`, `assess_route` and `cluster_report` with arguments `"{oops"`; the forced call returns `{ticket_id:'t_9'}`; `chatFn` called exactly twice; proposal is `t_1`; the last trace step has `source 'fallback'`.
  - L4 `assess_route never valid throws AgentError`.
  - L5 `no candidates`: tools sent exclude `cluster_report`, the prompt is `intake_no_candidates`, proposal is `new` with `source 'code'`.
  - L6 `replan with the shared-pipe fact`: the fake's `assess_route` says `pemilik_unit`; result assessment is `jmb_mc`; the second `chatFn` call's user text contains `jmb_mc`; `gaps` is `[]`.
  - L7 `replan draft fallback`: the fake's `draft_message` returns `{text:'ok'}`; `message` equals `templateMessage(next)` and contains the new `next_action`.
  - L8 `forced mode`: `AGENT_MODE=forced`; three `chatFn` calls; the first has `response_format` and no `tools`; the second and third user messages contain no `image_url`.
  - L9 `chat body`: `vi.mock('openai', () => ({ default: class { chat = { completions: { create } } } }))` with `create` from `vi.hoisted`, env `DASHSCOPE_API_KEY` and `QWEN_MODEL` set in the test; `chat()` calls `create` with `enable_thinking: false` and that model.
- [ ] **Step 2 (T3b, agent): route, page, `TracePanel`, and `route.test.ts`** with `vi.mock('@/lib/agent/loop', () => ({ runIntake: vi.fn(), runReplan: vi.fn() }))` and `resetStore(testSeed())` in `beforeEach`.
  - A1 a `text/plain` file returns 400 `invalid_input`; a JPEG with unit `rumah saya` returns 400; a JPEG with `B-11-03` returns 201 with `report.status 'draft'`, `report.photo_url ''`, and `t_1` still at 4 reports.
- [ ] **Step 3: verify.** `npm test` green, `npm run typecheck` clean. In the browser, upload `siling.jpg` from `B-11-03` three times: four fields render, party reads "Belum disahkan", urgency is Sederhana, and the card reads "Akan digabung dengan: Siling bocor, Blok B stack 03" all three times. If it ever reads "Tiket baharu", strengthen the `cluster_report` description in `agent/tools.json` and retest. Write the wall time in `prep/briefing.md` and apply the latency rule. The other two photos are checked in T6.
- [ ] **Step 4: commit** `qoder T3: photo to draft through Qwen tool calls, with trace`.

---

### Task 4: Sahkan and the merge (13:10 to 13:25)

**Files:**
- Create: `app/api/reports/[id]/confirm/route.ts`
- Modify: `app/page.tsx`, `app/manager/page.tsx`
- Test: `app/api/reports/[id]/confirm/route.test.ts`

**Interfaces:** consumes `confirmReport`, `viewAll`, `fail`, `draft`. Produces the confirm route in the API table.

- [ ] **Step 1: test, then route.** `beforeEach`: `resetStore(testSeed())`, then `draft(getStore(), 'B-11-03', 't_1')`. Call the exported `POST` with `{ params: Promise.resolve({ id: 'r_5' }) }`.
  - H2 `two confirms fired together`: `Promise.all` of two `POST`s; both 200; exactly one has `already_confirmed false`; both carry `count_before 4` and `count_after 5`; `viewAll` shows `t_1` with count 5. An unknown id returns 404 `{error:'not_found'}`.

  The handler awaits `params`, then calls `confirmReport(getStore(), id, new Date().toISOString())` and builds the response with no further `await`.
- [ ] **Step 2: UI.** Resident: Sahkan under the draft card, disabled on first click; on 200 show "Digabung: 4 → 5 laporan" from the response, or "Tiket baharu dibuka" when `merged` is false. Manager: after each poll compare with the previous one; a ticket whose count rose shows "4 → 5 laporan" with a highlighted card for 8 seconds. Cards never change position.
- [ ] **Step 3: verify.** `npm test` green. Two browser windows side by side: upload the ceiling photo from `B-11-03`, Sahkan, the ceiling card on the manager view shows "4 → 5 laporan" within 2 seconds and stays in place. Repeat the confirm from DevTools (`fetch` the same URL with POST): count stays 5. Stop the dev server, `npm run build`: green, and the route table shows `ƒ` beside `/api/tickets`. Restart `npm run dev`.
- [ ] **Step 4: commit** `qoder T4: Sahkan merges once, 4 to 5 laporan`.

---

### Task 5: Fact, Lulus, Buka WhatsApp (13:25 to 14:00)

**Files:**
- Create: `app/api/tickets/[id]/facts/route.ts`, `app/api/tickets/[id]/approve/route.ts`, `app/api/tickets/[id]/open/route.ts`
- Modify: `app/manager/page.tsx`
- Test: `app/api/tickets/tickets-routes.test.ts`

**Interfaces:** consumes `runReplan`, `addFact`, `editTicket`, `approveTicket`, `markOpened`, `toView`, `viewAll`, `waLink`, `saveTrace`, `readJson`, `fail`.

**Facts flow:** `readJson`; the body must contain exactly one of `fact`, `message`, `recipient`, else `invalid_input`; a `fact` is a string, trimmed, 1 to 300 chars. For `message` or `recipient`: `editTicket`, return. For `fact`: read `v0 = ticket.version`; `await runReplan({ticket, fact})`; then synchronously `addFact(store, id, v0, fact, result.assessment, result.message)` (409 if the version moved while the model ran); `saveTrace('replan:' + id, trace)`.

**Manager card adds:**
- The four fields; `rule_text` under them when non-null; facts list; gaps under "Maklumat belum lengkap"; status chip; `TracePanel` with the last replan trace.
- "Fakta baharu" input with "Kemas kini", disabled while pending. A 409 shows "Tiket telah berubah, cuba semula".
- Recipient label and phone inputs and the message textarea, each with "Simpan". These and the fact input are local state keyed by `` `${ticket.id}:${ticket.version}` ``; they are re-initialised from the server only when that key changes, never on an ordinary poll. Simpan is enabled only when the local value differs from the server value. Refetch immediately after every successful POST.
- While the message or recipient differs from the server value, Lulus and Buka WhatsApp are hidden and the card reads "Simpan dahulu".
- "Lulus (versi N)" posts the server version shown. A 409 shows "Perlu kelulusan semula" and refetches.
- "Buka WhatsApp" is `<a href={wa_url} target="_blank" rel="noreferrer">`, rendered only when `wa_url` is non-null; its `onClick` fires the `open` call without awaiting it.
- "Salin teks" is always available. When the recipient phone is null the card reads "Nombor tiada, draf sahaja" and has no Lulus.

- [ ] **Step 1 (T5a, agent): tests and routes.** `vi.mock('@/lib/agent/loop', ...)` with `runReplan` resolving to `{assessment: A with responsible_party 'jmb_mc', message: 'Salam Kontraktor paip (demo). Mohon baiki paip dikongsi di Blok B stack 03. Terima kasih.', gaps: [], trace: []}`. Each test starts from `resetStore(testSeed())` and does its own setup.
  - F2 post the fact (200, `ticket.version 2`, `facts.length 1`, `approval null`), then approve `{version:1}`: 409 `{error:'stale_version', current_version: 2}`.
  - F3 post the fact, approve `{version:2}`: 200, `wa_url` starts with `https://api.whatsapp.com/send?phone=60123456789&text=Salam%20Kontraktor`, `ticket.status 'approved'`; then open `{version:2}`: status `opened_in_whatsapp`.
  - F4 approve `{version:1}`, then post `{message:'Teks baharu untuk kontraktor, mohon semak segera.'}`: `GET /api/tickets` shows `t_1` at version 2 with `wa_url null`; open `{version:2}` returns 409 `not_approved`. The same sequence with `{recipient:{label:'Kontraktor paip (demo)', phone:'60111111111'}}` gives the same outcome.
  - F7 a body with both `fact` and `message` returns 400; `{}` returns 400; a body of `x` returns 400.
  - F8 `ticket edited while the model runs`: the mocked `runReplan` calls `editTicket` on `t_1` before resolving; the facts response is 409 and `t_1.facts` is empty.
  - F9 set `t_1.recipient` to `{label:'Kontraktor paip (demo)', phone:null}` in the store, approve `{version:1}`: 422 `missing_recipient`.
- [ ] **Step 2 (T5b, agent): the manager card.**
- [ ] **Step 3: verify.** `npm test` green, `npm run typecheck` clean, stop dev, `npm run build` green, restart dev. In the browser on the ceiling ticket: enter "Pemeriksaan mendapati paip yang dikongsi beberapa unit bocor."; version 2 appears with party "JMB / MC" and a rewritten message; Lulus; Buka WhatsApp opens the composer with the full text; the chip reads "Dibuka di WhatsApp". Type one extra word in the message: the card reads "Simpan dahulu"; Simpan; the link is gone and the button reads "Lulus (versi 3)". Syeeda reads every BM string on the dev server during this task; copy changes go in `lib/copy.ts` and stop at 14:00.
- [ ] **Step 4: commit** `qoder T5: fact makes version 2, Lulus bound to version, Buka WhatsApp`.

---

### Task 6: Rehearsal and evidence (14:00 to 14:30)

No new features. No code change after 14:15.

- [ ] **Step 1:** stop the dev server, delete `trace.jsonl`, then:

```powershell
npm run typecheck; if ($LASTEXITCODE -eq 0) { npm test }; if ($LASTEXITCODE -eq 0) { npm run build }; if ($LASTEXITCODE -eq 0) { npm run start }
```

Demo from `next start` from here on. Restarting the server resets to seed.
- [ ] **Step 2: rehearsal checks on `next start`.**
  - [ ] Main run end to end (upload, Sahkan, fact, Lulus, Buka WhatsApp) inside 90 seconds. Restart the server, run it again.
  - [ ] `A-05-07` with "Siling dapur bocor" becomes a third ticket; the ceiling count does not move; the new card reads "Nombor tiada, draf sahaja", Salin teks copies the message, there is no Lulus.
  - [ ] Double-tap Sahkan: count stays 5.
  - [ ] Edit the message after Lulus: Buka WhatsApp disappears until re-approved. Same for the recipient phone (UI, or the curl from the cut order).
  - [ ] `lampu-koridor.jpg` and `aircond.jpg` from `B-11-03`: party "Belum disahkan", neither is Kritikal, each proposes "Tiket baharu".
  - [ ] Two backup facts only, each after a restart: "Ada wayar elektrik dekat kebocoran." shows the Kritikal badge without moving the card; "Itu koridor bersama." gives "JMB / MC". The other twists are answered from Syeeda's expected outputs.
- [ ] **Step 3: WhatsApp target.** On the stage laptop and browser, click the real link twice. If the `api.whatsapp.com` interstitial costs a click that hurts the pitch and WhatsApp Web holds its session, set `WA_BASE=https://web.whatsapp.com/send` and restart. Keep a screenshot of the prefilled composer.
- [ ] **Step 4: evidence.** Screen-record one clean run. Copy `trace.jsonl` to `evidence/`. Screenshot the Qoder Chat History panel and each task's to-do list and diff. `git log --oneline` shows one commit per task.
- [ ] **Step 5:** restart the server so the pitch starts from seed. Phone hotspot ready. Commit `qoder T6: rehearsal evidence`.

### Task 7: Submit (14:30 to 14:45)

- [ ] Package what the briefing asked for (T1 notes). Ken rehearses against the running app. Submit by 14:45. If the live model fails on stage, play the recording and say it is a recording.

---

## Top risks and the guard already in the plan

| Risk | Guard |
|---|---|
| Wrong region or model on the day | T1 smoke S1 to S4; base URL and model in `.env.local`; fallback models named |
| Thinking mode left on (slow, forced tool calls rejected) | `client.ts` is the only SDK call site; test L9 |
| Image plus tools unsupported live | Smoke S3 and S4 decide at 11:30; `AGENT_MODE=forced` is built and tested (L8) |
| Model proposes a wrong ticket id | `guardProposal` throws, forced retry, then `candidates[0]`; tests G7, L3 |
| Model proposes "new" for the ceiling photo | T3 Step 3 checks three uploads; the proposal is printed on the draft card before Sahkan |
| Model assigns a party without an inspection | Party comes only from `fact_patterns`; tests G1, G2, G9 |
| A hazard word in the model's own text makes a ticket Kritikal | Intake needs both the model's `critical` and a pattern match; test G5 |
| Double tap double-counts | Synchronous `confirmReport` with stored result; tests C4, H2 |
| Stale approval sends old text | `isApproved` checks version, phone and hash; `wa_url` derived server side; unsaved edits hide Lulus; tests V4, V5, F4 |
| `GET /api/tickets` frozen or store split | `--no-cache-components`, `force-dynamic`, `globalThis` store, build at T4 and T5 |
| Qoder Credits run out | Model tier per sub-task (T1), one prompt per sub-task, standby accounts |
| Venue wifi | Hotspot, recorded run |
| Wrong regulation cited | Only `verified: true` rule ids survive the guard; test G3 |

## Open items for the team

- Isyraf: `rules.json` `rules` entries in the T0 shape; Reg 58 stays `verified: false` until read in the gazette. Do not change `fact_patterns`.
- Syeeda: string values in `seed.json`, three photos named as in T0 Step 9, expected outputs written to D11 and D12.
- Ken: rewrite the pitch around D15. The opener's "five WhatsApps become one report" still holds; drop every "rank" and "jumps to rank 1" line, and lead with: snap a photo, the agent drafts and routes it, a person approves, it reaches management or the vendor on WhatsApp.
- BLUEPRINT.md still describes ranking (decision 6, seed ranks, demo step 2, the wiring twist, "Rules in code", the 13:10 checkpoint). It has not been edited; D15 overrides it.
- Ken: say "N laporan", "Dibuka di WhatsApp", the D4 line about what the agent does and what code does, and for a photo twist: "from a photo alone it stays Belum disahkan; watch what a fact does."
- Naim: all of T0 tonight.

# Laporlah Blueprint

QodeFest, Alibaba Cloud Qwen Conference Malaysia. Thu 19 Nov 2026, Connexion Nexus, KL.
Sprint 11:50 to 15:00 (lunch, build, demo prep, submit). Pitching 15:00 to 16:00. Aim to submit by 14:45.

Team: Ken (presenter), Isyraf (research), Syeeda (research), Naim (developer).

Revision 2 (18 Nov): applies the Codex review. Real approval gates, leak routed to management for inspection, a provable 4-to-5 merge and rank change, corrected competitor claims, scope cut to what one developer can prove by 14:15. Supersedes the clustering-on-roadmap scope in `docs/plans/2026-11-18-laporlah-qodefest-blueprint.md`; keeps that draft's approval-by-version rule.

## 1. One line

Snap one photo. Laporlah drafts a report, groups it with other reports about the same fault, says who should act next, and gives management a Bahasa Malaysia message to approve.

Pitch opener (Ken):
"Every Malaysian condo leak starts with one question: whose problem is it? Then five residents send five WhatsApps about the same stain. Laporlah turns them into one report, says who should act next, and waits for management to approve the message. Watch."

## 2. Decisions

| # | Question | Decision | Why |
|---|----------|----------|-----|
| 1 | Who pays? | JMB / MC / management firm, per building (proposed model). Residents free. | Residents will not pay to complain. Managers feel the duplicate-report pain. |
| 2 | Resident gate | Upload returns a draft only. **Sahkan** commits the report and clusters it, exactly once, even on a double tap. | A report enters the queue only when the resident says so. |
| 3 | Manager gate | **Lulus** approves the exact recipient and exact text of the current ticket version. Any change to either creates a new version that needs fresh approval. | Approval means "this message to this person", not "the ticket in general". |
| 4 | When do new facts land? | Before Lulus. The judge's fact creates version 2; the manager approves version 2. | Shows the agent re-planning and the gate holding. |
| 5 | How do Rosak and Suara Setempat combine? | Rosak = intake (photo to draft). Suara Setempat = manager view (many reports to one ticket). | One engine, two screens. |
| 6 | Ranking | Critical hazards first, then report count, then oldest first report. Counted as "N laporan" unless reporters are proven distinct. | Count is real signal; a hazard with one report still outranks a stain with five. |
| 7 | Viral | Not Thursday. Society phase only, with moderation. | Defamation and PDPA risk. |
| 8 | Business or society first? | Condo demo. Suara Setempat for councils / ADUN = one closing slide. | Business pays for the build. |
| 9 | Sending | **Buka WhatsApp** opens a prefilled composer to one team-controlled number. Status says "Dibuka di WhatsApp", never "Delivered". | Click-to-chat only prefills; it cannot confirm delivery. |
| 10 | Missing contact | Upstairs neighbour has no number: their notice stays a copyable draft. | Never guess a recipient. |
| 11 | Responsibility | Separate fields: observation, suspected source, next action, responsible party. Responsible party stays "belum disahkan" until inspection. | A photo shows a stain, not a cause. Form 28 after inspection decides responsibility. |
| 12 | Language | BM only on Thursday. English toggle deferred. | Scope. |
| 13 | Agent-ready | Every step is a JSON API route the UI also uses. MCP deferred. | True in code, cheap to build. |
| 14 | Login, maps, dashboard, payments, second recipient | None. | Not provable by 14:15. |

## 3. Competitors

Claims below are limited to what we have a source for. Isyraf verifies the rest tonight.

- **JaGaApp** (Red Ideas Sdn Bhd, launched 2015): resident / management / guard app with a Feedback module through which residents contact management (admin tutorial). App Store reviewers describe attaching photos to issues. KrASIA reported 400+ neighbourhoods; the Codex review says its current terms state 600. Isyraf confirms the current figure and whether it has internal defect reporting.
- **Gprop**: complaint ticketing that pushes tasks to staff through a task app.
- **i-Neighbour** (FingerTec / TimeTec): defect ticketing, annual subscription after a 3-month trial.
- Also in the space: eCommunity, Condo Master / Veemios, Aplicondo, MHub.

Do not claim on stage that competitors lack AI, duplicate handling or APIs. We have not verified it.

Ken's line: "Laporlah groups reports about the same fault, explains who should act next, and gives management a Bahasa Malaysia message to approve."

Integration with these platforms is a roadmap item, not a claim.

## 4. Demo (90 seconds)

Fictional building: Residensi Seri Kerinchi, Block B. Localhost, staged photos. Model Studio processes the image live.

Seed state on the manager screen:
1. "Paip bocor di tempat letak kereta B2": medium, 4 laporan, oldest first report. Rank 1.
2. Ceiling leak, Block B stack 03: medium, 4 laporan. Rank 2.

Run:
1. Resident uploads the ceiling-leak photo from B-11-03. The agent returns a **draft**: "Kesan air pada siling. Punca belum disahkan. JMB perlu menyelaras pemeriksaan." Fields: suspected source (paip unit atas atau paip dikongsi, belum disahkan), next action (JMB selaras pemeriksaan), responsible party (belum disahkan).
2. Resident taps **Sahkan**. The report merges into the ceiling-leak ticket: **4 laporan to 5 laporan**, and the ticket moves **from rank 2 to rank 1**. This is the key moment.
3. Judge's twist, entered before approval: "Pemeriksaan mendapati paip yang dikongsi beberapa unit bocor." Agent re-plans: source = shared pipe (common property), responsible party = JMB / MC, next action changes from investigating the source to coordinating repair of the shared pipe. Ticket becomes version 2, message rewritten.
4. Manager sees recipient (team-controlled demo number, labelled "Kontraktor paip (demo)") and the exact text. Taps **Lulus**, then **Buka WhatsApp**. Show the prefilled composer.

Backup twists (Syeeda prepares expected outputs):
- "Jiran atas di luar negara sampai Isnin." JMB inspects accessible areas now, proposed Monday follow-up. Upstairs notice stays a copyable draft (no number).
- "Ada wayar elektrik dekat kebocoran." Becomes critical, jumps to rank 1 regardless of count, isolate power.
- "Itu koridor bersama." Common property, JMB.
- Corridor light photo. Common property, low urgency.
- Aircond drip onto balcony below. Unit owner matter, neighbour notice as draft.

Rehearsal checks (must pass before 14:15):
- An unrelated leak report (different block) stays a separate ticket.
- Double-tapping Sahkan, or confirming the same report again, leaves the count at 5.
- Editing text or recipient after Lulus clears approval; Buka WhatsApp is disabled until re-approved.

## 5. Agent design

One Qwen agent loop with function calling.

| Tool | Input | Output |
|------|-------|--------|
| `see_photo` | image, optional text | `{observation, location_hint, severity, visible_hazards[]}` |
| `assess_route` | observation, location, building facts, extra facts | `{suspected_source, next_action, responsible_party, rule_cited, reasoning}` |
| `cluster_report` | confirmed report, open tickets | `{ticket_id or "new", reason}` |
| `draft_message` | ticket version, recipient | `{text}` (BM) |
| `list_gaps` | ticket | `{missing[]}` e.g. "foto masih tiada", "nombor unit atas tiada" |

`responsible_party` values: `belum_disahkan` (default before inspection), `pemilik_unit`, `jmb_mc` (common property), `pemaju` (within defect liability period).

Rules (`rules.json`, Isyraf). Verified so far from secondary sources:
- Inter-floor leakage is governed by Part XV (Regulations 55 to 67) of the Strata Management (Maintenance and Management) Regulations 2015.
- After notice, management inspects the affected parcel and other relevant parcels (Reg 57, per commentary on Foo Jia Yin v Strata Management Tribunal, 2024).
- The certificate of inspection (Form 28) is issued within 5 days of inspection and states the cause and the party responsible (Reg 59).
- Caused by a parcel: the owner rectifies within 7 days of receiving Form 28. Caused by common property after the defect liability period: JMB / MC rectifies within 7 days.
- To verify against the gazetted text (P.U.(A) 107/2015): Reg 58's distinction between pipes serving one parcel and pipes serving several. Do not cite Reg 58 on stage until checked.

Models: a Qwen VL model for `see_photo`, a Qwen text model with function calling for the rest, via Model Studio's OpenAI-compatible endpoint. At the 11:15 account check, prove one vision call and one function call with the event credentials. Key in `.env`, server side only.

## 6. Data shapes

```json
Report {
  "id": "r_5", "photo_url": "...", "text": "siling bilik air bocor",
  "unit": "B-11-03", "location": "Block B, Level 11, bathroom",
  "status": "draft | confirmed", "confirmed_at": null, "ticket_id": null
}

Ticket {
  "id": "t_1", "version": 2, "location": "Block B, stack 03, L11-L12",
  "report_ids": ["r_1","r_2","r_3","r_4","r_5"], "count": 5,
  "first_seen": "...", "urgency": "medium",
  "observation": "Kesan air pada siling.",
  "suspected_source": "paip dikongsi beberapa unit",
  "next_action": "JMB selaras pembaikan paip dikongsi",
  "responsible_party": "jmb_mc", "rule_cited": "...",
  "facts": ["Pemeriksaan mendapati paip yang dikongsi beberapa unit bocor."],
  "gaps": ["..."],
  "recipient": { "label": "Kontraktor paip (demo)", "phone": "60XXXXXXXXX" },
  "message": "...",
  "approval": { "version": 2, "recipient_phone": "...", "message_hash": "...", "at": "..." } | null,
  "status": "open | approved | opened_in_whatsapp"
}
```

Rules in code:
- `confirm` on a report already confirmed returns the existing result. Count never double-increments.
- Any change to facts, recipient or message bumps `version` and sets `approval` to null.
- `approve` must name the current version; a stale version is rejected.
- Rank: `urgency == critical` first, then `count` desc, then `first_seen` asc.

Storage: in-memory, seeded from `seed.json`. No database.

## 7. Build plan (Naim)

Stack: one Next.js app, two pages (`/` resident, `/manager`), API routes, localhost.

Build in the Qoder IDE Editor Window with Agent mode. The separate Quest window was retired on 16 Oct 2026 (v1.34.0). Capture the Agent history and a short runtime tool trace (tool name, input, output per step) as Qoder and agent evidence.

API (same routes the UI uses):
- `POST /api/reports` photo + text, returns draft
- `POST /api/reports/:id/confirm` idempotent; commits and clusters
- `GET /api/tickets` ranked
- `POST /api/tickets/:id/facts` new fact, returns new version
- `POST /api/tickets/:id/approve` `{version}` returns wa.me link; rejects stale version

| Time | Done when |
|------|-----------|
| 11:15 | One vision call and one function call proven with event credentials |
| 11:50 | App scaffolded in Qoder, seed loaded, two tickets visible ranked |
| 12:30 | Photo in, draft out with the four separate fields |
| 13:10 | Sahkan commits once, 4 to 5 laporan, rank 2 to 1 |
| 13:45 | Fact creates version 2; Lulus bound to version; Buka WhatsApp opens composer |
| 14:15 | Code freeze. Rehearsal checks pass. Record the run, save tool trace |
| 14:45 | Submitted |

Cut order if behind: backup twists, then the twist input styling. Never cut the merge and rank change, or the version-bound approval.

## 8. Tonight

| Who | Deliverable |
|-----|-------------|
| Isyraf | `rules.json` from the gazetted Part XV text, including whether Reg 58 covers shared pipes. JaGaApp current neighbourhood count, defect-reporting feature, pricing. |
| Syeeda | 3 photos (ceiling leak, corridor light, aircond drip). `seed.json`: 4 ceiling-leak reports (mixed BM / EN), 4 car-park pipe reports with an older first report, 1 unrelated leak. Expected outputs for the main twist and 5 backups. Thursday: QA every BM output. |
| Ken | 90-second pitch and 3-minute version. Rehearse the 4-to-5 moment and the shared-pipe twist. |
| Naim | Prompts and tool schemas from section 5. Confirm Qoder and Model Studio access. No app code until the sprint (pending organiser rules). |

## 9. Q&A sheet (Ken)

- "How is this different from JagaApp?" Laporlah groups reports about the same fault, explains who should act next, and gives management a Bahasa Malaysia message to approve.
- "What if the AI is wrong about who is responsible?" It does not decide. It says the cause is unconfirmed and routes to management for inspection. Responsibility follows the inspection certificate.
- "How do you make money?" Proposed: per-building subscription paid by management. Integrations with existing building apps are on the roadmap.
- "Privacy?" Photos stay with the building's management. No public feed.
- "Did it actually send?" It opens WhatsApp with the approved text. Delivery confirmation needs the WhatsApp Business API, which is post-hackathon.
- "Society angle?" Same engine. Swap JMB for council or ADUN office: Suara Setempat.

## 10. Do not build

Login. Maps. Payments. Public feed. Vendor marketplace. WhatsApp Business API. English toggle. Second recipient. MCP. Society mode.

## 11. Risks

| Risk | Mitigation |
|------|-----------|
| Vision misreads a photo on stage | Test all 3 at 12:30; recorded run as backup |
| Venue wifi | Phone hotspot; recorded run |
| Stale approval sends old text | Approval bound to version + recipient + message hash |
| Double tap double-counts | Idempotent confirm; rehearsal check |
| Wrong regulation cited | Only gazette-checked rules go into `rules.json` |

## 12. Confirm at the briefing

- Scoring weights (our notes: Qoder 30, agent ~25, Malaysian relevance 20, UX 15, pitch 10; the listing gives none).
- Per-team pitch length.
- Whether prompts, seed data and code may be prepared in advance.
- Submission format.

## Sources

- QodeFest listing: https://eventsize.com/event/qodefest-alibaba-cloud-qwen-conference-malaysia-2026
- Qoder IDE release notes (Quest window retired, v1.34.0, 16 Oct 2026): https://changelog.qoder.com/ide
- WhatsApp click to chat: https://faq.whatsapp.com/5913398998672934
- Inter-floor leakage, Regs 55 to 67, Form 28 timing and causes: https://www.legal500.com/intelligence/malaysia/real-estate-and-construction/faq-on-inter-floor-leakage-%26-party-wall-damage-in-strata-schemes
- Inspection and Form 28 process: https://dnh.com.my/dealing-with-inter-floor-leakage/
- JaGaApp Feedback module (admin tutorial): https://sites.google.com/jagaapp.com/jagaappadpaneltutorialvideos/admin-panel-tutorial/feedback
- JaGaApp App Store: https://apps.apple.com/my/app/jagaapp/id1061382741
- KrASIA on JaGaApp: https://kr-asia.com/this-app-for-safer-neighborhoods-is-now-used-in-400-communities-across-malaysia
- Gprop: https://gpropsystems.com/condo_management_app
- i-Neighbour brochure: https://www.fingertec.com/images/brochure/i-JMCMC.pdf

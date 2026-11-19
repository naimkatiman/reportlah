# Cook brief: Laporlah 3D

Started: 2026-11-19 12:56 MPST. Standalone folder `laporlah-3d/`, zero writes to `reportlah/`.

Owner correction at 13:1x: **Telegram only, and the subject is public facilities.** No WhatsApp, no condominium, no unit B-11-03, no JMB. This demo is the 3D front door to Reportlah's story: a public complaint, grouped with others, approved and handed to Telegram.

## Target

A 3D interactive demo of a public street in the fictional Seri Kerinchi neighbourhood.

1. A resident walks the public walkway along Jalan Seri Kerinchi, past a bus stop and street lights, to a clogged roadside drain with standing water.
2. The resident snaps it and gets an English draft that leaves responsibility unconfirmed:
   "Clogged drain with standing water beside the road. Cause not confirmed. The local authority needs to inspect."
   Fields: suspected cause (rubbish or silt, not confirmed), next action (inspection by the local authority), responsible party (not confirmed). The draft never names a council.
3. **Confirm** merges the report into the clogged-drain complaint group: 4 complaints becomes 5 complaints, and the group moves from rank 2 to rank 1 in "Most reported". Double tap stays at 5.
4. The reviewer approves the exact message and **Open Telegram** opens a prefilled Telegram chat. Status reads "Opened in Telegram", never "Sent" or "Delivered".

Owner at 13:06: the demo is in English, same as Reportlah. No Bahasa Malaysia UI copy. Place names stay Malaysian (Jalan Seri Kerinchi).

Align the seed and wording with Reportlah where it helps: read-only sources are `../../BLUEPRINT-reportlah.md` and `../../reportlah/data/seed.json` (drain complaints in Kerinchi, a street-light complaint as an unrelated one).

## Integration with Reportlah (owner, 13:2x: "make sure to integrate with" Reportlah)

The 3D demo is a front door to the real Reportlah app, not a parallel product.

- **Connected mode:** when Reportlah's API is reachable, Confirm posts the complaint to Reportlah and every number on the reviewer screens (complaint count, date range, message, "Public facility issues" ranking) comes from Reportlah's own state. The demo invents nothing in this mode. With Reportlah's seed that means 5 complaints becomes 6 and the drain issue stays on top.
- **Demo mode:** when Reportlah is unreachable, and always for shot presets, the local scripted engine runs (4 to 5, rank 2 to 1) and the screen carries a small visible "Demo data" label. Stills and blind critics use demo mode so they are reproducible.
- All Reportlah access goes through one adapter in `src/integration/` behind the same store interface. Base URL from `VITE_REPORTLAH_URL`, Vite dev proxy to avoid CORS.
- Owner approved same-origin serving at 13:27. Split agreed with the Reportlah session (98b6d84f): that session serves this app's production build at `/3d/index.html` on Reportlah's origin; this session delivers `laporlah-3d/dist` built with relative asset paths (`base: './'`), reads `GET /api/state` on the same origin (fields `report.count`, `issues`, `complaints[].tag`), keeps the scripted data as fallback, and links back to `/`. This session still writes nothing in `reportlah/`.
- Because the app is served from a subpath as a plain file, it must not depend on the Vite dev server, absolute `/assets` URLs, or history-API routing. Shot presets stay as query parameters.
- Gates never call the live model or mutate the running Reportlah instance. They run against a stub server that copies Reportlah's API contract. A live check against the real app is a manual gate.

## Bar

Not a score. Each piece is judged blind by a fresh-context critic that sees our still beside the reference with labels stripped, picks a winner and names the single biggest gap. A piece passes only when the critic picks ours at desktop and at phone. A 9 out of 10 fails.

References (in `cook/refs/`):
- R01 Plane web inbox (Mobbin screen 849ec3f0-a1f0-4699-85eb-f895f7330036), desktop and phone.
- R02 a live Zillow 3D Home tour of a real apartment, desktop and phone, plus transition frames for motion. This is the owner's stated bar for how a navigable tour should feel and look.
- R03 a street-level panorama of a real Malaysian urban street with a roadside drain (Google Street View), desktop and phone. Added by the orchestrator because the subject is now outdoors. The walk must be picked over R02 and over R03.

Pieces: walk, draft, merge, rank, approval, type, motion.

Known risk, stated up front: R02 and R03 are photographs. Code-made geometry beating a photo blind may not be reachable. They stay the bar; the ledger reports honestly.

## Rules

- Stack: Vite, React, TypeScript, plain three.js. No Next, no react-three-fiber.
- Zero external assets: every mesh, texture, shader, puddle and leaf is made in code. System or Google fonts only.
- Draft text is scripted and deterministic. No live model call, no API key.
- Telegram is a prefilled link (`https://t.me/<placeholder_bot>?text=`). Nothing is sent. No bot token anywhere.
- UI copy in English, using Reportlah's words where they exist (complaints, Most reported).
- Slop ban: eyebrow labels, monospace uppercase, purple gradients, beige, 01/02/03 counters, glowing orbs, shockwave rings, decorative particles, em dashes.
- Must run on a weak laptop GPU and in headless Chrome (SwiftShader) for stills.

## Time

Floor 8h from start. Depth before breadth.

## Permissions

- Write only inside `laporlah-3d/`. `reportlah/data/seed.json` and `BLUEPRINT-reportlah.md` may be read, never written.
- No commits, pushes or deploys without the owner asking.
- npm installs allowed inside `laporlah-3d/` only.
- Reference screenshots are for private comparison. Never publish them or name them in public files.

## Deliverable

`npm run dev` in `laporlah-3d/` runs the full walk and both screens at desktop and phone. Gates in `../GATES.md`.

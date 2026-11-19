# Rounds ledger: Laporlah 3D

Measured numbers come from a command. Critic picks are eyeballed by fresh-context critics. The orchestrator's own opinion is logged, never decisive.

## Decisions

- 12:56 Standalone `laporlah-3d/` as an untracked folder in the main checkout. No worktree: subagents run from the repo root and nothing else writes here. No commits.
- 12:57 Stack: Vite + React + TypeScript + plain three.js. JEV was undecided (confidence 0.25), orchestrator chose plain three for direct control of render quality.
- 12:57 Draft text scripted, no live model. WhatsApp click-to-chat to a placeholder number.
- 12:57 Motion reference: frame strip from the 3D tour's move between two points, since the inbox reference is a still.
- 12:57 Seven judged pieces, six builders: merge and rank share one inbox builder.

- 13:12 Owner feedback, exact words: "it is only telegram and it is public facilities". Round 0 stopped and relaunched. Setting is now a public street in Seri Kerinchi with a clogged roadside drain; handoff is a prefilled Telegram link; no WhatsApp, condominium, unit or JMB anywhere. The 4 to 5 and rank 2 to 1 beats stay. Draft stays Bahasa Malaysia (owner did not change it).
- 13:12 Added R03, a real street panorama, as a second walk reference because the subject is outdoors. The walk must beat R02 and R03.

- 13:06 Owner feedback, exact words: "stay english and demo ttoo" then "yes". All UI copy and data are English. Buttons: Confirm, Approve, Open Telegram. Status: Opened in Telegram. Round 0 relaunched a second time; no app code had been written yet.
- Note: clock times in the entries above this one were estimated and run a few minutes fast. Real start 12:56, this entry 13:06 by the system clock.

- 13:22 Owner feedback, exact words: "make sure to integrate with" plus Reportlah's 13:20 status. Decision: integrate over Reportlah's HTTP API through one adapter (`src/integration/`), connected mode shows Reportlah's real numbers, demo mode keeps the scripted 4 to 5 and rank 2 to 1 with a "Demo data" label. No writes into `reportlah/` yet (two sessions editing it). Gates G13 (stub contract) and G14 (manual live check) added. Round 0 keeps running; the adapter is a new piece in round 1.

- 13:28 Owner: "approve yes" to same-origin integration. Reportlah session will serve `laporlah-3d/dist` at `/3d/index.html`. Set `base: './'` in vite.config.ts. Peer asked for: live count and ranking from `GET /api/state`, scripted fallback, link back to `/`, and a message when dist builds.
- 13:28 References on disk: R01 (Plane inbox) desktop and phone, R02 (3D tour) desktop and phone, R03 (street panorama) desktop, phone and pitched down, V01 and V02 motion strips. Not yet reviewed by the orchestrator.

- 13:36 Owner: "spawn unlimited agents to finish the tasks faster". Stopped the single-builder run, kept its files, launched a nine-builder fan-out with disjoint ownership (workflow wf_dbd39051-305). Walk builder runs on the session model at high effort; the rest use the project `builder` agent. Place name aligned to Reportlah's seed: Jalan Kerinchi bus stop, Bangsar South.
- 13:36 Motion is judged blind on the walk-move strip against the tour strip only. The two UI transitions (confirm-merge, rank-jump) have no reference to be blind against; they get a harsh non-blind critique. Stated here so the motion verdict is not over-read.

## Round 0: gates, references, foundation

Status: closed at 13:29 without a verifier pass. One builder wrote about 5,400 lines (engine, shell, scene, draft, inbox, approval, styles, motion, script helpers). Measured at 13:30: `tsc --noEmit` clean; `vitest run` reported 5 files failed, 0 tests ran. No stills, no e2e, no verdicts. References captured; SHOTS.md not written.

## Round 1: fan-out build, integrate, first blind verdicts

Status: stopped at 13:46 on the owner's 20 minute deadline. Nine builders plus dev servers saturated the laptop (a type-check took over 4 minutes), so the fan-out was stopped to free the CPU. No integrator, verifier or critic ran. No blind verdict exists for any piece.

Measured at 13:49 to 13:52:
- `npx tsc --noEmit`: clean.
- `npx vite build`: passes, `dist/index.html` with relative `./assets` paths.
- `node scripts/shoot.mjs --round 1`: 8 desktop stills written before it was cut off; phone stills not produced. Orchestrator looked at walk-drain-desktop and rank-desktop: both render correctly.
- `npx vitest run`: 5 suites fail to load, 0 tests ran. Error: "Cannot read properties of undefined (reading 'config')" at the first `describe`. Root cause not found. G2 is unmet.
- e2e, integration stub check: not run. check-integration.mjs, blind.mjs and verdicts.mjs were not written.

Measured at 14:00 to 14:07:
- The 13:47 still run finished: 24 files in `cook/stills/r01` (9 presets and 3 motion strips at desktop and phone). Orchestrator looked at walk-drain and rank at both viewports: all four render correctly, no overflow.
- Phone header reworked to two rows so the back link, mode label and tabs fit at 390 wide.
- `node cook/_work/smoke-connected.mjs` printed SMOKE_CONNECTED_OK: dist served under `/3d/` beside a stub of Reportlah's API, at 1440x900 and 390x844. Connected mode shows "Live from Reportlah", count 5 and the stub's five complaints; no sideways overflow; back link is `/`; with the API down the label reads "Demo data". Its count assertion is loose (any standalone 5 on the page), so the orchestrator also read both screenshots. The Confirm POST path was NOT exercised.
- Known small defect: the list header reads "1 issues" when there is one issue.

Orchestrator edits made directly under the deadline (not delegated): `src/main.tsx` (probe Reportlah, connected store), `src/app/App.tsx` (Back to Reportlah link, mode label, SubmitNotice), `src/app/app.css` (their styles). Connected mode is type-checked only; it has not been run against a live or stub Reportlah.

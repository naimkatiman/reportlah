# Gates: Laporlah 3D demo

OWNS: laporlah-3d/**

Scope: a standalone 3D walk of a public street in Seri Kerinchi to a clogged drain, with the resident draft and reviewer screens and a Telegram handoff, each piece chosen over its reference by a blind critic at desktop and phone.

Checks run with this folder (`laporlah-3d/`) as the working directory. Every script exits nonzero on any failed assertion and prints its marker only after all assertions pass.

- [ ] G1: the app type-checks and builds for production
  CHECK: node scripts/check-build.mjs
  EXPECT: BUILD_AND_TYPES_OK
  EVIDENCE: pending

- [ ] G2: engine rules hold: draft leaves responsibility not confirmed, Confirm turns 4 complaints into 5 and moves the group from rank 2 to rank 1, a second Confirm stays at 5, the Telegram link carries the exact approved message, the draft and message never name a council, and no WhatsApp string exists in the app
  CHECK: node scripts/check-engine.mjs
  EXPECT: ENGINE_RULES_OK
  EVIDENCE: pending

- [ ] G3: the full flow works in a real browser at 1440x900 and 390x844: walk to the clogged drain, snap, English draft, Confirm, rank jump, approve, Telegram link opened
  CHECK: node scripts/e2e.mjs
  EXPECT: E2E_FLOW_OK
  EVIDENCE: pending

- [ ] G4: every shot preset renders a non-blank still at both viewports with zero console errors
  CHECK: node scripts/shoot.mjs --check
  EXPECT: STILLS_OK
  EVIDENCE: pending

- [ ] G5: walk to the drain: blind critic picked ours over the 3D tour reference and over the street panorama reference at desktop and phone
  CHECK: node scripts/verdicts.mjs walk
  EXPECT: BLIND_PICKED_OURS walk
  EVIDENCE: pending

- [ ] G6: draft card: blind critic picked ours over the inbox reference at desktop and phone
  CHECK: node scripts/verdicts.mjs draft
  EXPECT: BLIND_PICKED_OURS draft
  EVIDENCE: pending

- [ ] G7: merge (4 complaints to 5): blind critic picked ours at desktop and phone
  CHECK: node scripts/verdicts.mjs merge
  EXPECT: BLIND_PICKED_OURS merge
  EVIDENCE: pending

- [ ] G8: rank jump (2 to 1): blind critic picked ours at desktop and phone
  CHECK: node scripts/verdicts.mjs rank
  EXPECT: BLIND_PICKED_OURS rank
  EVIDENCE: pending

- [ ] G9: approval and Telegram handoff: blind critic picked ours at desktop and phone
  CHECK: node scripts/verdicts.mjs approval
  EXPECT: BLIND_PICKED_OURS approval
  EVIDENCE: pending

- [ ] G10: type: blind critic picked our typography at desktop and phone
  CHECK: node scripts/verdicts.mjs type
  EXPECT: BLIND_PICKED_OURS type
  EVIDENCE: pending

- [ ] G11: motion: blind critic picked our frame strip over the reference strip at desktop and phone
  CHECK: node scripts/verdicts.mjs motion
  EXPECT: BLIND_PICKED_OURS motion
  EVIDENCE: pending

- [ ] G12: the owner approved the stills in chat
  EVIDENCE: pending

- [ ] G13: connected mode against a stub of Reportlah's API contract: Confirm posts exactly one complaint (one even on double tap), the count, message and ranking shown equal the stub's state, and with the stub down the app falls back to demo mode and shows the "Demo data" label
  CHECK: node scripts/check-integration.mjs
  EXPECT: REPORTLAH_INTEGRATION_OK
  EVIDENCE: pending

- [ ] G14: live check against the real Reportlah app, run with the owner's go-ahead: a complaint confirmed in the 3D demo appears in Reportlah's own page with the count one higher
  EVIDENCE: pending

<!--
G5 to G11 read cook/verdicts.json, which only the orchestrator writes, from the
structured return of fresh-context critics. verdicts.mjs must fail when the piece
is missing, when the latest round has any viewport where the critic picked the
reference, and when the verdict's round is older than the latest stills round.
-->

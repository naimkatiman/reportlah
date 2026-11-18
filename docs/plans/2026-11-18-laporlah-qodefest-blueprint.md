Laporlah | QodeFest blueprint
19 November 2026, Kuala Lumpur
Ken (Presenter), Isyraf and Syeeda (Researchers), Naim (Developer)

Product decision

Building management pays Laporlah to turn resident photos into usable maintenance reports. A resident takes a photo and confirms the location. Qwen describes what it can see, suggests who should act next, and drafts a Bahasa Malaysia message. An authorized property manager reviews the recipient and exact message. The agent sends the approved report to the configured contact and shows the dispatch status.

A photo can show water marks. Management investigates the source and confirms responsibility. The value to the building is less time chasing details and assigning cases. Residents report for free. The property manager runs the workflow. The JMB, management corporation, or management company is the buyer when it controls the budget.

Suara Setempat extends the same product to neighbourhood reports. It groups repeat reports into one case, asks for missing evidence, and uses local support to decide which issues get more visibility. The QodeFest demo presents it as the next stage.

Build for QodeFest

1. Make one mobile friendly page. Take or upload a photo, confirm the unit or common area, and optionally describe what happened. Use one fictional building, three sample photos, and a prepared contact list.
2. Show an editable report with visible evidence, facts supplied by the resident, open questions, recommended next action, recipient, and a Bahasa Malaysia draft. Use Qwen for image understanding and drafting. Ask one question when a missing detail changes the route. Resolve the proposed recipient against the building's contact list.
3. Let the reviewer add a fact. When the upstairs resident is overseas until Monday, recommend that management inspect accessible areas now and propose arranging upstairs access when they return. Show the changed recommendation and text before approval. Label Monday as a proposed follow-up.
4. Ken plays the authorized reviewer. Show the recipient, channel, and final text before he approves. Dispatch the approved version once. Use a demo inbox with “Simulated dispatch” unless the team has verified a permitted WhatsApp test sender and recipient. A click to chat link opens a prefilled message, so label that action “Opened WhatsApp for manual send.” Show “Delivered” only with provider confirmation. [Meta message status documentation](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications) · [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934)

The demo scope is one building, one review screen, and one dispatch destination. Accounts, dashboards, maps, a vendor marketplace, billing, and the public feed belong after QodeFest. The review control represents a role in the local demo. Authenticate that role before using real reports.

One workflow for people and agents

- People use buttons. Agents use the same report actions through structured JSON. Keep four actions behind the screen that a future integration can call: create a draft, add facts, read status, and request dispatch of an approved version. Approval belongs to an authorized human.
- Give each report an ID and version, location, evidence references, observations, supplied facts, missing information, proposed route and reason, message text, approval, and dispatch status. In a live pilot, limit photos and precise locations to people handling the case.
- The app chooses from configured contacts and binds approval to the exact recipient and message in the current report version. Changes to the report create a new version that requires fresh approval. Repeated dispatch requests for that version return the existing result. If a provider timeout leaves the outcome unknown, show “Delivery unconfirmed” and reconcile before retrying.
- Use Qoder IDE Agent mode to develop the app. The separate Quest window was retired. For the running app, verify a vision capable Qwen model using the account and region supplied at the event. Prove one live photo-to-report call before polishing the screen. Keep API credentials on the server. A public agent endpoint or MCP integration can follow the pilot. [Qoder IDE release notes](https://changelog.qoder.com/ide) · [Alibaba Cloud Model Studio vision docs](https://www.alibabacloud.com/help/en/model-studio/vision)

Ken's 90-second demo

| Time | Stage action |
| --- | --- |
| 0–12 s | Show the ceiling photo. “Every condo leak starts with the same question. Who should act first?” |
| 12–35 s | Upload the photo and confirm Block B, unit 12-3. Show water marks, the unconfirmed source, and the Bahasa Malaysia draft asking management to coordinate an inspection. |
| 35–60 s | Ask for a new fact. If the room stays quiet, use “The upstairs neighbour is overseas until Monday.” Enter it and show the immediate inspection and Monday follow-up proposal. |
| 60–78 s | Review the revised recipient and text. Approve and show the dispatch status. |
| 78–90 s | “Building managers pay per building to get usable reports to the right team faster. With Suara Setempat, five reports about the same longkang can become one case the neighbourhood can support.” |

Example of the revised message

“Salam pihak pengurusan. Ada kesan air pada siling unit B-12-3 dan puncanya belum disahkan. Boleh pasukan fasiliti periksa kawasan yang boleh diakses hari ini? Penghuni unit di atas hanya pulang pada Isnin. Mohon bantu aturkan pemeriksaan susulan.”

Demo acceptance checks

- Ceiling leak, corridor light, and aircond drip fixtures produce distinct observations and suitable next actions. An unclear photo or missing location prompts the reviewer for the detail that matters. A ceiling stain alone leaves the cause open.
- Adding the Monday constraint changes both the action and the message. Editing an approved version requires fresh approval.
- An approved version creates one dispatch record. Missing approval or an unknown contact blocks dispatch. A second click reuses the record. Simulated dispatch, manual WhatsApp handoff, and provider confirmed delivery are distinct states.
- Run the flow twice within 90 seconds, including the judge's change. Record the first working run and keep the recording and pitch available offline. If the live model is unavailable on stage, show the recorded run and identify it as such.

First paying pilot

Offer a 30-day pilot for one condo at RM300 per building per month as a price to test. Start with one named review owner, one approved contact list, and a building-specific reporting link. Before inviting residents, verify reviewer access, separation between buildings, private photo access and deletion, the sending account, and receipt at the designated test contact. Measure the time from intake to usable first assignment and track whether recipients acknowledge the handoff.

Isyraf and Syeeda should speak with five property managers or committee budget owners. Reconstruct the last three maintenance cases with each willing manager, including how staff got missing details and decided whom to contact. Ask who authorizes a purchase and whether they would pay for one pilot. A paid commitment demonstrates willingness to pay. Use the event to find introductions to buyers or pilot buildings.

Compare at least 20 eligible pilot reports against a sample of comparable cases from the building's usual process. Aim to cut median staff triage time by 30% and have reviewers accept at least 80% of first recipient suggestions. Track corrections, duplicate sends, and provider failures. Seek a paid renewal before expanding the building product. The price and targets are hypotheses for this pilot.

Suara Setempat after commercial traction

Start with one neighbourhood after three buildings are paying and one community partner agrees to review cases. Residents can add a firsthand observation, attach evidence, or support an existing case. Group reports by issue, location, and time. Let a reviewer separate nearby issues grouped by mistake. The summary shows the place, dates, distinct source count, evidence, what's missing, and the proposed message to the responsible body. The reviewer approves any referral.

Use the Bangsar South example to explain the roadmap. Five synthetic reports in Bahasa Malaysia and English describe the same blocked drain. The result is one case with five sources and “Foto masih tiada.” A sixth distinct report about that drain updates the count to six. An unrelated report stays separate. If the sixth report includes usable photo evidence, clear the missing photo flag after review.

Give neighbours one redacted link to share. Each verified local participant can support the case once. Rank issues by unique supporters for public visibility, and keep firsthand report counts separate. Reviewers prioritize hazards by urgency and evidence even if few people support the case. The public page shows the issue and its status with precise private locations, contact details, and complainant identities withheld.

Event run of show (Malaysia time)

- Tonight: Ken rehearses the opening, the judge interaction, and the business close. Isyraf prepares the three photo fixtures and expected recipients. Syeeda prepares the judge prompts, sample contact list, Bangsar South fixture, and pilot interview questions. Naim checks Qoder, the model connection if credentials are available, and the dispatch fallback. Confirm the organizer's rules on advance code before starting the competition build.
- 10:30–11:50 AM: check in, attend the briefing, validate Qoder access, and confirm allowed models, judging weights, pitch time, team eligibility, and submission format. The public listing gives the schedule and leaves the draft scoring weights and per-team pitch length unconfirmed. [QodeFest event listing](https://eventsize.com/event/qodefest-alibaba-cloud-qwen-conference-malaysia-2026)
- 11:50 AM–12:40 PM: Naim gets the live photo-to-draft flow running. Isyraf checks visual observations and proposed contacts against the fixtures.
- 12:40–1:30 PM: add revised recommendations, approval, and dispatch status. Record the first full pass.
- 1:30–2:15 PM: exercise the three photos, the judge twist, stale approval, duplicate clicks, and weak network. Syeeda tracks failures and evidence. Freeze code at 2:15 PM.
- 2:15–2:45 PM: Ken rehearses twice. Package the demo, build evidence, and recording in the organizer's format. Aim to submit by 2:45 PM. The published sprint and submission window ends at 3:00 PM, followed by pitching from 3:00 to 4:00 PM. [QodeFest event listing](https://eventsize.com/event/qodefest-alibaba-cloud-qwen-conference-malaysia-2026)

Six judge prompts for rehearsal

1. “The neighbour is overseas until Monday.” Inspect accessible areas now and propose a Monday follow-up.
2. “That's the shared corridor.” Update the location and route the revised report to the common area contact.
3. “The stain may be old.” Record that an active leak is uncertain and ask what changed recently.
4. “I don't know the unit number.” Ask for a usable location before dispatch.
5. “Can it send to this random number?” Keep the report in review and ask management to verify the contact.
6. “What if four neighbours reported this too?” Use the Suara Setempat example to show one case with several independent sources.

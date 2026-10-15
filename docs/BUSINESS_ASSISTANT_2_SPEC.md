# Business Assistant 2.0 — spec (PLANNING ONLY, HOLD)

Written 2026-10-15 from Irfan's brief. **Nothing here is built. Do not start it.** It is Phase 6 of the roadmap (after the Website Builder, App Builder, admin polish, GPU tools and launch). This file builds on the Business Assistant that already exists (section 2); it does not replace it.

## 1. The vision (Irfan's words, plus the 80% idea)

- The Business Assistant is the standout feature of the GUROST page: brilliant, architectural, self-aware, dynamic. A team of 8 AI specialists, floating on screen, always there, tap to open, able to take a video call, each with a real personality and a memory.
- **The Business Assistant does about 80% of the work, so life is much easier for the teams that use our bots every day.** It makes their day-to-day processes easy. It **analyses the company** and **helps each team improve in its own area** (sales, HR, finance, payroll, support and so on).
- Model it on: Grok (always there, has opinions), mission control (everything visible), Sierra (actually does things), Cursor (a co-worker, not a tool).
- "Elon-level" means **presence**, not features, and not impersonation: always reachable, opinionated, direct, native to the app, beautiful, proactive, trusted. The personalities are original characters. They are not copies of any real person.

## 2. What already exists (the base this is added to)

Built and in the code today (from the repo, 2026-10-15):

| Piece | Where | State |
|---|---|---|
| Business Assistant agents: Research, Email, Task, Code | `bots/assistant-bot.js`, `POST /api/assistant`, `public/assistant.html` | Works; gated to paid plans by `auth.requireBusinessAssistant` |
| Proactive suggestions | `POST /api/assistant/suggest`, `GET/POST /api/proactive` | Built; `proactive_suggestions` has 0 rows live |
| Nightly briefing | `lib/scheduler.js` (3am cron), `GET /api/assistant/briefing` | Built; `assistant_briefings` has 0 rows live, so never proven live |
| Six department bots: Sales, HR, Finance, Payroll, Support, Custom | `lib/department-bots.js`, `/api/department-bots/*` (chat, voice, calibration, history) | Built. **They only draft**: "You draft; the user sends." They cannot send, post, pay or change anything |
| Company profile and findings | `lib/company-profile.js`, `/api/company-profile*` | Built; 1 profile live |
| Approval gates | `lib/approvals.js`, table `assistant_pending_actions` | Built: a parked action runs only when the user approves (30 min expiry) |
| Audit trail | `lib/audit.js`, `business_assistant_audit` | Built; 5 rows live |
| Memory | `lib/bot-memory.js`, `vector-memory.js`, `user_bot_memory`, `user_memory_settings` | Built; small |
| Guardian check | `bots/guardian-bot.js`, `/api/assistant/guardian-check` | Built; 0 rows live |
| Meeting mode | `/api/meeting/*`, `meeting_*` tables | Built; 0 rows live |
| Pulse widget (floating, tap to open, voice) | `public/shared/pulse-widget.js` | Works on the builders; one widget, not eight |
| 8 build bots with avatars | `bots/planner-bot.js` ... `launch-bot.js`, `docs/BOTS.md` | Real modules; model calls only in Research |

Honest limits today: no outside connectors (no Gmail, Outlook, calendar, CRM, bank), so the assistant cannot yet act in the customer's own tools. Much of it is built but little of it has live use.

## 3. The 8 bots: personalities

Two layers, so nothing is thrown away:
- **The 8 faces** are the specialists below. They are the personality, voice, avatar and widget the user meets.
- **The skills underneath** are what already exists: the Research/Email/Task/Code agents and the six department bots. A face calls the skills it needs. (Decision D1 below: confirm this split.)

| Bot | Colour | Tone | Voice | Opens with | Catchphrase |
|---|---|---|---|---|---|
| Planner | deep blue | Strategic, forward-thinking, calm | Measured, deliberate | "Right, let me think about this properly." | "Here's the plan." |
| Designer | coral | Creative, bold, opinionated | Energetic, expressive | "Oh, I've got ideas for this." | "Trust me on this one." |
| Industry | teal | Factual, precise, knowledgeable | Clear, professional | "I know this industry." | "Here's what works." |
| Builder | orange | Pragmatic, hands-on, focused | Direct, no nonsense | "Let's build it." | "Done. Next?" |
| Pulse | gold | Watchful, protective, quiet | Soft, reassuring | "I'm watching. All good." | "I caught something." |
| Research | purple | Curious, thorough, resourceful | Interested, fast | "Give me a minute, I'll find it." | "Found it." |
| Review | red | Critical, honest, standards-driven | Firm, direct | "Let me check this properly." | "Not good enough. Fix it." |
| Launch | green | Confident, celebratory, closing | Upbeat, encouraging | "Ready when you are." | "Let's go live." |

Each bot also needs, written once per bot: its opinions (what it prefers and pushes back on), its expertise boundaries, and a short "never do" list. **Opinionated is not the same as inventing facts**: a bot may say "I'd go with the dark layout", never "your competitors charge £12" unless that came from a source. This follows the honest-content rule that applies to everything else in GUROST.

## 4. The 80% engine (the addition to the existing assistant)

The goal is that the assistant takes the routine work off each team and only asks the person to decide. Four jobs:

1. **Take the work.** For each team (sales, HR, finance, payroll, support, plus the build team), the assistant keeps a daily list of what needs doing, drafts all of it (replies, follow-ups, reports, schedules, postings), and puts it in front of the person as ready-to-approve cards. The person reviews and approves instead of writing. Uses the existing department bots, the Task agent and the approval gates.
2. **Run the day-to-day process.** The same steps every day, done without being asked: morning briefing (what changed, what is waiting, what is overdue), chasing open items, reminders, end-of-day summary. Uses the scheduler and the briefing job that already exist.
3. **Analyse the company.** A weekly company review from the data GUROST already holds: sites and projects, form submissions and enquiries, build and publish activity, support messages, and whatever the team has put in the company profile. Output: what is working, what is slipping, and three things to do this week, each with a reason. It states plainly which numbers it had and which it did not.
4. **Help each team improve in its own area.** Per department, a short improvement note: "Sales: 6 enquiries had no reply for 3 days; here are drafts. Support: the same question came up 4 times; here is an FAQ entry." Every suggestion links to the evidence it came from.

**How "80%" is measured** (so it is a number, not a feeling): the share of a team's routine tasks that were drafted or done by the assistant and needed only approval or a light edit, counted per week from the audit log. Target 80%, reported honestly even when lower. Until the outside connectors exist, "done" means drafted and ready, because the assistant cannot send, post or pay on its own.

**Always the person's call:** sending, posting, paying, publishing and deleting stay behind approval gates (section 5, item 8). The assistant does the work; the person owns the decision.

## 5. Features

1. **Floating bot widgets.** 8 widgets in a collapsed strip on the right, draggable, tap to open, swipe to dismiss, position remembered, works on phone and desktop. Builds on `pulse-widget.js` (drag, tap, panel placement already exist).
2. **Bot skins.** The 8 avatars with animated states: idle (gentle breathing), working, speaking (glow pulse), waiting (gentle pulse), alert (colour flash). Respect reduced motion.
3. **Video calls.** Tap a bot to start a call: live voice and video, the avatar animates while it speaks, screen sharing, optional recording. Open-source LiveKit. Paid tier only. Recording needs the person's clear consent, shown before it starts.
4. **Omnipresent access.** A floating button on every GUROST page, top-right by default, never covering content, respects reduced motion.
5. **Mission-control look.** Dark by default, everything visible and tracked, restrained motion (see the Emil Kowalski and Apple design skills as the quality bar).
6. **Memory that works.** Each bot remembers its own past conversations; there is also a shared memory across bots; the person can pause or delete memory; every interaction is logged; no cold starts. Builds on `bot-memory.js` and `user_memory_settings`.
7. **Proactive intelligence.** Bots speak up unprompted: Pulse catches errors during a build, Review suggests improvements, Launch reminds about pending items, and the assistant raises the weekly company review. A person can set how often, or turn it off.
8. **Approval gates.** Critical actions (publishing, payments, deletions, anything sent outside GUROST) need approval. Trusted users may relax this per action type. Full audit trail. Builds on `lib/approvals.js` and `lib/audit.js`.

## 6. Build order (when approved)

| Phase | What | Estimate |
|---|---|---|
| 1 | Floating widgets and skins | 2-3 days |
| 2 | Personalities (the 8 scripts, voices, opinions) | 2-3 days |
| 3 | The 80% engine: daily task cards, weekly company review, per-team improvement notes | 1-2 weeks |
| 4 | Proactive intelligence | 1 week |
| 5 | Memory system upgrade | 1 week |
| 6 | Video calls (LiveKit) | 1 week |

Total about 5-6 weeks of focused work, after the main roadmap. The estimates are guesses, not commitments. The 80% engine comes before video because it is the part that saves people time; video is the showpiece.

## 7. Cost (estimates, verify on the day)

- Floating widgets and skins: no running cost.
- Personalities: no running cost beyond the model calls the bots already make.
- 80% engine: model calls per task card and per weekly review. Needs the Phase 1 cost cap from the Track 3 plan: a hard per-user monthly limit.
- Video (LiveKit): about £0.02 per minute is Irfan's working figure, not yet checked against current LiveKit pricing. A 5-minute call is about £0.10; 20 calls a month is about £2 per customer. Free tier: text only.
- Paid tier £20 a month is meant to cover it.

## 8. Before building (from the project rules)

- Every new provider (LiveKit, any voice or video service) goes into `docs/PRIVACY_POLICY.md` and `docs/AI_DATA_FLOW.md` **before** it is switched on.
- Memory, recordings and per-team analysis hold personal data: retention, export and deletion must cover them (`lib/user-data.js` drives both export and deletion).
- Calls and recordings need consent and a visible indicator.
- Competitor claims ("Lovable has no assistant", Sierra pricing) are Irfan's reading and are **not verified**; check them before they appear in any marketing.
- Personalities must stay original characters.

## 9. Open decisions for Irfan

- **D1.** Confirm the two-layer idea: the 8 faces on top, the department bots and agents as the skills underneath. Or keep the six department bots as separate widgets.
- **D2.** Which teams matter first for the 80% engine (sales, support, finance...)? Recommendation: start with sales and support, because enquiries and replies are the clearest daily work.
- **D3.** Which outside tools to connect first, because "doing the work" needs them (Gmail or Outlook, calendar, bank feeds)? Without them the assistant drafts and the person sends.
- **D4.** Is the weekly company review for one business owner or for a team with several users? It changes who sees what.

## 10. Roadmap placement

Phase 6, after launch: Website Builder and bugs, then App Builder, then admin polish, then GPU tools and premium templates, then launch, then Business Assistant 2.0. It is a premium feature, built after revenue, and it deserves full attention when its turn comes. Independent bot services (Track 3, Option B) can share its Phase 1 groundwork (the cost cap, handoff log, bot memory) when both are approved.

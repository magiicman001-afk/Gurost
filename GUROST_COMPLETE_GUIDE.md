# Gurost — Complete System Guide

60 backend files, 81 routes, 12 frontend pages. Built incrementally over many rounds — this describes what actually exists, cross-checked against the real codebase.

---

## The Story

Gurost started as "PulseAI" — an AI website/app builder. The name changed to Gurost mid-build (a full rename across every file, verified afterward with `grep`). From there it grew in rounds: the core builder, security, a testing/review pipeline, deployment (Vercel/Render/GitHub/Postgres), a Business Assistant, a Guide Bot, a Business Transformer for manufacturing/engineering clients, mobile packaging (Android via Capacitor; iOS explicitly excluded), a credit economy, an admin dashboard, team collaboration, a Meeting Co-Pilot, an internal coding assistant, a self-healing monitoring layer, and finally a full frontend.

Several requested integrations were investigated and declined with reasons on record — see "Declined Integrations."

---

## Features and What They Actually Do

**Builder Engine** — `bots/web-bot.js`, `bots/variant-bot.js`, `bots/app-bot.js`. A prompt becomes a website (4 parallel design directions) or a full-stack app (schema + backend + frontend). White-label badge toggled by plan.

**Revamp Engine** — `bots/revamp-bot.js`. Crawls a live URL, runs Lighthouse, generates a grounded audit, rebuilds with approved fixes.

**Testing Pipeline** — `bots/review-bot.js`, `bots/fix-bot.js`, `sandbox.js`. App-mode generations reviewed by severity, auto-fixed once, then actually executed in E2B to catch runtime crashes. Deploy gated on this.

**Per-Bug Credits** — `bots/bug-tracker.js`. Interactive alternative: each bug individually approved, 1 credit each.

**Plan Mode** — `bots/plan-mode.js`. 1 credit, investigation only, zero code changes.

**Checkpointing & Recovery** — `bots/checkpoint.js`, `bots/agent-spawn.js`, `backup.js`. Real git-backed saves. `backup.js` wired the previously-unused auto-checkpoint trigger and added true in-place restore.

**Deployment** — `lib/deploy.js`, `lib/github.js`, `lib/render.js`, `lib/database.js`. Website: single Vercel deploy. App: three independent deploys (Vercel/Render/Postgres), reported separately.

**Android Build & Google Play** — `lib/android-build.js`, `lib/google-play.js`. Real Capacitor + signed Gradle build in a custom E2B template. Real Play Developer API upload. Both carry external prerequisites no code can automate.

**Guide Bot** — `guide/guide-bot.js`, `guide/websocket-server.js`, `guide/memory-client.js`. Live WebSocket suggestions with a required `reasoning` field.

**Business Assistant** — `bots/assistant-bot.js`, `lib/scheduler.js`. Content generation, proactive suggestions, real nightly briefing job.

**Business Transformer** — `bots/transformer-bot.js`. Manufacturing/engineering analysis; system prompt forbids fabricated quantified claims; sketches carry an explicit non-engineering-drawing disclaimer; safety-critical suggestions flagged for expert review.

**Meeting Co-Pilot** — `meeting-bot.js`, `video-client.js`. Two consent layers: session-level (all-or-nothing) and per-snippet (each user approves independently — different users can get different summaries). Assumes browser-capture audio, not autonomous Zoom/Teams joining.

**Team Collaboration** — `team-collaboration.js`. Workspaces, invites, 4 roles, seat limits per plan.

**Personal Bots & Bot Messaging** — `personal-bot.js`, `bot-messaging.js`. Per-user bot naming; messages classified work-relevant before sending.

**Internal Coding Assistant** — `coding-assistant.js`. Real suggestions + git integration. Real-time collaborative editing explicitly not built (needs a CRDT library like Yjs).

**Credits & Billing** — `lib/billing.js`. Four tiers (Free/Pro/Unlimited/Ultimate — naming overlap flagged), real credit ledger, top-ups, low-credit flags.

**Ultimate Tier** — SSO via Supabase Auth (not hand-rolled SAML), industry-context onboarding (mechanism real, sample docs are starters), swarm task execution (parallel fan-out, not persistent learning).

**Security** — `security.js`, `auth.js`. Rate limiting, real SSRF protection (resolves DNS itself), sanitization, audit logging, RLS noted as a remaining task.

**Signup/Login** — `user-auth.js`. Real scrypt password hashing, closing a long-flagged gap.

**Smart Router** — `smart-router.js`. Real multi-provider routing (Claude/Gemini/DeepSeek/GPT-5.6). Corrects a misunderstanding: Fable 5 is Anthropic's own Mythos-tier Claude, not a separate model.

**Nanobot Swarm** — `nanobot-swarm.js`, `segment-guard.js`, `swarm-coordinator.js`, `system-healer.js`, `watchdog.js`. Guards check real syntax validity of Gurost's own files (~1000-line segments, never splitting a file mid-function). Coordinator escalates failures to the Healer, which proposes a Claude-authored fix and **stops** — never writes to disk. A human applies it via PR. Deliberate: a healer patching the platform's own running source with zero review is a different risk than one patching a single generated user site.

**Admin Dashboard** — `admin-dashboard.js`, `admin.html`, `admin-onboarding.html`, `performance.js`. One page, big numbers. Claude cost aggregate-only; "top users" ranked by credits (genuinely per-user). Response-time tracking and cost-spike alerting (trailing 24h baseline) both real.

**Notifications** — `notifications.js`, `email.js` (Postmark), `lib/notify.js` (Ntfy — push, corrected from an earlier "SMS" mislabel). In-app inbox + preferences.

**Frontend** — 12 real pages, one shared design system (`shared/styles.css`, `pulse-widget.js`, `api-client.js`). 10 of 12 wired to real endpoints (`pulse-widget.html` and `resources.html` intentionally static). Two backend gaps (`GET /api/projects`, `GET /api/me`) were exposed and closed during wiring.

---

## Architecture

```
Frontend (12 static pages, shared design system)
        |  fetch, with x-api-key or JWT
        v
Express server (server.js) -- 81 routes
        |
        +-- auth.js / security.js / user-auth.js
        +-- Bot layer (bots/*.js) -- stateless, single-shot Claude calls
        +-- lib/*.js -- Claude client, deploy targets, billing, db
        +-- Ultimate-tier modules
        +-- Meeting/coding/messaging modules
        +-- Nanobot Swarm (self-monitoring only)
        |
        v
Supabase/Postgres (persistent state -- PROJECTS map is in-memory only)
        |
        v
External: Anthropic, OpenAI, Gemini, DeepSeek, Deepgram, Vercel,
          Render, GitHub, E2B, Stripe, Postmark, Ntfy
```

Every bot is stateless — explicit input, explicit output, no growing conversation across calls. This is why "credit burn from long sessions" (an agentic-session problem) doesn't apply here.

---

## Technical Details

- **PROJECTS is an in-memory `Map`** — the single most important scaling limitation. Everything else persists to Supabase.
- **Model routing**: Sonnet default/complex, Haiku cheap/simple.
- **`lib/claude-client.js` enforces JSON-only responses** on every Claude call.
- **Near-zero speculative dependencies** — most rounds added zero new npm packages by reusing what's already there.

---

## Business Model

Free (1 project, 3 builds/mo) / Pro (£19.99, 10 projects) / Unlimited (£79.99, unlimited) / Ultimate (£99, unlimited + teams + SSO + swarm + industry). Credit top-ups: £5/50, £9/100, £20/250. Android/Play publishing and multi-provider routing additionally plan-gated.

---

## Declined Integrations (with reasons, on record)

Graphify, Ruflo, Token Reducer, ClaudeSlim, gstack, github-slim, claude-mem, Recall, turbovec, Superpowers, Impeccable — all verified real, all Claude Code CLI dev-tooling or Python/Rust-only, no Node runtime API. Hermes-Agent (real, wrong architectural fit). Taste-Skill (real, a prompt-guidance file, nothing to install). Cloudflare Sandbox (real, needs its own Worker deployment). Zvec (real, Python-only — `lib/vector-memory.js` built as the working substitute via pgvector). iOS builds (structurally impossible without real Mac/Xcode infrastructure).

---

## Known Limitations (the honest list)

1. In-memory project state.
2. Claude cost aggregate, not per-user.
3. No self-service account deletion.
4. Resources/support has no backend.
5. Industry-context docs are minimal starters.
6. No real-time collaborative editing.
7. Nanobot Swarm never writes fixes to disk — by design.
8. Voice correction uses typed text, not live audio, in this version.
9. RLS applied as one illustrative policy, not everywhere yet.
10. "Unlimited"/"Ultimate" tier names overlap confusingly.

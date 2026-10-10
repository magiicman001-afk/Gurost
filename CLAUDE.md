# GUROST — project memory

AI website/app builder. Node.js + Express (`server.js`) + Supabase + OpenRouter.
Live: https://gurost.onrender.com (Render service `srv-d9t3vbqfngtc73d49100`).
Supabase project: `jiadrorezquvthyujykb`. Test login lives in `CLAUDE.local.md`
(gitignored — this GitHub repo is PUBLIC, never commit credentials).

## Priority and team (updated 2026-10-09)
- CURRENT PRIORITY: the Website Builder to premium quality (design 8/10; it is about 4/10
  today), THEN the App Builder. App Builder work waits until the Website Builder is
  launch-ready, except fixes that already shipped.
- Source of truth: `clean-main` on GitHub. Render auto-deploys from it, so nothing is
  "live" until it is pushed, and anything not on GitHub can be lost with a machine.
- Team: Irfan (boss, non-technical founder, tests on his phone), Web Claude (day builder),
  Laptop Claude (evening tester and security work), DeepSeek (strategy / second opinion).
  Web and Laptop Claude both read this file first. `git fetch` before starting anything
  and check what the other has pushed, so work is not duplicated. (A shared
  `TEAM_STATUS.md` was proposed but is not in the repo yet.)
- Workflow: day build (Web Claude) -> evening test (Laptop Claude, Irfan on a phone) ->
  fixes next day. A bad change is undone with `git revert` (small, logged), not by
  holding commits back.

## RULES (critical — never violate)
- Only commit to `clean-main` (it auto-deploys to Render). `main` is not used.
  Never force-push. `git fetch` before every push; rebase onto `origin/clean-main`.
- PUSH RULE (since 2026-10-08): commit -> PUSH immediately. No held commits.
  Show the diff before each commit; after the commit, push at once and report the hashes.
- If a change touches more than 3 files, stop and ask first.
- Screenshot every live test (Playwright MCP).
- Never commit `.env`, `__auth-state.json` or `CLAUDE.local.md`.
- PowerShell 5.1 mangles `git commit -m` messages containing quotes — commit
  with `git commit -F <file>` from the Bash tool instead.

## Layout
- Builders: Website (`bots/variant-bot.js`, 4 design directions), App
  (`bots/app-bot.js`, schema → backend → frontend), Amend Website
  (`bots/revamp-bot.js`, audits + rebuilds an existing site, keeps its brand).
- Pulse widget: `public/shared/pulse-widget.js` (13 action buttons, voice,
  Design Mode); routes in `server.js` (`/api/pulse`, `/api/project/:id/*`).
- Business Assistant: `bots/assistant-bot.js` — Research, Email, Task, Code agents.
- Models: `lib/tier-router.js` → `lib/openrouter-client.js`. See "Model routing" below.
- Images: ROOT `image-bot.js` (`generateImage` = Gemini first, OpenAI
  fallback). `bots/image-bot.js` is a stale unused copy.
- Industry design: `lib/industry-design.js` + `lib/design-data/*.csv`
  (UI/UX Pro Max data, MIT). Matches a prompt to one of 192 industries and
  feeds its palette + fonts into variant-bot and app-bot prompts; unmatched
  prompts keep the original navy/gold text. Never put long verbatim strings
  (e.g. Google Fonts URLs) in prompts: `security.detectPromptLeak` rejects
  any output repeating 50+ chars of the system prompt.
- Project state machine: `lib/state-machine.js`.
- Projects live in an in-memory `PROJECTS` map (reset on every deploy).

## Model routing (2026-10-09)
- App Builder BACKEND, edits, Pulse: Kimi K2.6 first (`modelForAppCode`), then Sonnet 5,
  GLM-5.2, Nemotron :free. `APP_CODE_MODEL=off` restores the old chain.
- App Builder FRONTEND: GLM-5.2 first (`modelForAppFrontend`, ~130 tokens/s vs Kimi's ~27),
  24,000-token budget; `APP_FRONTEND_MODEL` swaps it, `off` uses the Kimi chain. The first
  live `[code-call] app-frontend` line (`secs=`, `chars/s=`) confirms the speed.
- Free plan / no OpenRouter credit: the client drops to the `:free` entries (Nemotron).
- Last resort (only when a key is set): `lib/free-llm-providers.js` - Gemini, Mistral
  (Codestral), Cerebras, Groq free tiers, tried after OpenRouter has nothing left.
  Env: `FREE_GEMINI_API_KEY`, `FREE_MISTRAL_API_KEY`, `FREE_CEREBRAS_API_KEY`,
  `FREE_GROQ_API_KEY` (+ `FREE_<NAME>_MODEL` overrides). Log lines start `[free-llm]`.
- Website Builder routing is unchanged; do not move it to Kimi without being asked.
- Every code call logs `[code-call] <label> model=... stop=... chars=... secs=... chars/s=...`.

## Status (2026-10-09)
- Tests: 609 (607 pass in Web Claude's sandbox; `cors-policy` and `security-headers` need
  `express` installed, which only the laptop has).
- Security (audit 2026-10-08): items 1-3 DONE - `/shared/:token` runs sandboxed, security
  headers on every page (CSP in report-only mode until `CSP_ENFORCE=1`), CORS allowlist
  (form route stays open). Item 4 (S3: sessions table, short tokens, cookie login, logout
  everywhere, admin) is IN PROGRESS with Laptop Claude: S3a WebSocket auth, S3b sessions
  table, S3c server side, S3d browser side, S3e admin dashboard.
- Money: OpenRouter balance is negative (paid models fail with 402); Gemini image API
  prepayment is depleted. Both need topping up by Irfan.
- Design-quality plan: stop asking the model to invent design. Build a section library
  (GSAP + Lenis + React Bits) and industry design systems the model assembles from. Research
  and blueprint first; no code until the blueprint is approved.

## Known bugs (open)
- Bug P: the bots all show as "Gurost Core" - each should speak with its own avatar and name.
- Bug H - PARTIAL, depends on Bug AA (live test 2026-10-09 20:47 failed): the fix `0d480d5` IS deployed (it is an ancestor of the live commit) and works while the page knows the project (states building / choosing / ready say "Pick a design first" and start nothing). But after a page refresh the page has no project (`projectState` in `public/builder.html` returns `none` when `projectId` is empty), and `none` means "start a new build" by design, so "Start building" opened "Let's get your details right first" even though the company details were already saved. Real fix: persist projects to the database and restore them on refresh (Bug AA); then Bug H closes with it. Do not call Bug H dead before that. (Replaces the old Bug Q.)
- Bug AA: a refresh (or a server restart) wipes the project: projects live in the in-memory `PROJECTS` map, which also resets on EVERY Render deploy, and the page loses its project state on refresh. Fix: persist projects (and their designs) to Supabase and reload them by project id; part of Website Builder V2. Until then: every push to `clean-main`, even a docs-only one, redeploys and can wipe a build someone is testing live.
- Bug U (HIGH): built sites use anchor-scroll instead of real page navigation. Clicking an item (e.g. "birthday cake") only scrolls the one page; it should open a real page (e.g. `/order-birthday-cake`) with a pre-filled form. Cause not yet traced (hypothesis: single-file output with `href="#..."` links). Fix inside Website Builder V2 (multi-page output plus a dead-link / `href="#"` check in the quality gate), not as a quick patch. See `docs/ADMIN_AREA_SPEC.md` section 6.
- Bug X: the word "DARK_MODE" shows in the nav of generated sites ("Luvky | DARK_MODE | ☰"). Not a template slot (no such string in the repo). Likely cause (unproven until the generated HTML is checked): `bots/variant-bot.js` line 124 asks the model for a dark-mode toggle; the model used a Material Symbols icon name (`dark_mode`) and the icon font did not load, so the name shows as text. Fix after security: (1) prompt rule - icons are inline SVG or emoji, never icon-font ligature names; (2) quality gate rejects bare icon-name tokens (`dark_mode`, `light_mode`, ...); (3) the section library later replaces it with a fixed SVG toggle the model never writes. Not blocking.
- Bug Z: verify Pulse's fix offers work end to end on a live build. By the code (`public/shared/pulse-build-brain.js`): during a build Pulse only LOGS what it noticed (contrast, 375px overflow) and says "I'll offer a fix when the build finishes"; it never auto-fixes. After the person PICKS a design, `reviewPicked` re-checks that page and shows buttons: Review (each issue with Apply / Skip), Fix all, and Skip; fixes run one at a time through the builder's Pulse edit (`sendCorrection`). Unverified live: that the buttons appear, that Apply really edits the page, and that it still works on a site with a generated image (known-broken item 1: base64 images blow the model context). Test: build, pick a design, press Apply on one contrast issue, screenshot before and after. Also: the parked-list line "Pulse Analyze ... no UI calls them" is stale for the Website Builder (the build brain calls `/api/pulse/analyze`); correct it when this bug is closed.
- Bug Y: hero image still missing on the live library build (grey gradient shown). Cause not yet traced.
- Bug L cause not proven: the dashboard was reported slow (30s+); the page now loads in
  parallel and `[dashboard] /api/projects took Xms` logs the server side. Read that line.
- RISK (S3a/S3d, WebSocket auth vs the App Builder reconnect, `ef392a6`): the page re-opens
  `/ws/guide` on every drop (`connectGenerationSocket` / `scheduleReconnect` in `app-builder.html`).
  If S3a authenticates the socket with a short-lived ticket or token, every retry must fetch a
  FRESH one, or a reconnect after ~15 minutes fails silently: the build keeps running but the
  page looks dead. An auth-error close must STOP the retry loop and send the person to login,
  not retry forever. `builder.html` and `shared/pulse-voice.js` also open `/ws/guide` (no
  reconnect there) and pass a client-supplied `userId` in the URL. When S3a lands: pull, check
  how the socket is authenticated, and fix the reconnect BEFORE S3a goes live.
- Unverified live: GLM frontend speed, early app preview (App Builder), Website Builder
  design painting at once, WebSocket reconnect.

## Verified live — 2026-09-30 (commit dcab3d1)
- Website Builder: bakery build produced all 4 designs; thumbnails styled;
  picking a direction fills Live Preview + Code panels; progress panel and
  Guide Bot suggestions stream over the WebSocket.
- Industry design: bakery prompt → Bakery/Cafe palette (#92400E / #FEF3C7)
  and Playfair Display SC + Karla, confirmed in the generated HTML.
- Gemini image generation: works in builds and via the Pulse Image button.
- Pulse buttons working: Save, View Code, Preview, Share, Image, Upload.
- Deploy: creates a Vercel deployment, but the URL redirects to a Vercel
  login (team Deployment Protection is on) — visitors can't open it.
- Download: correctly blocked on the Free plan (paid path untested).
- Storage buckets exist: `project-assets`, `avatars` (public, 5 MB).
- Env on Render (user-confirmed): OpenRouter, Supabase, Gemini, GitHub,
  Vercel, Admin JWT.

## Known broken / to fix
1. Pulse edits fail on any site with a generated image: images are inlined
   as base64 (one image ≈ 2.9M chars) and blow the model context. Fix:
   upload generated images to `project-assets`, reference by URL.
   Undo / Redo / History can't be verified until edits work.
2. Design Mode: can't reach the sandboxed preview iframe (no
   same-origin access) — needs a postMessage bridge like `code-boxes.js`.
3. `/shared/:token` pages: FIXED 2026-10-08 (4767729) - served sandboxed with their own CSP.
   Confirm on a real shared link that the page is styled.
4. Free-plan project limit counts only in-memory projects (resets each
   deploy) and there is no delete-project route, though the error tells
   users to delete one.
5. Model output quality: designs sometimes use more `IMG_n` placeholders
   than they list in `imageRequests` (left as broken images), omit the
   Tailwind CDN script, or contain literal `\n` text.
6. gpt-oss-20b often spends its whole token budget reasoning and returns
   no content — drop it from the free fallback list.
7. Pulse Image panel stays on "Generating…" after an error.
8. Variant "Corporate" brief hard-codes navy/slate; it competes with the
   industry palette.

## Later
- Veo video: `bots/video-bot.js` + `POST /api/video/generate` work in
  code, but no page calls them; Max/Custom plans only; needs a paid Gemini
  tier. Parked.
- Amend Website could offer the industry palette as an optional audit fix.

## Before launch (must do — none of this is built yet)
- Privacy policy: add a line about audit rows (user id + IP address kept in
  `business_assistant_audit`). The "Suggestions" paragraph is already in
  section 11 (T7b); the audit-rows line is NOT yet in the policy.
- "Delete my account data" route (GDPR erasure) must clear every user row:
  `user_bot_conversations`, `user_bot_memory`, `user_memory_settings`,
  `business_assistant_audit`, `proactive_suggestions`,
  `assistant_pending_actions`, plus projects and all other user data.
- A qualified adviser must review the privacy policy (IP addresses count as
  personal data).
- Per-user GitHub login (OAuth): GitHub saves use one server `GITHUB_TOKEN`, so
  every user's project lands in the owner's GitHub account. Must be per-user
  before real customers.
- Verify every backup repo is private: checkpoint repos were created PUBLIC
  until commit ac9a16c; any `gurost-checkpoint-*` repo made before then must be
  switched to private by hand. (`createRepo` is still public by default for the
  backend-deploy path; saves and checkpoints pass `{ private: true }`.)
- Verify on a real phone: voice (iPhone Safari untested), the real AI replies,
  the .ics in a calendar app, a real admin login, `DEEPGRAM_API_KEY` on Render.

## Parked (do NOT build yet)
- Section library (blueprint stage only): 15-25 sections x 3 variations, industry palettes,
  GSAP + Lenis + React Bits animation. Taste Skill, Impeccable and awesome-design.md are
  being researched as inputs. Nothing is built until Irfan approves the blueprint.
- Cookie sessions / httpOnly (security S3): Laptop Claude's piece; do not start it from here.
- Multi-language support (language picker, translated UI + Core messages, start
  with 10 languages). About a 2-3 day build; after the three builders are done.
- Document reader (T3b), live streaming voice, OAuth for Gmail/Outlook/Calendar,
  a real CRM, Postmark email digest, Pulse voice announcements of suggestions.
- Bot images: replace emojis with premium avatars (custom, premium icon pack,
  or AI-generated via FLUX). 6-8 unique bot characters with a consistent style.
  Do after the Website Builder is 100%.
- Pulse avatar: replace the basic mic-in-circle with a distinctive, ownable
  avatar (wave/pulse animation, glowing orb, stylised "C", or brain/mind icon).
  Do alongside the bot images.
- Pulse Analyze with Apply / Skip: `/api/pulse/analyze` and `bots/pulse-brain.js`
  exist, but no UI calls them, in either builder. Build the Analyze button and
  the Apply / Skip cards later, for both builders. Parked (2026-10-08).
- Mermaid diagram in View Code (file structure, component hierarchy, API
  routes): does not exist in either builder. Parked (2026-10-08), after the
  App Builder parity work.
- Model benchmarks (parked 2026-10-08, after launch or if GLM fails): Kimi K3, Le Chonk
  (Mistral 1T) and Sonnet 5 for the App Builder frontend. Compare on `[code-call]` lines
  (`secs=` and `chars/s=`), not on guesses; the sandbox cannot reach OpenRouter.
- App Builder parallel stages (next, own commit, after the GLM frontend swap is verified
  live): the frontend only needs the backend file paths, so derive the API endpoints from
  the schema and run backend and frontend together. Target: schema + max(backend,
  frontend), full build under 3 minutes.
- Real "add a page" feature for the Website Builder (Pulse answers honestly that it is
  not ready; parked 2026-10-08).
- Kimi K2: used for App Builder code only (`modelForAppCode` in
  `lib/tier-router.js`, since 2026-10-08). Website Builder routing is unchanged;
  do not move it to Kimi without being asked. `APP_CODE_MODEL=off` on Render
  restores the old chain. The App Builder FRONTEND stage uses GLM-5.2 first (since
  2026-10-08, 24,000-token budget; `APP_FRONTEND_MODEL` swaps it, `off` restores the
  Kimi chain).

## Dev tools (Claude Code side — not callable from Gurost at runtime)
- Playwright MCP: live testing. The Pulse ball animates, so open it with
  dispatched mousedown + mouseup, not `.click()`. The Pulse status log keeps
  only 8 lines — observe it with a MutationObserver.
- 21st.dev MCP: React component references (the Website Builder emits
  single-file HTML + Tailwind, so use them as a quality bar, not imports).
- UI/UX Pro Max skill: `~/.claude/skills/ui-ux-pro-max/data` is the source
  of `lib/design-data`.

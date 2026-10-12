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

## GUROST design principles (never break these)
- The user owns their code from day one.
- The user gets all keys (signing keys, API keys, database keys).
- The user can publish anywhere (no lock-in).
- No hidden lock-in: clear pricing, easy cancel.
- If we fail, we refund.
- Why: Irfan was burned by another AI builder (Emergent) that withheld keys; he paid a freelancer GBP 300+ to fix it. We NEVER do this.

## Security system (2026-10-12, spec `docs/SECURITY_SYSTEM_SPEC.md`, 5 layers)
- Week 1 DONE: log redaction (`lib/log-redact.js`), XSS scanner (`lib/xss-scan.js`, runs in the test suite; a value put in HTML must be
  escaped or carry `// xss-ok: reason`), input validation (`lib/validate.js`, on every admin write route), rate-limit table
  (`lib/rate-limits.js`), exact-pinned dependencies + Dependabot, secret scanner (`lib/secret-scan.js`; pre-commit hook
  `.githooks/pre-commit`, enabled by `npm install`; CI `.github/workflows/security.yml`; mark fake test keys `secret-scan-ok: why`).
- CI (`security.yml`) status 2026-10-12: secret scans and the full test suite PASS on GitHub. The "Dependency audit" step is RED:
  0 critical, 12 high, 25 moderate. See "HAND-OFF to Laptop Claude" below for the exact steps. The two direct packages are `aislop` (0.14.1 -> 0.18.1 per npm) and `lighthouse` (12.8.2; its
  high findings are transitive: `@puppeteer/browsers`, `basic-ftp`, `get-uri`, `extract-zip`, `braces`, `micromatch`). Needs the npm
  registry, which Web Claude's sandbox cannot reach: LAPTOP CLAUDE does `npm install aislop@<fixed> --save-exact`, checks that
  `aislop-check.js` and `bots/revamp-bot.js` still work, re-runs `npm audit`, commits `package.json` + lock. Do not weaken the gate.
  The raw job log is unreadable from the sandbox, so the workflow prints failures as annotations (`gh api .../check-runs/<job>/annotations`).
  `.secret-scan-history-ok` lists reviewed harmless history findings (history cannot be rewritten).
- Sandbox-only test failures: in Web Claude's sandbox ~30 tests fail only because packages are missing (`@supabase/supabase-js`,
  `archiver`, `ipaddr.js`, `jsonwebtoken`); they pass on GitHub CI. Tests must not depend on the network (CDN scripts are stubbed in browser tests).
- NOT done yet: CSP enforcement (report-only; allows inline scripts, so escaping is the real XSS defence), 2FA for admin, cookie
  sessions (S3, Laptop Claude), email alerts (needs Postmark env on Render), log scanner, config auditor, auto-block/revert, views.
- Next (week 2): log scanner, dependency report in admin, config auditor, alert system.

## HAND-OFF to Laptop Claude: fix the red "Dependency audit" step (written 2026-10-12, Web Claude)
Why: CI step `npm audit --audit-level=high` fails: 0 critical, 12 high, 25 moderate. Direct packages: `aislop` 0.14.1 (npm says
fixed in 0.18.1) and `lighthouse` 12.8.2 (high findings are inside its own sub-packages; npm's suggested "fix" lighthouse@12.6.1 is a
DOWNGRADE, so do not take it blindly). `@modelcontextprotocol/sdk` (high) comes in through aislop. Web Claude's sandbox has no npm
registry, so only the laptop can do this. The gate stays at `high`: do NOT lower it, and do not add `|| true`.
Note: package.json pins exact versions (a test enforces that package.json matches the lock). The comment in `aislop-check.js` still says "^0.14.0".

Steps (run in the repo root, on `clean-main`, after `git fetch` + rebase; one package per commit; show the diff; push at once):
1. `npm ci` then `npm audit --json > /tmp/before.json` and `npm audit` (read the paths: `npm audit` prints "node_modules/x ... via y").
2. aislop: `npm view aislop versions --json` and read its changelog for 0.15 to 0.18 (it is a 0.x tool: a minor bump can change
   the CLI). Then `npm install aislop@0.18.1 --save-exact` (or the newest version npm audit accepts).
3. Verify aislop still works (below). If it breaks and cannot be fixed in `aislop-check.js` in a small edit, STOP and report: do
   not delete the check. It is skipped safely (returns `skipped: true`), so a broken aislop will not crash builds, but then say so.
4. lighthouse: first find who brings each high package: `npm ls @puppeteer/browsers basic-ftp get-uri extract-zip braces micromatch`.
   a. Try the newest lighthouse: `npm view lighthouse version`; if newer than 12.8.2, `npm install lighthouse@<newest> --save-exact`.
   b. If the high items remain, add `overrides` to package.json for ONLY the vulnerable sub-packages to their fixed versions
      (for example `"overrides": {"braces": "<fixed>", "micromatch": "<fixed>"}`), then `npm install` and re-test.
   c. If lighthouse@12.6.1 (the suggested "fix") is older than what we run: it is a downgrade. Do not install it. Use (a) or (b).
   d. If neither is safe: lighthouse only runs inside `bots/revamp-bot.js` against URLs the user gives, after
      `security.assertSafeUrl`. Then record each remaining advisory in the report with why it is not reachable, and ask Irfan
      before adding an audit exception (an `audit-level` exception needs his OK and a written reason in this file).
5. `npm audit --audit-level=high` must exit 0. `npm ls` must have no "invalid". Commit `package.json` + `package-lock.json` only.
6. `node --test test/*.test.js` (all pass, including the pinning test), then push and watch the `security` workflow go green:
   `gh run list --workflow=security.yml --limit 1`; if red, read the annotations (the raw log is not readable from the sandbox):
   `gh api repos/magiicman001-afk/Gurost/check-runs/<job id>/annotations --jq '.[].message'`.

Verify aislop still works (no test covers it today, so do this by hand and add a small test if easy):
```
node -e "require('./aislop-check').runAislopCheck([{path:'a.js',content:'import fs from \"fs\";\n// This function adds two numbers\nfunction add(a,b){try{return a+b}catch(e){}}\nexport default add;\n'}]).then(r=>console.log(JSON.stringify({skipped:r.skipped,reason:r.reason,issues:(r.results||[]).map(x=>x.issues&&x.issues.length)})))"
```
Pass = `skipped:false` and at least one issue found (swallowed catch / narrative comment / unused import). `skipped:true` means the
binary `node_modules/.bin/aislop` is missing or its CLI changed (`scan --json` and `fix` are the two commands used).

Verify Amend Website still works (needs Chrome; Playwright's chromium is installed by `npm install`):
1. Lighthouse alone, no model cost, local page: start `npx http-server` or `python -m http.server 8099` in a folder with any index.html, then
   `node -e "require('./bots/revamp-bot').runLighthouse('http://localhost:8099/').then(r=>console.log(r.performance,r.seo,r.accessibility,r.bestPractices,r.failingAudits.length)).catch(e=>{console.error('FAIL',e.message);process.exit(1)})"`
   Pass = four numbers between 0 and 1 and no error. (`chrome-launcher` finds Chrome; set `CHROME_PATH` if it cannot.)
2. Crawl: `node -e "require('./bots/revamp-bot').crawl('http://localhost:8099/').then(r=>console.log(r.title,r.links.length,r.html.length))"`.
3. Whole route (uses the paid model, so only if OpenRouter has credit): sign in locally, `POST /api/revamp/audit` with
   `{"url":"https://example.com"}`; expect 200 with `issues` and `lighthouse`. Screenshot it (rule: every live test gets a screenshot).
   Note `assertSafeUrl` blocks localhost on that route, so use step 1 for local pages.
4. Also run the security-adjacent tests: `node --test test/dependencies.test.js test/xss-scan.test.js test/secret-scan.test.js`.

If anything fails: `git revert` the update commit (small, logged) and write the cause here. A red audit is better than a broken Amend Website, but tell Irfan which.

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
- Tests: 1503 (1501 pass in Web Claude's sandbox; `cors-policy` and `security-headers` need
  `express` installed, which only the laptop has).
- Section library (2026-10-11): ALL 20 sections BUILT (A/B/C each, 6 palettes; batches 1-5, 2026-10-11) in `lib/sections/`
  (`render.js`, `manifest.json` with all 20 sections, `palettes.json`, `base.css`, `assemble.js` +
  `recipes.json`, `quality-gate.js`). Behind `SECTION_LIBRARY=1`, OFF by default and NOT wired into the
  builders yet (that is Website Builder V2). Preview: `/sections-preview.html`
  (`node scripts/build-sections-preview.js` regenerates it; a test checks it is current). Irfan's verdict:
  build on it. Order: all 20 built -> Irfan reviews the full preview on his phone (WAIT for his verdict) -> Layer 2 polish (real fonts, Pixabay images, GSAP, Lenis on
  published sites, micro-interactions) -> Website Builder V2. Gate: static checks + 375px/contrast in a
  browser + Impeccable advisory (`IMPECCABLE_CLI`); on failure swap variant, then default content, then ship.
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
- Bug P: FIXED (`9f42f6c`, `0dbec59`): 8 individual bots, each with its own avatar and name.
- Bug BB: FIXED (`2008b66`): the preview page's sticky controls covered the section on phones.
- Bug S: FIXED (`4de6a05`): honest AI error messages, and a free-model rescue when a paid-only chain gets a 402.
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

## Sunday plan 2026-10-11 (11 stages, in order, each committed and pushed)
0 memory foundation (this file, `docs/SESSION_MEMORY.md`, `docs/TEAM_STATUS.md`); 1 install design tools globally (UI/UX Pro Max, Taste Skill, Impeccable, DESIGN.md example; Playwright present; ScrollCraft reference only); 2 `lib/sections/` foundation (manifest, palettes, base.css, render.js, test helper); 3 Navbar A/B/C; 4 Hero A/B/C; 5 Footer A/B/C; 6 `public/sections-preview.html` plus screenshots, then WAIT for Irfan's phone verdict; 7 assembler behind `SECTION_LIBRARY=1` (off by default); 8 quality gate with Impeccable detector; 9 documentation; 10 summary report. Status lives in `docs/TEAM_STATUS.md`; the session log in `docs/SESSION_MEMORY.md`. Hold all pushes while Irfan tests live.

## Active specs (read before related work)
- `docs/SECTION_LIBRARY_SLICE_1_PLAN.md` - Navbar, Hero, Footer detail (slots, CSS, tests); BUILT, see its status block.
- `docs/INDUSTRY_PALETTES_SPEC.md` - the six locked palettes and font pairs (contrast checked).
- `docs/WEBSITE_BUILDER_V2_SPEC.md` - dummy mode, launch flow, domain plan.
- `docs/TOOL_STACK_REVIEW.md` - the 20 tools and the 6 active ones.
- `docs/INSFORGE_INTEGRATION_PLAN.md` - Phase 2 backend (after the Website Builder launch).
- `docs/ADMIN_AREA_SPEC.md` - Admin Area (Phase 3, before launch; not built yet).

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
- Section library, Layer 2 polish (after the 20 sections exist): real fonts, Pixabay images, GSAP
  scroll-reveal / stagger / counters (hooks `data-g-*` and `data-gsap-*` already in the templates),
  Lenis smooth scroll on published sites only (OFF in the preview), micro-interactions. Layer 3 after launch.
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

# GUROST — project memory

AI website/app builder. Node.js + Express (`server.js`) + Supabase + OpenRouter.
Live: https://gurost.onrender.com (Render service `srv-d9t3vbqfngtc73d49100`).
Supabase project: `jiadrorezquvthyujykb`. Test login lives in `CLAUDE.local.md`
(gitignored — this GitHub repo is PUBLIC, never commit credentials).

## RULES (critical — never violate)
- Only commit to `clean-main` (it auto-deploys to Render). `main` is not used.
- Show the diff before EVERY commit and wait for approval. Never auto-push.
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
- Models: `lib/tier-router.js` → `lib/openrouter-client.js`. Free tier is a
  fallback list (gemma-4 :free → qwen3.8 :free → gpt-oss-20b).
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
2. GitHub button: `@octokit/rest` is required in `server.js` but missing
   from `package.json`.
3. Design Mode: can't reach the sandboxed preview iframe (no
   same-origin access) — needs a postMessage bridge like `code-boxes.js`.
4. `/shared/:token` pages: helmet's default CSP (`script-src 'self'`)
   blocks inline scripts and the Tailwind CDN, so shared sites render
   unstyled. Don't just loosen CSP — shared HTML runs on the app origin;
   serve it sandboxed (opaque origin) with its own CSP.
5. Free-plan project limit counts only in-memory projects (resets each
   deploy) and there is no delete-project route, though the error tells
   users to delete one.
6. Model output quality: designs sometimes use more `IMG_n` placeholders
   than they list in `imageRequests` (left as broken images), omit the
   Tailwind CDN script, or contain literal `\n` text.
7. gpt-oss-20b often spends its whole token budget reasoning and returns
   no content — drop it from the free fallback list.
8. Pulse Image panel stays on "Generating…" after an error.
9. Variant "Corporate" brief hard-codes navy/slate; it competes with the
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
- Verify on a real phone: voice (iPhone Safari untested), the real AI replies,
  the .ics in a calendar app, a real admin login, `DEEPGRAM_API_KEY` on Render.

## Parked (do NOT build yet)
- Multi-language support (language picker, translated UI + Core messages, start
  with 10 languages). About a 2-3 day build; after the three builders are done.
- Document reader (T3b), live streaming voice, OAuth for Gmail/Outlook/Calendar,
  a real CRM, Postmark email digest, Pulse voice announcements of suggestions.

## Dev tools (Claude Code side — not callable from Gurost at runtime)
- Playwright MCP: live testing. The Pulse ball animates, so open it with
  dispatched mousedown + mouseup, not `.click()`. The Pulse status log keeps
  only 8 lines — observe it with a MutationObserver.
- 21st.dev MCP: React component references (the Website Builder emits
  single-file HTML + Tailwind, so use them as a quality bar, not imports).
- UI/UX Pro Max skill: `~/.claude/skills/ui-ux-pro-max/data` is the source
  of `lib/design-data`.

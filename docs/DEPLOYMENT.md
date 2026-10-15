# Deploying Gurost — environment variables

Written 2026-10-13 after the biggest finding of the week: Render had no `SECTION_LIBRARY`, `PREMIUM_PIPELINE`,
`DESIGN_MEMORY` or `ESCALATION_HIERARCHY` for three days, so every build ran the old generator. This file lists every
variable the code reads (checked with a search of the code, not from memory), what it does, its default, and whether
the app works without it.

Where they live: Render → service **Gurost** → Environment. Changing one restarts the server (a build running at that
moment is cut off — change variables when nobody is building). Values are secret: never paste them into chat, a commit,
a log or a doc. Local runs read `.env` (gitignored).

**How flags read their value** (since 2026-10-13, `86ec7c5` / `8ac85b2`):
- *On-by-default* flags are on unless the variable is exactly `0`.
- *Opt-in* flags are off unless the variable is exactly `1`.
The Admin area (Software inventory) shows each switch as the code reads it.

---

## 1. Required — the app breaks without these

| Variable | What it is | Without it |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Server starts, but every database call fails: no logins, no saved projects |
| `SUPABASE_SERVICE_KEY` | Supabase **service role** key (starts `sb_secret_` or `eyJ`), not the anon key | Same as above |
| `JWT_SECRET` | Signs login tokens and the cookie sessions | Nobody can log in ("JWT_SECRET not configured") |
| `OPENROUTER_API_KEY` | Every AI model call goes through OpenRouter | No builds, no Pulse, no bots |
| `ADMIN_JWT_SECRET` | Signs admin-area logins (and draft links if `SANDBOX_LINK_SECRET` is not set) | Admin login fails; draft links stop working after each restart |

## 2. Feature switches

| Variable | Default when missing | Set it to | What it does |
|---|---|---|---|
| `TEMPLATE_AUTOCHOOSE` | **off** | `1` to switch on | "bakery in Leeds" picks a ready template (15 industries, generic layouts only) and fills it with the typed details: no model, no credits. No match = the normal builder. |
| `SECTION_LIBRARY` | **on** | `0` to switch off | Builds sites from the 20-section library (Website Builder V2). Off = the old free-written generator. |
| `PREMIUM_PIPELINE` | **on** | `0` to switch off | The 24 curated looks, the 0–100 score and the review loop. Needs `SECTION_LIBRARY` on. |
| `ESCALATION_HIERARCHY` | **on** | `0` to switch off | A design slot that fails its score escalates (retry → specialist → senior) instead of the plain loop. |
| `SENIOR_BOT_ENABLED` | **on** | `0` to switch off | The last level of the escalation chain. |
| `BUILD_LOGS_VISIBLE` | **on** | `0` to hide | The "Show build log" screen for users. |
| `DESIGN_MEMORY` | **off** (opt-in) | `1` to switch on | Learns which looks people keep, per industry, and prefers them. Opt-in on purpose. |
| `CSP_ENFORCE` | **off** (report-only) | `1` to enforce | Content Security Policy blocks instead of only reporting. Switch on only when the CSP reports are clean. |
| `SITES_DNS_READY` | **off** | `1` | Published sites answer on `<name>.gurost.com` — only once the wildcard DNS points at Render. |
| `RETENTION_JOB` | **on** | `off` | The daily data-retention clean-up (counts-only log). |

## 3. Optional — features that switch themselves off without a key

| Variable | Feature | Without it |
|---|---|---|
| `PIXABAY_API_KEY` | Stock photos and videos (first choice) | Falls back to Openverse (free, no key), then generated images |
| `UNSPLASH_ACCESS_KEY` | Unsplash photos (only if listed in `IMAGE_PROVIDER_ORDER`) | Skipped |
| `IMAGE_PROVIDER_ORDER` | Photo search order, default `pixabay,openverse,unsplash` | Default order |
| `FAL_KEY` (or `FAL_API_KEY`) | FLUX images via fal.ai (paid plans, premium hero) | Stock photo kept; free plan uses FLUX Klein via OpenRouter |
| `FLUX_MODEL` | Override of the FLUX model | Code default |
| `GEMINI_API_KEY` | Gemini images (last resort) | Image skipped when nothing else supplies one |
| `OPENAI_API_KEY` | OpenAI image fallback | Skipped |
| `DEEPGRAM_API_KEY` | Voice: speech to text, text to speech | Voice says "not set up"; typing still works |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (or `LIVEKIT_SECRET`), `LIVEKIT_URL` (starts `wss://`) | Voice rooms / meetings and bot video calls | Meetings and calls unavailable |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` (+ `SECRETS_KEY`, above) | Gmail for the assistants: drafts, send after approval, optional inbox reading (`lib/gmail.js`). Needs a Google Cloud OAuth client of type Web with the redirect `<APP_BASE_URL>/api/gmail/callback` (the Admin > Connected Tools tab shows the exact address) and the Gmail API enabled. Run `docs/migrations/2026-10-16_gmail_connections.sql`. Reads `APP_BASE_URL` or `PUBLIC_URL` for the redirect. Until Google verifies the app, only test users can connect | Gmail unavailable; the three Gmail tools are not offered |
| `VIDEO_MINUTES_PER_MONTH` | Call minutes per paid account per month (default 120; one call is at most 30 minutes) | 120 |
| `POSTMARK_SERVER_TOKEN` (or `POSTMARK_API_KEY`), `POSTMARK_FROM_EMAIL` | Email (password reset, alerts) | Password reset says email is not set up; no account is revealed |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_UNLIMITED`, `STRIPE_PRICE_ULTIMATE`, `STRIPE_PRICE_TOPUP_50`, `STRIPE_PRICE_TOPUP_100`, `STRIPE_PRICE_TOPUP_250`, `STRIPE_PRICE_BUSINESS_ASSISTANT_BASE`, `STRIPE_PRICE_BUSINESS_ASSISTANT_BOT` | Payments (not live yet) | Upgrade buttons fail; free plan works |
| `BILLING_SUCCESS_URL`, `BILLING_CANCEL_URL` | Where Stripe returns people | Code defaults |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | Deploying apps to Vercel | Deploy step unavailable |
| `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` | Saving to GitHub, admin ops | Those actions fail with a clear message |
| `RENDER_API_KEY`, `RENDER_SERVICE_ID` | Admin "redeploy" button | Button says it needs the key |
| `E2B_API_KEY`, `E2B_ANDROID_TEMPLATE_ID`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_ALIAS_PASSWORD` | App Builder sandboxes and Android builds (App Builder on hold) | Unavailable |
| `NEON_API_KEY`, `NEON_ORG_ID` | Databases for built apps | Unavailable |
| `DATABASE_URL` | Direct Postgres for the industry knowledge search (pgvector) | That search is unavailable |
| `BRAVE_SEARCH_API_KEY` | Web search for research bots | Research without web search |
| `NTFY_SERVER`, `NTFY_TOKEN` | Phone push alerts (default server `https://ntfy.sh`) | No push alerts |
| `HEADROOM_PROXY_URL` | Optional proxy for model calls | Direct calls |
| `QA_AUDIT_SECRET` | The self-contained QA audit route | Route refuses everything |
| `SANDBOX_LINK_SECRET` | Signs draft-site links | Falls back to `ADMIN_JWT_SECRET` |
| `SECRETS_KEY` | Encrypts two-step sign-in secrets (`lib/secret-box.js`); 32 random bytes, base64 | Two-step sign-in can't be set up |
| `SWARM_ADMIN_USER_ID` | Whose account the self-healing swarm reports to | Swarm reports unassigned |

## 4. Addresses and security settings

| Variable | Default | Notes |
|---|---|---|
| `PUBLIC_URL` | `https://gurost.onrender.com` | Used in emails and form endpoints. Set it when the custom domain goes live. |
| `FRONTEND_BASE_URL`, `APP_BASE_URL` | `https://gurost.onrender.com` | Links in emails and billing. |
| `CORS_ORIGINS` | Gurost's own domains + `PUBLIC_URL` + `FRONTEND_BASE_URL` | Comma-separated. Setting it REPLACES the defaults. |
| `TRUST_PROXY` | not set | Express trust-proxy setting (Render sits behind a proxy). |
| `ADMIN_EMAILS` | none | Comma-separated emails treated as admin on the user side (top plan, admin routes). |
| `SESSION_TOKEN_EXPIRY` | `24h` | Lifetime of the OLD stored login token. **Render has `30d` — see the warning below.** |
| `SUPABASE_JWT_SECRET` | not set | Verifies Supabase-issued SSO tokens (`security.js`); without it SSO sign-in is refused. |
| `SITES_ROOT_DOMAIN` | `gurost.com` | Domain for published sites. |
| `SECURITY_VIOLATION_BLOCK_THRESHOLD`, `SECURITY_VIOLATION_WINDOW_MINUTES` | `5`, `60` | IP blocking after repeated violations. |
| `RATE_LIMIT_*`, `USER_RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*` (`_MAX_REQUESTS`, `_WINDOW_MS`) | code defaults | Request limits per IP, per user, and for login. |

> **Warning — `SESSION_TOKEN_EXPIRY=30d`.** This makes the old-style login token, kept in the browser where any
> script on the page could read it, last 30 days. Once `docs/migrations/2026-10-12_user_sessions.sql` has run,
> logins use httpOnly cookies (15-minute access, 30-day stay-signed-in) and this token is no longer stored. Until then,
> it is better to set it back to `24h` (or delete the variable).

## 5. Tuning (leave unset unless there is a reason)

Model choices: `CLAUDE_MODEL`, `CLAUDE_MODEL_FAST`, `TIER_FREE_MODEL`, `TIER_MID_MODEL`, `TIER_PRO_MODEL`,
`TIER_PRO_FALLBACK_MODEL`, `TIER_COMPLEX_MODEL`, `TIER_OPUS_MODEL`, `ROUTER_*_MODEL`, `ROUTER_FREE_FALLBACK`,
`OPENROUTER_BASE_URL`, `OPENROUTER_DEEPSEEK_MODEL`, `OPENROUTER_GEMINI_MODEL`, `REVIEW_MODEL`, `RESEARCH_AGENT_MODEL`,
`SCHEMA_AGENT_MODEL`, `APP_CODE_MODEL`, `APP_FRONTEND_MODEL`, `LARGE_DOCUMENT_MODEL`, `LARGE_DOCUMENT_THRESHOLD`,
`GPT56_MODEL`.
Timings: `AI_IDLE_TIMEOUT_MS`, `APP_BUILD_TIMEOUT_MS`, `PULSE_EDIT_TIMEOUT_MS`, `LIVE_PREVIEW_INTERVAL_MS`,
`WS_KEEPALIVE_MS`, `CHECKPOINT_INTERVAL_MINUTES`, `HEALER_CONCURRENCY`, `COST_SPIKE_MULTIPLIER`,
`SWARM_HEARTBEAT_STALE_MINUTES`, `SWARM_PROPOSAL_SPIKE_THRESHOLD`.
Set by Render itself (never set by hand): `PORT`, `RENDER_GIT_COMMIT`. Local only: `GUROST_REPO_ROOT`, `IMPECCABLE_CLI`.

---

## First-time setup (a new environment, in this order)

1. **Database:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Then run every file in `docs/migrations/` in date order in
   the Supabase SQL editor (each is safe to re-run). Check: the server log has no "Supabase not configured".
2. **Logins:** `JWT_SECRET` (a long random string — e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`),
   `ADMIN_JWT_SECRET` (a different one). Optional: `SECRETS_KEY` for two-step sign-in
   (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Leave
   `SESSION_TOKEN_EXPIRY` unset (24h).
3. **AI:** `OPENROUTER_API_KEY` (with credit on the account).
4. **Address:** `PUBLIC_URL` (and `FRONTEND_BASE_URL`, `APP_BASE_URL` if different). `CORS_ORIGINS` only if the
   defaults are wrong.
5. **Photos:** `PIXABAY_API_KEY`. Optional `FAL_KEY` for premium images.
6. **Email:** `POSTMARK_SERVER_TOKEN`, `POSTMARK_FROM_EMAIL` (needed for password resets).
7. **Voice (optional):** `DEEPGRAM_API_KEY`; LiveKit trio for meetings. Bot video calls also need `docs/migrations/2026-10-15_bot_calls.sql` run in Supabase (calls refuse to start without it, so no call can go unmetered), and a paid-plan account to try them. Proactive nudges need `docs/migrations/2026-10-15_bot_nudges.sql` (nobody is nudged until it is run). Assistant memory needs `docs/migrations/2026-10-15_bot_memory.sql` (until it is run the assistants chat as before, just without remembering).
8. **Feature switches:** nothing to set — the library, premium looks and escalation are on by default. Set
   `DESIGN_MEMORY=1` when you want learning on. Leave `CSP_ENFORCE` unset until the CSP reports are clean.
9. **Admin:** `ADMIN_EMAILS`; `RENDER_API_KEY` + `RENDER_SERVICE_ID` for the redeploy button.
10. **Payments (when live):** the Stripe block.
11. Deploy, then check: home page loads; log in with a test account; start a build and look in the log for
    `[premium] <look> score=` lines (the library and premium looks are running) and **no**
    `[variant-bot] Industry design` line (that would be the old generator).

## What the live build log shows

| Running | Look for |
|---|---|
| Section library | no `[variant-bot] Industry design…`; a fallback says `[website-builder] section library failed/made no design, using the old generator` |
| Premium Pipeline | `[premium] <look> score=NN pass` (or the reason it looped) |
| Escalation | entries in the `build_logs` table (Show build log screen) |
| Design Memory | only failures are printed (`[design-memory] … failed`) |

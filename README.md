# Gurost Orchestrator

Main orchestrator + specialist bots for the Builder and Revamp engines.

## Quick Start — read this before step 5 confuses you

```bash
npm install
cp .env.example .env
# Fill in at minimum: JWT_SECRET (any random string), OMNIROUTE_API_KEY
# (server refuses to start without it — every Claude call routes
# through OmniRoute, see below)
node server.js
```

At this point the server genuinely starts and serves pages at `http://localhost:3000` — confirmed by actually running it, not assumed. **But logging in with `test@gurost.com` / `Test@123456` will not work yet**, and this isn't a bug to debug — login is real and database-backed, and there's no database configured yet at this point. Two more real steps first:

1. **Get a real Supabase connection.** Fastest path: `npx supabase start` (needs Docker) spins up a full local stack in about a minute, no account needed — it prints a real URL and keys when it finishes. Put those in `.env` as `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (the **service_role** key specifically, not anon — see the `.env.example` comment on this, it's a real, easy mistake to make). Alternatively, a free hosted Supabase project works the same way.
2. **Create the real tables.** This codebase's SQL schema is documented across the header comments of `lib/db.js`-touching files (`user-auth.js`, `lib/billing.js`, etc.) — there's no single consolidated schema file yet; each file's own header has the `CREATE TABLE` statements it needs.
3. **Seed the test account**: `node scripts/seed-test-account.js` — this calls the real signup function, the same one the actual signup page uses, so the account it creates is genuinely real, not a special-cased shortcut. Restart the server after your `.env` changes (env vars are only read once, at startup).

Then `test@gurost.com` / `Test@123456` will genuinely work at `http://localhost:3000/signup.html`.

## What else to configure as you need each piece

`npm install` runs `playwright install chromium` automatically via postinstall. If that fails in your environment, run it manually: `npx playwright install chromium`.

- **Claude**: `OMNIROUTE_API_KEY` — required for every route, server refuses to start without it. (Not `ANTHROPIC_API_KEY` — every Claude call has routed through OmniRoute since an earlier round's migration; this line was stale and regressed back at least once before, worth double-checking again in the future if you see it wrong.)
- **Deploy**: `VERCEL_TOKEN` (and `VERCEL_TEAM_ID` if deploying under a team) — required for `/api/deploy`.
- **Billing**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs for Pro (£19.99/mo) and Unlimited (£79.99/mo) created in your own Stripe dashboard — required for `/api/billing/*`. There's no way to hardcode working price IDs; they're account-specific.
- **Database**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — required now, not optional. Auth (`auth.js`) and plan-limit enforcement both read/write Supabase tables (`api_keys`, `build_events` — schema in `auth.js`'s header comment). Run that SQL before starting the server or every request will fail auth.
- **Auth**: `JWT_SECRET` if you're issuing JWTs (e.g. via Supabase Auth) for end users. API-key auth (`x-api-key` header) works off the `api_keys` table instead and doesn't need this set.
- **App-mode deploys**: `GITHUB_TOKEN` (repo-creation scope), `RENDER_API_KEY`, `DATABASE_URL` (an existing Supabase/Neon Postgres connection string). Website-mode deploys only need `VERCEL_TOKEN`.
- **Sandbox testing**: `E2B_API_KEY`. Not set → the sandbox step is skipped (reported as `skipped: true`, not treated as a failure), not a hard requirement.
- **Android builds**: `E2B_ANDROID_TEMPLATE_ID` (a *separate*, custom E2B template — not the same as `E2B_API_KEY`'s default sandbox, see Android Build below) plus `ANDROID_KEYSTORE_BASE64`/`ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS`/`ANDROID_KEY_ALIAS_PASSWORD` — your own signing keystore, there's no way to supply a working default.
- **Google Play upload**: no server-side env var — the service account JSON is passed per-request in the API call body, since it's meant to be the *user's* credential, not the platform operator's.
- **Nightly Business Assistant**: no new env vars, but requires the `scheduled_assistant_jobs`/`assistant_briefings` Supabase tables (SQL in `lib/scheduler.js`'s header comment) and — importantly — this process needs to be deployed as an always-on service, not something that spins down between requests, or the cron timer never fires.
- **Business Transformer sketches**: `OPENAI_API_KEY` — a separate provider and separate bill from Claude. Not set → `/api/transformer/sketch` fails with a clear error, everything else in the Transformer (analysis, suggestions, structuring, feedback) works without it.
- **Push notifications**: nothing required — defaults to the free public `ntfy.sh`. Requires the `notify_topics` table (SQL in `lib/notify.js`'s header comment).
- **Semantic memory / self-learning suggestions**: requires the pgvector extension enabled on your Postgres instance (`CREATE EXTENSION IF NOT EXISTS vector;` — Supabase: enable from the dashboard's Database > Extensions page) plus the `semantic_memory` table (SQL in `lib/vector-memory.js`'s header comment), and reuses `OPENAI_API_KEY` for embeddings. Not set up → the Transformer's suggestion loop falls back to recency-based history only, doesn't fail.
- **Ultimate tier**: `STRIPE_PRICE_ULTIMATE` for checkout. `SUPABASE_JWT_SECRET` for SSO (separate from `JWT_SECRET`). SQL tables from `industry-onboarding.js` (`user_industry`), `team-collaboration.js` (`workspaces`, `workspace_members`, `workspace_invites`), and `security.js`'s new `audit_log` table — all documented in each file's header comment.
- **Credits & checkpointing**: `STRIPE_PRICE_TOPUP_50/100/250` for top-up checkout. `ADMIN_EMAILS` (comma-separated) for the admin dashboard. SQL tables from `lib/billing.js` (`credit_balances`, `credit_events`), `bots/bug-tracker.js` (`bug_sessions`), `bots/checkpoint.js` (`checkpoints`), and `lib/claude-client.js`'s new `claude_usage_log` (aggregate usage logging, documented in `admin-dashboard.js`'s header). All bug-fix/plan-mode routes work without credits configured in the sense that they'll correctly error with "insufficient credits" for a zero balance — you need the `credit_balances` table's default (20, adjustable) to actually give new users something to spend.

## Deployment

Two different paths depending on `project.type`:

**Website mode** — unchanged from before: `/api/deploy` ships `project.currentHtml` to Vercel as a single static file.

**App mode** — three independent deploys, run in `lib/deploy.js`'s `deployApp()`:
1. **Frontend → Vercel.** All of `project.appFiles.frontend` (including `package.json`) gets shipped in one deployment call, letting Vercel auto-detect the framework and build it — this only works if app-bot's frontend output is a real buildable project, not a single HTML file.
2. **Backend → Render, via a fresh GitHub repo.** This is the part worth understanding, because it's not what the earlier "single deploy call" framing implied: **neither Render nor Railway accept raw files directly.** Both deploy from a Git repository. So the actual flow is: `lib/github.js` creates a new public repo under your `GITHUB_TOKEN`'s account and pushes all backend files in one atomic commit (Git Data API — blobs → tree → commit → ref update), then `lib/render.js` points a new Render web service at that repo's URL and polls until it's live (this takes a couple of minutes, it's a real build, not instant).
3. **Schema → your existing Postgres.** `lib/database.js` runs the generated DDL into a dedicated schema (`app_<id>`) inside whatever Postgres instance `DATABASE_URL` points at. This deliberately does **not** provision a new Supabase/Neon project per app — that's a real, documented capability (Supabase's Management API) but async (~1-2 min) and needs an org ID and billing context I couldn't verify with confidence blind. Schema-per-tenant on one instance is simpler, works today, and is genuinely how a lot of platforms do this early on. Mongo schemas are skipped entirely (reported as `skipped`, not `failed`) — Mongo is schemaless, there's no DDL step to run.

Each of the three is independent and reported separately in the `/api/deploy` response's `deploy` object — a failed backend deploy doesn't hide a successful frontend one.

**Not implemented, on purpose**: Railway support. Their public API is GraphQL, and I couldn't verify current mutation/field names with enough confidence to ship them — rather than guess at a schema I can't check, Render is the only backend target in this version. If you want Railway specifically, check `https://docs.railway.com/reference/public-api` for their current GraphQL schema and add a `lib/railway.js` alongside `lib/render.js`.

**Verify before trusting in production**: `lib/render.js`'s exact request/response field names (`serviceDetails`, `envSpecificDetails`, etc.) are my best-confidence read of Render's docs, not run against a live account — check `https://api-docs.render.com/reference/create-service` if `createWebService` errors on a field name. Same caveat as the Vercel payload, which has carried this warning since it was first written.

## Sandboxed Code Execution

Runs automatically as part of app-mode `/api/generate`, right after the review/fix pass, in `sandbox.js`. Writes the generated backend files into an E2B sandbox, runs `npm install`, starts the server in the background, waits a few seconds, and checks the captured log for crash signatures (uncaught errors, missing modules, port conflicts) rather than expecting a clean exit — servers don't exit 0 on success, they keep running.

If it catches a crash: one retry. The error gets turned into a synthetic Critical issue targeted at the guessed entry file (`index.js`/`server.js`/`app.js`) and sent through `fix-bot.js` once, then the sandbox runs again to confirm. **Real limitation, not smoothed over**: this only targets one file. A crash caused by a genuinely missing dependency (needs a `package.json` edit) or a bug spread across multiple files won't be fixed by a single-file patch — it'll report `pass: false` again, and `/api/deploy` will correctly block on it, but the auto-fix won't have resolved it. That's a case for you to look at manually, not something to keep retrying against.

**Scope**: Node/Express backends only, matching app-bot's default output. A detected Python/FastAPI backend reports `skipped: true` rather than attempting to run it — no `pip install` step exists here.

**What this doesn't cover, and can't from the server side**: the frontend. Actually running generated React code needs a browser. That's what WebContainers is for, and it's inherently client-side — there's no server-side stub for it here. Wire WebContainers into whatever frontend you build to preview the generated app; it doesn't belong in this Express backend.

## Security

Every `/api/*` route (except the Stripe webhook, which authenticates itself via signature) requires either an `x-api-key` header or an `Authorization: Bearer <jwt>` header. There is no login/signup or API-key-issuing endpoint in this codebase — `auth.js` verifies credentials, it doesn't create them. You need a dashboard or auth flow upstream that populates the `api_keys` table or issues JWTs signed with `JWT_SECRET`.

- **Rate limiting**: per-IP (100/15min default) applied globally before auth, so it also throttles unauthenticated brute-force attempts. Per-user (500/hour default) applied after auth, keyed by `req.user.id`. Both configurable via the `.env` vars.
- **SSRF protection**: `security.assertSafeUrl()` resolves the URL's DNS itself and checks the actual resolved IP against blocked ranges (loopback, private RFC1918 ranges, link-local/cloud-metadata, IPv6 equivalents) — not just the hostname string, since hostname-only checks don't stop DNS rebinding. Applied before every Revamp Engine crawl. **Residual risk, stated plainly**: this checks resolution at validation time; a sufficiently fast DNS-rebinding attack could still resolve differently by the time Playwright actually connects a few hundred ms later. Closing that fully means resolving once and connecting directly to the pinned IP rather than the hostname, which needs changes in `revamp-bot.js`'s Playwright/Lighthouse calls, not just the validator — not done in this version.
- **Input handling**: `security.sanitizeText()` strips control characters and caps length on freeform text (prompts, task instructions, correction instructions). It deliberately does **not** HTML-escape or strip tags from generated website HTML — that markup is the product. The actual XSS mitigation for generated sites is the iframe sandbox on whatever frontend renders them (`sandbox="allow-scripts allow-forms"`, no `allow-same-origin`), keeping generated JS isolated from your app's own origin and cookies. That sandboxing lives in your frontend, not in this backend — nothing to configure here, just don't skip it when you build the preview UI.
- **SQL/command injection**: mostly not applicable to this codebase as written — Supabase's JS client parameterizes queries (no raw SQL string-building anywhere), and nothing here shells out to `exec()` with user input. `security.sanitizeForShell()` exists as defense-in-depth if that ever changes, not because there's a current vector.
- **Request validation**: each route declares an explicit field allowlist via `security.rejectUnknownFields([...])` — extra fields in the body get rejected with a 400 and logged. Type/format checks (`express-validator`) are on the routes where it matters most (`/api/generate`, `/api/billing/checkout`); extend the same pattern to other routes as you harden further.
- **Ownership**: `auth.requireProjectOwnership()` runs on every `/api` route carrying a `projectId` and 403s if the authenticated user doesn't own that project.
- **Plan limits**: `auth.enforcePlanLimit()` counts this calendar month's `build_events` rows for the user against `{free: 3, pro: 50, unlimited: Infinity}` and 429s over the limit. Applied to `/api/generate` and `/api/revamp/rebuild` — the actual build-consuming routes, not corrections/assistant tasks.

Not covered by this layer, and worth knowing before you call it done: no protection against prompt injection via crawled site content reaching Claude in the Revamp audit (a malicious page could include text aimed at the model, not just at a browser), no CSRF protection (less relevant for a pure API consumed by a JS frontend/SDK, but relevant if you ever add cookie-based sessions), and no WAF-layer protection against generic abuse patterns (that's typically handled at the CDN/edge, e.g. Cloudflare, not in application code).

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/generate` | POST | `{ prompt, mode: "website"\|"app" }` → 4 variants (website) or full-stack files (app) |
| `/api/select` | POST | `{ projectId, variantId }` → lock in a variant |
| `/api/pulse` | POST | `{ projectId, action: "pause"\|"correct"\|"resume"\|"business", instruction? }` |
| `/api/revamp/audit` | POST | `{ url }` → crawl + Lighthouse + audit report |
| `/api/revamp/rebuild` | POST | `{ projectId, approvedFixes }` → rebuilt site |
| `/api/assistant` | POST | `{ projectId, task }` → business content, auto-routed Haiku/Sonnet |
| `/api/assistant/suggest` | POST | `{ projectId }` → proactive business suggestions (call manually — not auto-triggered yet) |
| `/api/assistant/schedule` | POST | `{ businessContext }` → subscribe to nightly drafts/briefing |
| `/api/assistant/unschedule` | POST | Unsubscribe from nightly drafts |
| `/api/assistant/briefing` | GET | Today's generated briefing, or a not-yet-ready placeholder |
| `/api/deploy` | POST | `{ projectId }` → website mode: deploys to Vercel. App mode: deploys frontend (Vercel) + backend (GitHub → Render) + schema (Postgres) — see Deployment section |
| `/api/deploy/one-click` | POST | `{ projectId }` → fresh review/fix/sandbox pass, then deploy, in one call — see One-Click Deploy section |
| `/api/mobile/android/build` | POST | `{ projectId, appId, appName? }` → wraps the app in Capacitor, produces a signed .aab |
| `/api/mobile/android/upload` | POST | `{ projectId, packageName, serviceAccountJson, track?, releaseNotes?, listing? }` → pushes to Google Play (paid plans only) |
| `/api/billing/checkout` | POST | `{ plan, email }` → Stripe Checkout URL |
| `/api/transformer/analyze` | POST | `{ businessDescription }` → structured company profile |
| `/api/transformer/suggest` | POST | Proactive improvement suggestions, grounded per profile + feedback history |
| `/api/transformer/structure` | POST | `{ focusArea? }` → workflows/roles/goals/KPIs |
| `/api/transformer/sketch` | POST | `{ description }` → illustrative concept image (paid plans only) |
| `/api/transformer/feedback` | POST | `{ suggestionId, feedback, note? }` → the learning signal |
| `/api/transformer/pulse` | POST | `{ instruction }` → voice-driven feedback or profile update |
| `/api/billing/webhook` | POST | Stripe webhook receiver (raw body, no auth header — verified by Stripe signature instead) |
| `/api/notify/setup` | POST | Get (or create) the caller's private Ntfy topic |
| `/api/industry/list` | GET | Available industry knowledge bases |
| `/api/industry/select` | POST | `{ industry }` → sets the caller's industry context (Ultimate only) |
| `/api/team/create` | POST | `{ name }` → new workspace (Ultimate only) |
| `/api/team/invite` | POST | `{ workspaceId, email, role }` → invite token, requires admin+ role |
| `/api/team/accept-invite` | POST | `{ token }` → joins the workspace |
| `/api/team/remove-member` | POST | `{ workspaceId, userId }` → requires admin+ role |
| `/api/swarm/execute` | POST | `{ task, systemPrompt }` → parallel fan-out + scored best result (Unlimited/Ultimate) |
| `/api/credits/balance` | GET | Current credit balance + low-credit flag |
| `/api/billing/topup` | POST | `{ topupId, email }` → one-time Stripe Checkout URL |
| `/api/billing/topups` | GET | List of available top-up tiers |
| `/api/bugs/find` | POST | `{ projectId }` → runs review-bot, returns individually-approvable bugs |
| `/api/bugs/approve` | POST | `{ projectId, sessionId, bugId }` → 1 credit, fixes that one bug |
| `/api/bugs/skip` | POST | `{ sessionId, bugId }` → skip without charging |
| `/api/bugs/session/:sessionId` | GET | Session summary ("N bugs fixed, N credits used") |
| `/api/plan/investigate` | POST | `{ task }` → 1 credit, planning only, no code |
| `/api/checkpoint/save` | POST | `{ projectId }` → commits project state to its checkpoint repo |
| `/api/checkpoint/list/:projectId` | GET | Checkpoint history for a project |
| `/api/checkpoint/resume` | POST | `{ checkpointId }` → new project rebuilt from that checkpoint |
| `/api/admin/snapshot` | GET | Full admin dashboard data (admin email only) |
| `/api/email/welcome` | POST | `{ to, name? }` → welcome email (server-to-server, see Email section) |
| `/api/email/waitlist` | POST | `{ to }` → waitlist confirmation |
| `/api/email/launch` | POST | `{ recipients }` → Product Hunt launch broadcast (admin only) |
| `/api/email/newsletter` | POST | `{ recipients, subject, htmlBody }` → newsletter broadcast (admin only) |
| `/api/meeting/create` | POST | `{ workspaceId?, expectedParticipants }` → new session + consent notice |
| `/api/meeting/consent` | POST | `{ sessionId, participantId, agreed }` → records one participant's consent |
| `/api/meeting/:sessionId/status` | GET | Consent status, whether the session is active yet |
| `/api/meeting/end` | POST | `{ sessionId }` → generates all summaries, returns the caller's own |
| `/api/meeting/:sessionId/summary` | GET | Fetch your own previously-generated summary |
| `ws(s)://.../ws/meeting` | WS | `?sessionId=...&userId=...` — audio frames in, `should_i_take_this_in` prompts out |
| `/api/bots/roles` | GET | Bot role registry |
| `/api/bots/trail/:contextId` | GET | Handoff log for a project/session |
| `/api/image/enhance` | POST | `{ projectId }` → sources and inserts stock images (website mode only) |
| `/api/auth/signup` | POST | `{ email, password }` → creates account, returns API key once (unauthenticated route) |
| `/api/auth/login` | POST | `{ email, password }` → returns a JWT (unauthenticated route) |
| `/api/route` | POST | `{ text }` → classifies free text to the right bot |
| `/api/smart-route` | POST | `{ text, system?, preferProvider? }` → multi-provider routing (paid plans) |
| `/api/projects` | GET | Caller's own project summaries (added during frontend wiring) |
| `/api/me` | GET | Caller's own plan/email/credit balance (added during frontend wiring) |
| `/api/swarm/run` | POST | Manually trigger a swarm cycle (admin only) |
| `/api/swarm/proposals` | GET | Pending healer fix proposals (admin only) |
| `/api/swarm/proposals/:id/review` | POST | `{ status: "approved"\|"rejected" }` — marks reviewed, does NOT apply to disk |
| `/admin-onboarding.html` | GET | Internal team setup guide (admin only) |
| `/api/admin/users/:userId/deactivate` | POST | Revokes a user's API key (admin only) |
| `/api/admin/users/:userId/reactivate` | POST | Un-revokes (admin only) |
| `/api/checkpoint/restore-in-place` | POST | `{ projectId, checkpointId }` → restores into the existing project |
| `/api/notifications` | GET | `?unread=true` optional — in-app notification list |
| `/api/notifications/read` | POST | `{ notificationId }` |
| `/api/notifications/preferences` | GET/POST | Per-channel notification preferences |
| `/api/bot/name` | POST | `{ workspaceId?, botName }` → names your personal bot |
| `/api/bot/identity` | GET | Your bot's current name |
| `/api/messages` | GET | `?unread=true` optional — bot-to-user messages |
| `/api/messages/read` | POST | `{ messageId }` |
| `/api/coding/suggest` | POST | `{ filePath, fileContent, cursorContext }` → inline suggestion |
| `/api/coding/feedback` | POST | `{ filePath, suggestion, accepted }` → stored for future recall |
| `/admin.html` | GET | Admin dashboard page |
| `/api/voice/transcribe` | POST | Raw audio body → transcript (REST fallback for non-WebSocket clients) |
| `/api/voice/speak` | POST | `{ text, voice? }` → audio (REST fallback) |
| `/api/project/:id` | GET | Full project state |
| `/api/project/:id/presence` | GET | Who's currently connected to this project's collaboration room |

## State machine

```
IDLE -> PLANNING -> BUILDING -> PAUSED -> CORRECTING -> RESUMING -> BUILDING/DONE
                        |-> DEPLOYING -> DONE -> CORRECTING (post-deploy edits)
```

Invalid transitions throw and return a 400/500 with the specific `from -> to` that was rejected — check `state` in any error response if a route behaves unexpectedly.

## Guide Bot

Proactive assistant, live over WebSocket at `/ws/guide?projectId=...&userId=...`.

Setup:
1. `DEEPGRAM_API_KEY` in `.env`
2. Run the SQL in `guide/memory-client.js`'s header comment against your Supabase project (creates `guide_preferences` and `guide_decisions` tables)
3. That's it — the socket attaches automatically when `server.js` starts

What "always active" and "self-learning" actually mean here, precisely:
- **Always active** = an analysis pass on connect, a 45s bounded interval as a floor, plus hooks meant to be called right after `/api/generate`, `/api/select`, and `/api/pulse` (correct) for a tighter "reacts right after you do something" feel — wire that in if you want it; the interval alone is a fallback, not the primary path, and isn't cross-wired to the REST routes yet in this version.
- **Self-learning** = every accept/reject and preference is stored in Supabase and fed back into the suggestion prompt next time. The model doesn't change; the context does. That's a real and useful pattern, just not literal learning.

Pulse button flow: client holds mic, sends `{ type: "pulse_audio", audioBase64, mimeType }` over the socket on release. Server transcribes via Deepgram, classifies as accept/reject/custom, applies via the correction bot if applicable, and speaks a short confirmation back via Deepgram TTS. Non-WebSocket clients can use `/api/voice/transcribe` and `/api/voice/speak` as REST fallbacks, but lose the push-suggestion side of the loop.

Also unwired in this version: the REST routes (`/api/generate`, `/api/select`, `/api/pulse`) don't currently call into the Guide Bot's socket to push a fresh suggestion after they run — the socket's own interval is the only trigger right now. Wiring that cross-call is the next real step, not a detail to gloss over.

## Testing Pipeline

Runs automatically inside `/api/generate` when `mode: "app"` — not a separate route to call.

Flow: `app-bot.js` generates backend/frontend files → `review-bot.js` reviews every file in parallel, flags issues by severity → if any Critical/High issues exist, `fix-bot.js` attempts to fix them → `review-bot.js` runs once more on the fixed files to confirm what's left → the result is attached to the `/api/generate` response as `codeReview`.

**One fix pass, not a loop.** If Critical issues survive the fix attempt, they're reported, not retried against the same code indefinitely — an issue a single fix pass can't resolve usually needs different context (a missing spec, an ambiguous requirement) that retrying won't supply.

**Deployment gate**, on `/api/deploy`:
- Any remaining Critical issue → `409`, deploy blocked, full report returned.
- Only Medium/Low remain → deploy proceeds, response includes a `warning` field naming the count.
- No `codeReview` on the project at all (website/variant builds never go through this pipeline — there's no generated backend code to review) → deploy behaves exactly as before.

**No longer a gap, updated from an earlier round of this README**: this used to note that app-mode projects had nowhere to actually deploy to even after passing the review gate. That's resolved — see the Deployment and Sandboxed Code Execution sections below for the GitHub→Render backend path and the E2B pre-deploy check.

**Cost note**: review runs one Claude call per file, in parallel. A fix pass adds one more call per file that had Critical/High issues, plus the confirmation re-review (another full pass over just the previously-fixed files). For a 5-file app-bot output with 2 files needing fixes: 5 (review) + 2 (fix) + 2 (re-review) = 9 calls, versus 5 if nothing needed fixing.

## Business Assistant — Nightly Scheduler & Morning Briefing

`POST /api/assistant/schedule` `{ businessContext }` subscribes the authenticated user to a nightly run. `GET /api/assistant/briefing` returns today's result, or a "not generated yet" placeholder if the nightly job hasn't run for that user yet. `POST /api/assistant/unschedule` turns it off.

**What "24/7" actually means here, mechanically**: `lib/scheduler.js` uses `node-cron`, an in-process timer — it only fires if the Node process is still running at 3am. That's it, that's the whole mechanism. It's not a separate worker or queue; it's the same `server.js` process you already deploy, staying up. Deploy it as Render's standard web service type (always-on), not anything that idles/spins down between requests, or nothing fires.

**Two real limitations, stated plainly**: the schedule runs in the server's own timezone, not each user's — "morning" means server-local morning unless you add a per-user timezone column and compute per-user windows, not built here. And subscriptions/results are stored in Supabase specifically so a server restart doesn't silently unsubscribe someone — but a *missed* run (server happened to be redeploying at 3am) is simply skipped, not queued or retried, in this version.

## One-Click Deploy

`POST /api/deploy/one-click` `{ projectId }` chains review-bot → fix-bot → sandbox → deploy into one call, for both website and app modes. For app-mode projects, this deliberately re-runs review and sandbox testing **fresh**, rather than trusting whatever's cached from the original `/api/generate` call — if corrections were made via `/api/pulse` since generation, the cached `codeReview`/`sandboxResult` could be stale and let a re-broken build slip through. That's an extra Claude review pass and sandbox run every time you call this versus the plain `/api/deploy`; the safety margin is the point.

`/api/deploy` (the earlier, non-one-click route) still exists and still works — it trusts the cached review/sandbox state instead of refreshing it, which is fine immediately after a fresh `/api/generate` call with no corrections in between, and cheaper.

## Android Build (Capacitor → signed .aab)

`POST /api/mobile/android/build` `{ projectId, appId, appName? }` wraps the project's web output in Capacitor and produces a signed `.aab`, stored server-side on the project (not returned in the response body — it can be tens of MB, and the next step needs it server-side anyway, not round-tripped through the client).

**Setup required before this works at all, not optional**: this runs inside a **custom E2B sandbox template** with the Android SDK, a JDK, and Gradle preinstalled. A stock E2B sandbox is a bare Linux VM — installing the full Android SDK (several GB, plus license acceptance) on every single build would make each one take 10+ minutes and be fragile. Build the template once:

```bash
# Roughly: a Dockerfile-based E2B template installing cmdline-tools,
# platform-tools, build-tools;34.0.0, platforms;android-34, and JDK 17.
e2b template build --name gurost-android -c "your Dockerfile"
```

Then set `E2B_ANDROID_TEMPLATE_ID` to that template's ID. Check E2B's current template docs (`https://e2b.dev/docs`) for the exact Dockerfile syntax — this is a one-time infra setup step, not something covered by any code in this repo.

You also need your own Android signing keystore (`keytool -genkey ...` — standard Android tooling, not Gurost-specific) and its credentials in `.env`. There's no default keystore; a generated app you didn't sign yourself can't be meaningfully "yours" on Play Store regardless.

**Assumption worth knowing about**: for app-mode projects (React frontend), the build step runs `npm run build` and expects output in `./dist` — Vite's default. app-bot.js's frontend system prompt doesn't currently guarantee a `dist` output or even that a `build` script exists; if you change how the frontend bot generates projects, update `webDir` in `lib/android-build.js` to match. Website-mode (single HTML file) has no such assumption — it just wraps the file directly.

## Google Play Upload (paid-plan feature)

`POST /api/mobile/android/upload` `{ projectId, packageName, serviceAccountJson, track?, releaseNotes?, listing? }` — gated to Pro/Unlimited plans (`402` on Free), matching how this was scoped as a paid option.

**Two hard prerequisites no amount of code here can remove:**
1. **The app must already exist in Play Console under `packageName`.** Google's API cannot create a new app listing — first publication of any app is a manual, one-time step through the Play Console UI. This endpoint pushes *updates* to an app that's already there.
2. **The service account needs to be manually granted access.** A freshly created service account (and its JSON key, which is what `serviceAccountJson` should contain) has zero Play Console permissions by default. Go to Play Console → Users and permissions → invite the service account's email → grant at least "Release to testing tracks" on this specific app. No API call can do this step for you; it's an identity/permission grant Google requires happen in their console.

**Defaults to the `internal` testing track, not `production`.** A brand-new personal Play developer account is required by Google to run a closed test with 12 testers for 14 days before it can publish to production at all — defaulting to internal avoids the endpoint confidently attempting something Google will reject regardless. Pass `track: "production"` explicitly once an account is past that gate.

**Screenshots are not generated anywhere in this codebase.** The current implementation only wires `listing`'s title/short/full description text through `edits.listings.update` — a `listing.screenshots` field isn't hooked up to `edits.images.upload`. That's a real gap, not done in this round.

## Business Transformer

Company-level feature (one evolving profile per user), not project-level like everything else in this file. Run the SQL in `guide/memory-client.js`'s header comment (`company_profiles`, `transformer_suggestions` tables) before using it.

Flow: `POST /api/transformer/analyze { businessDescription }` → Claude produces a structured profile (summary, industry, processes, org structure, goals, KPIs), stored via `memory-client.js`. `POST /api/transformer/suggest` → 1-2 proactive suggestions, informed by past feedback on prior suggestions. `POST /api/transformer/structure { focusArea }` → workflow/role/KPI structuring. `POST /api/transformer/sketch { description }` → an illustrative image. `POST /api/transformer/feedback { suggestionId, feedback }` → the actual learning signal (`helpful`/`not_helpful`/`implemented`). `POST /api/transformer/pulse { instruction }` → voice-driven version of feedback or a follow-up analysis update, same accept/reject/custom pattern as the Guide Bot and Business Assistant.

**Two things enforced in the system prompts themselves, not just written here as a caveat:**

1. **No fabricated numbers.** The suggestion prompt is explicitly forbidden from stating a specific quantified outcome ("cuts cycle time 20%") unless the user supplied the real numbers behind it — an LLM reasoning over a one-line business description has no basis for a percentage, and generating one anyway would be a confident-sounding fabrication wearing the shape of an engineering estimate. Every suggestion carries a `basis` field stating plainly whether it's grounded in something the user said or is general industry practice — check that field before treating any suggestion as more specific than it is.
2. **Sketches are not engineering drawings.** `generateSketch()` uses OpenAI's `gpt-image-2` to produce a concept illustration — image models render plausible-looking machinery with physically nonsensical details (mislabeled parts, impossible mechanisms), and none of that is dimensioned or fabrication-accurate. Every response carries a `disclaimer` field saying exactly this. If you build a UI around this endpoint, that disclaimer needs to stay visible next to the image, not get dropped for a cleaner layout — it's load-bearing, not decorative copy.

**Also worth knowing:** any suggestion touching a safety-critical process (heat, pressure, moving machinery, casting, electrical) is required by the system prompt to set `requires_expert_review: true` and to be phrased as something to discuss with a qualified engineer, not an instruction to execute. This matters specifically for the example in the original request (casting) — casting involves molten metal and real injury risk; nothing generated here should be read as authorization to change a safety-relevant process without a human engineer's sign-off.

**Same "self-learning" framing as the Guide Bot, stated again because it's easy to overstate**: feedback is stored and fed back into future suggestion prompts as context. The model itself doesn't change; what it's shown does. That's a real and useful mechanism, just not literal learning.

## Ultimate Tier (£99/month)

Six pieces, each with a real scope note — read these before assuming a feature does more than it does.

**Naming collision, not resolved, flagged again here**: `unlimited` (£79.99) already has `buildsPerMonth: Infinity`. `ultimate` (£99) also has `buildsPerMonth: Infinity` — it's differentiated by `swarmSlots`, `teamSeats`, `sso`, `industryContext`, and `whiteLabel` in `lib/billing.js`'s `PLANS`, not by build count. Both tiers claiming "unlimited" in their name is genuinely confusing marketing copy — worth renaming one before this goes in front of customers.

**SSO** (`security.js` + `auth.js`): verifies JWTs issued by Supabase Auth's built-in Enterprise SSO (configure the actual SAML/OIDC connection to your customer's identity provider in the Supabase dashboard, under Authentication > SSO — this repo does not implement SAML/OIDC protocol handling itself, on purpose, since hand-rolling that protocol layer is a well-known source of severe auth vulnerabilities). `SUPABASE_JWT_SECRET` must be set, and is a *different* signing key from this app's own `JWT_SECRET`. SSO login is additionally gated to users whose plan is actually `ultimate` — a valid SSO token from a Free-plan user is rejected, so SSO is a real plan-gated feature, not just an alternate login door open to anyone.

**Industry Onboarding** (`industry-onboarding.js`): `POST /api/industry/select { industry }`, `GET /api/industry/list`. The mechanism is real — it stores a selection and injects a context document into `assistant-bot.js`'s prompts on every subsequent call. **The three included industry documents (manufacturing, hospitality, professional_services) are minimal starter examples, not real sector expertise** — see the file's header comment. Replace/expand them with actual curated content before claiming this gives users genuine industry-trained suggestions; as shipped, it's a reasonable improvement over generic prompts, not a trained sector expert.

**Swarm Execution** (`lib/swarm.js`, `POST /api/swarm/execute`): runs N parallel Claude calls on the same task and picks the best by a scoring pass — a generalization of the pattern `variant-bot.js` already uses for 4 parallel design directions. **This is explicitly not** the "execute → score → classify failure → adjust → persist signal" continuous-learning loop from the original request — that's a substantial standalone RL-style system. What's here is single-shot parallel fan-out with feedback-scored selection; it doesn't get smarter across calls by itself. `slots` comes from `PLANS[plan].swarmSlots` (1 for Free/Pro, 2 for Unlimited, 4 for Ultimate).

**Team Collaboration** (`team-collaboration.js`): workspaces, invites (generates a token — no email-sending is wired up, you send the invite email yourself via whatever transactional email service you use), and 4 roles (owner/admin/member/viewer) enforced via `requireRole()` middleware. Seat limit checked against `PLANS[plan].teamSeats` (1 for Free/Pro/Unlimited, 20 for Ultimate). The SQL comment in the file includes an *illustrative* Postgres row-level-security policy — adapt the JWT claim path to how your actual tokens carry the user id, it's not copy-paste-exact for every setup.

**White-label** (`web-bot.js`, `variant-bot.js`): this needed something to actually exist before Ultimate could "remove" it — as of the previous round, nothing in this codebase added Gurost branding to generated output at all. Free/Pro/Unlimited builds now include a small "Built with Gurost" footer link; Ultimate's `whiteLabel: true` flag omits it, via `includeBranding` threaded through both bots' system prompts. If you'd rather not brand lower tiers at all, flip the default in `PLANS` and the two bot files.

**Audit logging** (`security.js`'s `auditLog()`): persists to a real `audit_log` Supabase table (SQL in the file), not just console output — wired into auth failures and SSO logins currently. Extend the same `auditLog()` call into other sensitive routes (deploy, team invite/remove, billing) as you harden further; it's not automatically applied everywhere yet.

**Row-level security**: mentioned in the request as a requirement — RLS is a Postgres-level control, not application code, so there's no `.js` file for it. The `team-collaboration.js` SQL comment includes one illustrative policy; every table created across this project (`api_keys`, `build_events`, `company_profiles`, `workspace_members`, etc.) should get equivalent RLS policies enabled before this is genuinely enterprise-ready — that's a real remaining task, not done wholesale in this round.

## Third-Party Tool Integrations

Nine tools were requested for integration. Here's what actually happened with each, and why — this section exists so the gap between "requested" and "wired into server.js" is explicit, not discovered later.

**Wired in, real backend integrations (2):**
- **Ntfy** (`lib/notify.js`) — push notifications, corrected from how this was originally framed: ntfy sends push notifications (its app, web push, desktop), not SMS — its own documentation explicitly distinguishes this. `POST /api/notify/setup` gets a user their private topic (see below for why it's private). Fires automatically on deploy success and when a nightly briefing is ready — both non-fatal, a notify failure never fails the underlying operation.
- **Vector memory via pgvector** (`lib/vector-memory.js`) — built as a direct substitute for Zvec. Zvec is real (Alibaba's in-process vector database), but it's a Python package (`import zvec`) with no Node.js binding found anywhere. Rather than shell out to Python for every memory operation from this Node backend, this uses pgvector — a Postgres extension — on the same `DATABASE_URL` instance already configured for schema deployment, with OpenAI embeddings (reusing `OPENAI_API_KEY` from the Business Transformer). Wired into `transformer-bot.js`'s suggestion loop: every piece of feedback gets embedded and stored, and future suggestion calls search for semantically similar past feedback, not just the most recent N by timestamp.

**Ntfy security note, not optional**: on the public `ntfy.sh` server, a topic name IS the access control — anyone who knows or guesses it can read everything published to it. A predictable topic like `gurost-user-42` would leak deploy URLs to anyone who guessed it. `lib/notify.js` generates an opaque random topic per user instead, stored in Supabase — never derive a topic from a user ID or anything guessable.

**Not wired in — Claude Code dev-tooling (6 of the 9 requested): Graphify, Ruflo, Token Reducer, github-slim, gstack, ClaudeSlim.** All six are real projects, and all six live in a developer's local `~/.claude/` configuration (skills, plugins, or MCP server configs) to make *your own* Claude Code coding sessions cheaper or more structured. None expose a Node.js runtime API — there is nothing to `require()` and nothing to call from an Express route. Install these in your own development environment if you want them; they don't belong in this deployed backend's dependency tree, same reasoning already applied to Ruflo and Graphify earlier in this build.

**Not wired in — frontend tool, not backend (1): OpenPencil.** Real, standalone AI-native design application (Electron desktop app + web app) with its own npm Web SDK (`@zseven-w/op-web-sdk`, `@zseven-w/op-web-sdk-react`). That SDK belongs in whatever frontend you build for Gurost — an Express backend has no reason to embed a design canvas tool.

## Credits, Checkpointing & Admin Dashboard

**Per-bug credit system** (`bots/bug-tracker.js`): `POST /api/bugs/find { projectId }` runs review-bot and stores each issue as an individually-approvable "bug." `POST /api/bugs/approve { projectId, sessionId, bugId }` deducts 1 credit and fixes *only that one issue* — this required a new `fixSingleIssue()` in `fix-bot.js` alongside the existing `fixFile()`, because the existing function silently skips Medium/Low severity issues (by design, for the automatic batch pipeline), which would have meant a user paying a credit for a fix that never actually happened. `POST /api/bugs/skip` marks a bug skipped without charging. `GET /api/bugs/session/:sessionId` returns the running summary ("12 bugs fixed, 12 credits used"). This is a separate, interactive flow from the Testing Pipeline's automatic batch fix (`/api/generate`, `/api/deploy/one-click`) — that one still auto-fixes Critical/High in one call and is unchanged.

**Plan Mode** (`bots/plan-mode.js`): `POST /api/plan/investigate { task }` — 1 credit, produces `{steps, risks, scope_estimate, clarifying_questions}`, writes no code. Distinct from `/api/revamp/audit`, which is specifically for auditing an existing live URL.

**GitHub Checkpointing** (`bots/checkpoint.js`): `POST /api/checkpoint/save { projectId }` commits current project files to a dedicated per-project repo named `gurost-checkpoint-<projectId>`. **Deliberately not** reusing `lib/github.js`'s `pushGeneratedRepo()` — that function names repos `gurost-<projectId>`, the same scheme `lib/deploy.js` uses for the actual backend deploy repo, and calling it here would have collided with a project's real deploy repo. Auto-checkpointing isn't a real per-project timer (this codebase's projects live in an in-memory `Map`; a `setInterval` per project would leak across restarts) — `shouldAutoCheckpoint()` is a pure function you'd call opportunistically after build-mutating routes, checking elapsed time against `CHECKPOINT_INTERVAL_MINUTES` (default 45, the midpoint of the requested 30-60 min range). It's exported but not yet wired to auto-fire from inside `/api/pulse` or `/api/generate` — that's the one piece left as a manual `/api/checkpoint/save` call in this version, not automatic yet.

**Agent Spawn** (`bots/agent-spawn.js`): `POST /api/checkpoint/resume { checkpointId }` rebuilds a project's files from a checkpoint's git tree into a fresh `PROJECTS` entry. Read the file's header comment before assuming this does what the original request implied — it does **not** solve a "credit burn from long sessions" problem, because Gurost's bots don't have that problem: every bot makes stateless single-shot calls, and the few places with history (Transformer feedback, Guide Bot decisions) already query with an explicit `.limit()`. What's here is real session resume, which is useful on its own, just not the thing originally described.

**Multi-project dashboard**: enforced in `/api/generate` against `PLANS[plan].maxProjects` (Free: 1, Pro: 10, Unlimited/Ultimate: unlimited). Counted against the in-memory `PROJECTS` map — same standing limitation as everything else tracked there: a server restart resets the count until users create new projects again, and it won't be accurate across multiple server instances if you scale horizontally.

**Credit top-ups**: `GET /api/billing/topups` lists the three tiers (£5/50, £9/100, £20/250 — price IDs from your own Stripe dashboard, same "you must create these yourself" pattern as every other Stripe price in this repo). `POST /api/billing/topup { topupId, email }` creates a one-time (`mode: "payment"`, not a subscription) Stripe Checkout session. The webhook (`/api/billing/webhook`) now actually credits the balance on `checkout.session.completed` when the session carries top-up metadata — previously that webhook just logged the event type and did nothing.

**Low-credit alerts**: every credit-spending endpoint (`/api/bugs/approve`, `/api/plan/investigate`) returns a `lowCredits: true/false` flag in its response once balance drops to `LOW_CREDIT_THRESHOLD` (5, in `lib/billing.js`) or below — that's the "chat" side. `GET /api/credits/balance` gives the dashboard side a way to check balance/low-status independent of any specific action.

**Admin Dashboard** (`admin-dashboard.js` + `admin.html`): one HTML page, served at `/admin.html`, big numbers, green/red. Enter your admin API key (an `x-api-key` belonging to a user whose email is in `ADMIN_EMAILS`) — the key is never persisted to `localStorage`, re-enter each session. Gated by `auth.requireAdmin`, which checks email against an allowlist, not plan — admin access to billing/usage data shouldn't be purchasable.

**The one number that's approximate, stated plainly**: Claude API cost on the admin dashboard is **aggregate-only across all users**, not per-user. Attributing spend to individual users would mean threading a `userId` through roughly ten bot files' `callClaude()` calls — real work, not done this round. "Top users" is ranked by credit consumption instead, which genuinely is per-user (the credit ledger always records `user_id`). Revenue is pulled live from Stripe's charges API, not estimated. The Claude cost estimate uses a hardcoded per-token rate (`CLAUDE_COST_PER_M_INPUT`/`OUTPUT` in `admin-dashboard.js`) — update it if Anthropic's pricing changes, it isn't pulled live from anywhere.

## Email (Postmark)

`email.js` — welcome, waitlist, launch announcement, newsletter. Requires `POSTMARK_SERVER_TOKEN` and `POSTMARK_FROM_EMAIL` (must be a verified Sender Signature or domain in your Postmark account — Postmark rejects sends from unverified addresses, no way around that).

**Why welcome/waitlist require auth, deliberately**: every `/api/*` route already goes through `auth.requireAuth` globally. Rather than carve out an unauthenticated exception for these two (which would make them an open spam relay — anyone could POST any email address and trigger a send), they're meant to be called server-to-server by whatever actually handles signup/waitlist, using a service-level API key, right after it creates the user record. There is no signup-issuing endpoint anywhere in this codebase — that gap has been on record since the first security round (`auth.js` verifies credentials, it doesn't create them) and isn't closed by adding email.

Launch announcement and newsletter (`/api/email/launch`, `/api/email/newsletter`) are gated to `auth.requireAdmin` specifically, not just any authenticated user — broadcast sends to a recipient list are a different risk class than one transactional email. Both use `client.sendEmailBatch()` rather than looping single sends — set up a `broadcast` message stream in your Postmark dashboard (separate from the default `outbound` transactional stream) before using these two.

## Meeting Co-Pilot

**Read this before assuming it "joins Zoom/Teams calls" autonomously — it doesn't.** `meeting-bot.js` and `video-client.js` handle the real Gurost-specific logic (consent gating, snippet classification, per-user approval, tailored summaries) and real-time transcription via Deepgram's streaming API. Getting audio *into* the pipeline assumes a client-side capture widget (browser tab audio via `getDisplayMedia`, streamed to `/ws/meeting` as 16kHz linear16 PCM binary frames) — that widget is a frontend build, not part of this backend. Autonomous Zoom/Teams bot-joining is a separate, larger capability gated behind Zoom's RTMS product, which requires registering and getting approval for a Zoom App — an external account/approval process no code here can complete for you, same category as the Google Play/Apple Developer account requirements elsewhere in this repo.

**Two consent layers, don't conflate them**: session-level consent (`POST /api/meeting/consent`) requires every expected participant — tracked by whatever label the client provides, not every attendee has a Gurost account — to explicitly agree before *any* audio is transcribed; one decline blocks the whole session. Separately, snippet-level approval happens per Gurost *user* on the call (`should_i_take_this_in` messages over the WebSocket) — each user approves or declines independently, which is why `POST /api/meeting/end` can produce a different tailored summary per user from the same meeting.

**Flow**: `POST /api/meeting/create { expectedParticipants }` → all participants consent via `/api/meeting/consent` → once everyone's agreed, connect to `wss://.../ws/meeting?sessionId=...&userId=...` and stream audio → flagged moments arrive as `should_i_take_this_in` WebSocket messages, respond with `{type: "snippet_decision", snippetId, decision: "approved"|"declined"}` → `POST /api/meeting/end` generates every participating user's summary in one pass, returns only the caller's own → `GET /api/meeting/:sessionId/summary` to fetch it again later.

**Capacity**: "up to 20 users simultaneously" — each Gurost user connected is one WebSocket client, each meeting session is one Deepgram streaming connection. Not load-tested against a real Deepgram account from here.

## Headroom (token compression)

Genuinely different from Graphify/Ruflo/Token Reducer/ClaudeSlim/gstack/github-slim — those are all Claude Code CLI dev-tooling with no runtime API, already declined earlier in this build for that reason. Headroom ships a real proxy mode explicitly designed as a transparent drop-in for any Anthropic-compatible client, which is a legitimate integration path for a backend that already calls `api.anthropic.com` over HTTP. `headroom-integration.js` + a small change in `lib/claude-client.js` route every Claude call through `HEADROOM_PROXY_URL` when set, direct to Anthropic otherwise.

**Real operational requirement, not zero-config**: `headroom proxy` has to actually run somewhere as an always-on process — a sidecar container next to this Express app, or a separate small service. Installing the `headroom-ai` package and running `headroom proxy --port 8787` is a real deployment step you do once, same category as the E2B Android template. Not run against a live proxy instance from here.

## Self-Explaining Suggestions

Both `guide/guide-bot.js` and `bots/assistant-bot.js`'s suggestion schemas now require a `reasoning` field alongside every suggestion — the system prompts explicitly forbid a generic justification that could apply to any project ("this improves your site") and require something concrete ("you're building a bakery site and most bakery sites include a menu," or "you accepted a similar change last time"). No server.js changes were needed — both bots already spread the full suggestion object (`...s`) when building their response, so the new field flows through automatically.

## Declined this round, with reasons

- **Hermes-Agent** (NousResearch) — real, but it's a standalone self-hosted daemon meant to run as its own always-on agent with its own memory/scheduling/skill system, not a library. Running it alongside Gurost would mean deploying a second, competing self-learning system next to the one already built across many rounds of this project (Guide Bot + Business Assistant + Transformer + `memory-client.js` + `scheduler.js`). Wrong architectural fit, not a missing integration.
- **Taste-Skill** — real, but it's a `SKILL.md` file meant to be loaded into Claude Code/Cursor as design guidance during development, not a runtime tool. There's nothing to `npm install`. If you want the actual goal (less generic-looking generated output), the honest equivalent is strengthening `web-bot.js`/`variant-bot.js`'s own system prompts with more specific anti-generic-design rules — a real, small task, just not "installing" anything.
- **Graphify, Ruflo** — same verdict as every prior round: Claude Code CLI dev-tooling, no runtime API, not integrated into this backend.

## Bot-to-Bot Communication, Routing, Images, and Ops (this round)

**Bot Orchestrator** (`bot-orchestrator.js`): a role registry (`BOT_ROLES`) plus a handoff log, not a background conversation between bots — every bot in Gurost is a stateless function called from a route, there's no always-running process that could "talk" independently. What's real: `recordHandoff()` is now called at the actual handoff points already in `/api/generate`'s app-mode chain (app-bot → review-bot → fix-bot → sandbox) and revamp rebuild, so `GET /api/bots/trail/:contextId` gives you a genuine audit trail of which bot handed off to which, with what, and when — that didn't exist before even though the chains themselves did.

**Image Bot** (`image-bot.js`, `POST /api/image/enhance`): real stock photo sourcing from Unsplash/Pexels/Pixabay (tried in `IMAGE_PROVIDER_ORDER`, first configured key wins), plus a Claude call that picks concrete search queries from page content (not literally "professional") and a second Claude call that inserts the results into actual HTML. Website-mode only in this version — app-mode's React frontend files aren't wired in yet.

**Advanced Routing** (`router.js`, `POST /api/route`): classifies free text into `website`/`app`/`image`/`meeting`/`assistant`/`plan`/`unclear` using the cheap model. It's a dispatcher for the "one text box" simplicity goal — it doesn't replace calling bots directly when you already know which one you want, and most routes should keep doing that.

**Zvec**: not rebuilt — `lib/vector-memory.js` already is the Zvec substitute, built two rounds ago for the identical reason (Zvec is Python-only, no Node binding).

**Performance Monitoring** (`performance.js`): `timingMiddleware` (applied globally) logs every request's duration to `request_timings`; `checkCostSpike()` compares the current hour's Claude spend against the trailing 24h hourly average (not a flat threshold, since normal usage varies by time of day) and pushes an Ntfy alert to admins if it's over `COST_SPIKE_MULTIPLIER`× (default 3), with a 30-minute cooldown so it doesn't spam. Both surfaced in `admin-dashboard.js`'s snapshot — Claude cost/usage aggregation itself already existed, this adds what was missing.

**Backup and Recovery** (`backup.js`): does not duplicate `checkpoint.js`/`agent-spawn.js` (already built). Closes two real gaps instead: `autoBackupIfDue()` is what actually calls the previously-unwired `shouldAutoCheckpoint()`, now hooked into `/api/generate` (app-mode) and `/api/revamp/rebuild`; `restoreInPlace()` (`POST /api/checkpoint/restore-in-place`) restores a checkpoint's files directly into the *existing* project rather than spawning a new one, which is what "one-click restore" usually means versus what `agent-spawn.js`'s resume did.

**Admin Onboarding** (`admin-onboarding.html`, admin-only route): a static internal checklist — access, dashboard field meanings, user deactivation (`POST /api/admin/users/:userId/deactivate`, a genuinely new capability — no revoke action existed before), error visibility, and what still needs manual external setup. Deliberately not styled as a product surface.

**Notifications** (`notifications.js`): does not rebuild email (Postmark) or push (Ntfy) — both already existed separately. Adds the missing pieces: in-app notifications (`GET /api/notifications`, `POST /api/notifications/read`) and a per-channel preference gate (`GET`/`POST /api/notifications/preferences`) that `send()` checks before firing each channel. Each channel fails independently — a missing email address doesn't suppress the in-app notification.

## Declined again this round, same reasoning as before

Nothing new declined this round — all 8 commands were either genuinely new (built) or overlapped with already-built work (gap-closed rather than duplicated). The standing declines from prior rounds (Graphify, Ruflo, Token Reducer, ClaudeSlim, gstack, github-slim, Hermes-Agent, Taste-Skill, iOS builds, Railway) still hold.

## Multi-User & Internal Coding Assistant (this round)

**Personal Bots** (`personal-bot.js`): a naming layer over `assistant-bot.js`, not a new AI engine per user — `POST /api/bot/name` lets each workspace member (`team-collaboration.js`, already built) name their bot, `runTask()` tags responses with that name.

**Bot-to-User Messaging** (`bot-messaging.js`): "work only" is enforced by classifying every outgoing message before it sends, not left as a policy note — a message judged non-work-related is dropped, not sent with a warning label. Routes through the existing notification layer (`notifications.js`), doesn't invent a new delivery mechanism.

**Internal Coding Assistant** (`coding-assistant.js`, `POST /api/coding/suggest`, `POST /api/coding/feedback`): real inline suggestions via Claude (with `lib/vector-memory.js` recalling past accepted patterns) and git integration reusing `lib/github.js`. **Real-time multi-user collaborative editing was not built** — that's what "real-time collaboration" in a Cursor-like tool actually requires, and it needs a CRDT library (Yjs is the standard choice) with its own sync server and editor bindings. That's a distinct subsystem with its own protocol, not an extension of a request/response API — faking it with naive broadcast would cause silent data loss the moment two people typed in the same file. The file's header comment has the honest breakdown; if you want this, Yjs is the starting point for a separate build.

**Multi-user (Command 3) and Private Video Calling (Command 4)**: mostly already satisfied by `team-collaboration.js` + `meeting-bot.js` + `video-client.js`, built in prior rounds — not rebuilt as `multi-user.js`/`webrtc.js`, which would have duplicated working code under new filenames.

## Frontend (Command 8, this round)

All 12 pages as real, working HTML/CSS/JS — delivered separately from this backend repo, in `gurost-frontend/`. Distinct from the earlier round's deliverable (Stitch *prompts* to paste elsewhere) — this is the actual pages.

**Shared system**: `shared/styles.css` (design tokens, nav, footer, cards, buttons, the Pulse widget's visual states) and `shared/pulse-widget.js` (hold-to-speak state transitions, nav active-link highlighting) are included identically on every page — one design system, not 12 independently-styled files that drift apart over time.

**Verified, not assumed**: every internal link across all 12 pages was checked to resolve to a real file (`for f in *.html; do grep hrefs, confirm target exists; done` — zero broken links). Every page was checked for the actual Pulse widget element, not just a CSS class reference — this caught two real misses (`signup.html` and `onboarding.html` initially had the shared CSS/JS included but the widget's HTML markup itself missing), fixed before delivery rather than shipped broken.

**Pages**: `index.html` (Landing), `signup.html`, `pricing.html`, `onboarding.html`, `builder.html` (Main Builder), `pulse-widget.html` (component showcase — the widget's 4 states in isolation, since it was listed as its own page), `templates.html`, `dashboard.html`, `resources.html`, `review.html` (Final Product), `deploy.html`, `settings.html`.

**What these are, honestly**: static HTML/CSS/JS mockups with working navigation and client-side interactivity (tab switching, form state, simulated deploy progress) — not wired to the actual backend API in this repo. Connecting them (real signup calling `/api/generate`, real Pulse widget audio capture, real deploy status polling) is the next step, not done here — that would mean rewriting them as a proper frontend framework app calling real endpoints, a different and larger task than static page delivery.

## 8-Document Batch (this round)

Eight uploaded commands, heavy overlap with prior rounds. Full breakdown:

**Real, new work — 2 pieces:**

1. **Signup/login** (`user-auth.js`, `POST /api/auth/signup`, `POST /api/auth/login`) — closes a gap flagged as far back as this repo's first security round: `auth.js` verified credentials but nothing ever issued them. Password hashing via Node's built-in `crypto.scrypt` (no new dependency). Wired into the actual frontend too, not just the backend — `signup.html`'s forms now call the real endpoints instead of faking a redirect, storing the returned API key/JWT in `localStorage` for subsequent calls.
2. **Smart Router** (`smart-router.js`, `POST /api/smart-route`) — real multi-provider routing across Claude, Gemini, DeepSeek, and GPT-5.6 (verified as a real OpenAI model, publicly released July 9 2026 — checked, not assumed). **Correction baked into the code itself**: Fable 5 is not a separate competing model to route between — it's Anthropic's own Mythos-tier Claude. Treating it as a fifth independent provider alongside Gemini/DeepSeek/GPT-5.6 misunderstood what it is; this router doesn't make that mistake. One real constraint documented in the file: `lib/claude-client.js`'s `callClaude()` always parses JSON — routing to Claude without a JSON-instructing system prompt throws, by design, rather than silently returning garbage.

**Not rebuilt — overlaps with prior rounds:**
- Meeting Co-Pilot, private video calling, multi-user/personal bots, bot-to-bot/bot-to-user messaging, internal coding assistant, real-time collaboration, self-learning engine — all already built (`meeting-bot.js`, `video-client.js`, `personal-bot.js`, `bot-messaging.js`, `coding-assistant.js`, `team-collaboration.js`, `lib/vector-memory.js`) across the last several rounds. Rebuilding them under the new filenames these documents requested (`webrtc.js`, `multi-user.js`, `learning-engine.js`, `suggestion-system.js`, `collaboration.js`) would have meant duplicating working code, not improving it.
- "Wire the 12 frontend pages to the backend" (fully) — partially true now that signup/login actually work end-to-end, but the other 11 pages remain static mockups, same honest status as before. Full wiring (real builder calling `/api/generate`, real deploy polling, dashboard showing real project data) is a larger task than this round covered — said plainly, not implied done.
- "Test and deploy to production," Product Hunt/LinkedIn/X launch prep — outside what a code-writing session can actually do. No `deploy.log` was fabricated; there's nothing to log since nothing was deployed to a live Render/Vercel account from here.

**Declined again, same tools, same reasoning as prior rounds:** Headroom (already integrated, not "already installed" the way the doc implied Graphify was — Graphify has never been integrated here, said again for clarity), claude-mem/Recall/turbovec (all real, all Claude Code dev-tooling or Python/Rust-only, no Node runtime API), Superpowers/Impeccable/gstack/Page Agent (Claude Code skill-marketplace plugins, not backend libraries).

## Nanobot Swarm (self-monitoring — operates on Gurost's own source, not user projects)

**Scoping decision made before writing any code**: the request asked for "auto-repair — fixes errors without human intervention." That's not built. Every other self-correcting mechanism in this codebase keeps a human in the loop before a fix touches anything real (`bug-tracker.js`'s per-bug approval, the deploy Critical-issue gate) — a healer that live-patches Gurost's own running source with zero review is a different risk category than one patching a single generated user site.

`segment-guard.js` groups Gurost's real `.js` files into ~1000-line segments (never splitting a file mid-function) and runs `node --check` — a real, narrow signal, **not** a bug detector; it only confirms a file still parses. `swarm-coordinator.js` runs all guards, logs agent-to-agent messages to `swarm_messages`, escalates failures. `system-healer.js` generates a genuine Claude-authored proposed fix and stores it — **and stops there, never writing to disk.** `watchdog.js` alerts if the swarm hasn't run recently or the healer is generating an unusual number of proposals.

Runs on a schedule (`node-cron`, default every 30 min) alongside the Business Assistant scheduler. `POST /api/swarm/run` (admin-only) triggers manually. `GET /api/swarm/proposals` lists pending fixes; `POST /api/swarm/proposals/:id/review` marks approved/rejected — "approved" means a human should apply it via a normal PR.

## Frontend Wiring (10 of 12 pages)

All pages except the Pulse Widget showcase and Resources (both intentionally static — see below) are wired to real endpoints via `shared/api-client.js`. Two backend gaps were exposed and closed during this pass: `GET /api/projects` and `GET /api/me` didn't exist — Dashboard and Settings had nothing to call.

**Real, not simulated**: signup/login, generation (variants + selection), corrections, one-click deploy with real per-component status, review checklist pulling actual `codeReview`/`sandboxResult`, template generation (reuses the real generation pipeline, no fake template database), Stripe checkout.

**One stated limitation**: the Pulse button's "release" on `builder.html` sends whatever's typed in the correction textarea, not live microphone audio — real voice capture needs `MediaRecorder` plus a streaming transcription pipeline, a separate build from wiring a static page to existing REST endpoints.

**Two pages left static, on purpose**: Resources (no backend for docs/support exists anywhere in this codebase) and the Pulse Widget page (explicitly a component showcase).

## Testing & Documentation

`TESTING.md` — step-by-step guide covering every real feature, explicit about what's testable vs not built. `GUROST_COMPLETE_GUIDE.md` — full system documentation, cross-checked against the actual file/route count.

## System Protection (Gurost internal-info leak prevention)

Seven layers were requested. Three of them, as literally specified, would either break the actual product or provide no real security benefit — declined or rebuilt as their real, working equivalent instead. All seven addressed below, honestly.

**1. System prompt guardrails — built, but centrally, not per-bot.** `security.js`'s `withGuardrail()` appends one clause to every system prompt, applied once in `lib/claude-client.js`'s `callClaude()` rather than copy-pasted into ~15 separate bot files. Every Claude call in this codebase goes through that one function, so this is genuinely global, not aspirational.

**2. Input keyword-blocking — NOT built as specified.** The requested blocklist (`database`, `architecture`, `API key`, `backend`, `pricing model`, etc.) contains completely normal words for a website/app builder's own users to type — "add a database to my app," "what's your pricing model," "help me with the backend" are real product usage, not attacks. Blocking on literal keyword match would false-positive on legitimate requests constantly while doing nothing against an actual attacker, who rephrases around a static list in seconds. Not implemented this way — see #7 (detection) for what actually catches real leak attempts.

**3. Response filtering — NOT built as specified, for a sharper reason: it would break already-shipped features.** `app-bot.js`'s entire job is generating a real database schema as its output. `review-bot.js` exists specifically to flag things like "hardcoded API key" as a genuine security finding in generated code. Scanning Claude's output for those phrases and replacing them would censor the product's own correct, intended output. Not implemented.

**4. Auth + rate limiting — already existed, extended.** API-key/JWT auth was already required globally. Rate limiting (100 req/15min per IP, 500/hr per user) already existed. New this round: `security.trackViolation()` + `security.checkIpBlocked` — an IP is blocked after 5 violations within 60 minutes (both configurable), wired into auth failures and SSRF-blocked URL attempts as the two real existing choke points. Not retrofitted into every error path in the app — extend `trackViolation()` calls to more call sites as you find real attack surfaces worth tracking, don't assume blanket coverage.

**5. Prompt "obfuscation" via 3-part splitting — built exactly as asked, but it is not a security control, and nothing here pretends otherwise.** `prompt-parts.js` stores the 3 requested strings separately and combines them at runtime. Read its header comment: splitting a string across 3 constants changes where it lives in source code, not what Claude receives — the assembled prompt is byte-identical to what an unsplit constant would produce. If a model can be talked into reciting its instructions, it recites the same thing regardless of storage layout. This file exists because it was explicitly requested; the real leak protection is #1 + #7.

**6. Logging & monitoring — extended, not duplicated.** `security.auditLog()` already existed and already logs to a real `audit_log` table. This round adds `security_violations` (every tracked violation, with IP and type) and `blocked_ips` (the actual blocklist `checkIpBlocked` reads from) as separate, purpose-built tables rather than overloading the general audit log.

**7. Tokenized access — mostly already real, two genuine changes.** API-key/JWT auth already existed. Two things changed: JWT expiry is now configurable via `SESSION_TOKEN_EXPIRY`, defaulting to the requested 24h (**was hardcoded to 7 days before this round — this is a real behavior change**, users now re-authenticate daily instead of weekly, not a cosmetic config addition). "Tokens cannot access system prompts" wasn't built as separate code because it's already structurally true — no endpoint anywhere in this API returns a system prompt to a client, so there's nothing for a token permission system to gate. "Token usage is logged" — logging every successful authenticated request would be extremely high-volume and mostly noise; what's actually useful for security monitoring (and is what's built) is logging failures and violations, not every success.

**The actual new detection mechanism, underlying #1 and #7's real value**: `security.detectPromptLeak()` compares Claude's raw output against its own system prompt for a 50+ character verbatim overlap. This is precise where keyword-blocking is not — legitimate structured JSON output essentially never coincidentally reproduces a long run of prose instructions, so a match is a strong true-positive signal rather than a guess. On detection: the attempt is logged as a tracked violation (contributing toward that IP's block threshold) and the caller receives the exact decline message requested ("I cannot share internal system details. I'm here to help you build.") instead of the leaked content.

**Honesty about the ceiling here, not a guarantee of "no leaks"**: prompt-based defenses (item #1) are a known-imperfect category — a sufficiently creative injection can sometimes still get partial information out of any LLM-based system, and that's a property of how these models work, not a bug specific to this implementation. What's built here meaningfully raises the bar and catches the actual leak event precisely when the model's own prompt text appears verbatim in output; it is not an absolute guarantee, and no honest implementation of this request could claim one.

## Better Default UI, Easier Backend Setup, Real-Time Collaboration (this round)

Three features requested. All three needed real scoping decisions before writing code — documented here, not just in commit comments.

### Better Default UI

**Read this before assuming Gurost now has one consistent look.** There are two different, incompatible visual languages in this codebase: this 12-page app (`gurost-frontend/`, `#FF3B5C` brand, plain custom CSS) and the separately-built landing page (`gurost-landing-v2/`, gold/orange gradient, Material-style tokens), built in different rounds by different requests. This round polished the *app* pages' existing design system in place — better shadows (`--shadow-sm/md/lg`), a real focus-visible state for keyboard users (didn't exist before on buttons/links, only on inputs), hover lift on cards and buttons, tighter heading letter-spacing. It deliberately did **not** merge the two brands or introduce a third look — which one should win is a real decision for you to make, not something to silently resolve by picking one in a UI-polish pass. Say the word if you want that unification done as its own task.

### Easier Backend Setup

**Two different things this could mean, and they have very different ceilings.** Deploying *Gurost's own platform backend* (this `server.js`) can never be truly zero-config — it needs real credentials only you can obtain (`OMNIROUTE_API_KEY`, Stripe keys, a Supabase project, etc.). No code can auto-generate someone else's API key. That's not a gap to close, it's a property of what an API key is.

What genuinely *can* be one-click, and now is more completely: deploying a **generated app's** backend, frontend, and database together (`POST /api/deploy/one-click`, already existed). This round's real addition is `lib/neon.js` — when `NEON_API_KEY` is set (a real credential you obtain once, as the Gurost operator), every individual generated app gets its **own real Neon Postgres project**, provisioned automatically via Neon's Management API, with zero manual steps for that specific app. Falls back to the original shared-schema approach (`DATABASE_URL`, one instance, namespaced schema per app) when `NEON_API_KEY` isn't set — neither path is "wrong," they're a real isolation-vs-simplicity tradeoff, not a strictly-better-strictly-worse pair.

**A real gap I found and closed while building this, not left silent**: provisioning a database is pointless if nothing deployed can actually reach it. `lib/render.js`'s backend deploy didn't support environment variables at all before this round — a freshly provisioned Neon database had no way to hand its connection string to the backend that needs it. Added `envVars` support to the Render deploy call, and reordered `deployApp()` in `lib/deploy.js` so the database provisions *before* the backend deploys specifically so `DATABASE_URL` can be passed through. If database provisioning fails, the backend still deploys anyway (without a working `DATABASE_URL`) rather than blocking on it — a live backend you can debug is more useful than no backend at all.

**Verify before trusting in production**: `lib/neon.js`'s exact response field names (`connection_uris[0].connection_uri`, etc.) match Neon's documented project-creation response shape as of writing, not run against a live account — same standing caveat as every other external API integration in this repo (Vercel, Render, Google Play all carry the identical warning).

### Real-Time Collaboration

**A real pre-existing bug got fixed as part of this, not just a new feature added.** Before this round, if two users triggered corrections on the same project close together, both would read the same starting HTML, both call Claude, and whichever write landed second would silently overwrite the first — no error, nothing telling anyone a change was lost. This was already possible before "collaboration" was ever requested; multiple users hitting the same project was never actually safe.

**What's built**: `lib/project-lock.js` — a per-project async mutex (verified by actually running it under concurrent load before wiring it anywhere real, not just assumed correct) that serializes corrections to the same project while leaving different projects fully concurrent. `guide/websocket-server.js` (already existed for the Guide Bot) now tracks every connection to a project as a shared "room" — real-time presence (who else is here) and a live broadcast of every applied change to everyone watching, not just whoever triggered it. Wired into `builder.html`: a presence bar in the top bar, and a toast distinguishing "a collaborator just changed this" from your own tab's "Saved" status.

**What "real-time collaboration" does NOT mean here, on purpose**: this is not simultaneous conflict-free editing (two people typing into the same document at once, merged live). Gurost's "changes" are whole-document AI regenerations, not fine-grained text edits — there's no coherent way to "merge" two different complete rewrites of the same HTML the way character-level CRDTs merge concurrent text edits. What's actually built is the honest, correct version of collaboration for this kind of system: **serialized correction + live presence + live sync**, not simultaneous merge. Same category of limitation already stated for `coding-assistant.js`'s declined real-time editing a few rounds ago — consistent, not contradicted.

**On "the 20-bot system"**: checked before building anything, since I wasn't going to just repeat an unverified number back. Actual count of distinct Claude-calling modules across `bots/`, `guide/`, and the root-level bot files is approximately 17-18, not a clean 20. Collaboration (presence, locking, broadcast) operates at the transport/coordination layer — it doesn't care which specific bot handled a given task, so this works uniformly regardless of the exact count.

## AI Gateway: OmniRoute (this round)

Every model call in Gurost — every bot, not just the Smart Router — now routes through [OmniRoute](https://omniroute.online), a local, OpenAI-compatible AI gateway, instead of hitting each provider directly.

**Scope note, said upfront rather than discovered later**: the request listed `server.js`, `smart-router.js`, `.env.example`, and `README.md` as the files to update. That list doesn't include `lib/claude-client.js` — but that's the one function every single bot in this codebase (~17-18 of them) actually calls to reach Claude. Leaving it pointed at Anthropic directly would have made "all requests should go through OmniRoute" false for the overwhelming majority of Gurost's actual traffic. Updated it too, and added one new file not in the original list either: `lib/omniroute-client.js` — a single shared implementation of the OmniRoute request/response shape, used by both `claude-client.js` and `smart-router.js`, so there's exactly one place this logic lives rather than two slightly-different copies that could drift out of sync.

**This is a real format change, not just a URL swap.** OmniRoute is OpenAI-compatible (`/v1/chat/completions`), not Anthropic-compatible (`/v1/messages`) — verified against OmniRoute's actual docs before writing any code, not assumed. Concretely: system prompts now go inside the `messages` array as a `{role: "system"}` entry instead of a separate top-level `system` field, and the response comes back as `choices[0].message.content` instead of `content[0].text`. `lib/omniroute-client.js` handles this translation in one place so every caller still uses the same `{system, messages, maxTokens}` shape they always did — nothing about how bots call `callClaude()` changed, only what happens underneath.

**Operational caveat that matters if this is ever deployed anywhere but a dev machine**: `OMNIROUTE_BASE_URL` defaults to `http://localhost:20128/v1`, matching a local OmniRoute instance. That only resolves if Gurost's backend and OmniRoute are running on the *same machine*. If this backend gets deployed (Render, etc.) while OmniRoute stays on a developer's laptop, the deployed backend cannot reach it — you'd need OmniRoute's hosted gateway or a self-hosted instance reachable from wherever this backend actually runs, and `OMNIROUTE_BASE_URL` pointed at it.

**Provider credentials moved, and this is a real simplification, not just a relocation**: before this round, Smart Router needed `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, and reused `OPENAI_API_KEY` — three separate credentials in Gurost's own `.env`, each wired to a hardcoded vendor-specific fetch call. Now there's one credential (`OMNIROUTE_API_KEY`) and OmniRoute itself manages the upstream provider keys in its own dashboard. `GEMINI_API_KEY` and `DEEPSEEK_API_KEY` are no longer read anywhere in this codebase — removed from `.env.example` rather than left as dead entries that would misleadingly suggest they still do something.

**`headroom-integration.js` interaction, explicit rather than silently overridden**: that file previously redirected where Claude calls went, for token-compression purposes. Checked after making this change: nothing in the codebase requires it anymore — it's genuinely orphaned now, not in some standby/fallback role. The file itself still exists and its logic is still valid if you want it back; if you want both token compression *and* multi-provider routing, the way to get both is pointing `OMNIROUTE_BASE_URL` at a Headroom proxy that itself forwards to your real providers, and re-wiring that import into `claude-client.js` yourself — not something this round did, since the explicit instruction was that OmniRoute alone should be where everything goes.

**Smart Router got structurally simpler as a side effect**: it used to contain four separate hardcoded fetch functions, one per vendor, each with its own URL/auth/request-shape. Now there's one shared call (`callViaOmniRoute`) parameterized by model name for the three non-Claude providers, plus the existing Claude path (unchanged in behavior — still requires a JSON-instructing `system` prompt, same as always, since that constraint comes from Gurost's own `callClaude()` contract, not from which gateway sits underneath it).

**Not verified against a live OmniRoute instance from here** — same standing caveat as every other external API integration in this codebase (Vercel, Render, Google Play, Neon all carry the identical warning). If a model name isn't resolving, check `GET {OMNIROUTE_BASE_URL}/models` against what's configured in `CLAUDE_MODEL`/`CLAUDE_MODEL_FAST`/`OMNIROUTE_GEMINI_MODEL`/`OMNIROUTE_DEEPSEEK_MODEL`/`GPT56_MODEL`.

## Business Assistant Billing, Updates, and Developer Onboarding (this round)

**Billing.** A new pricing dimension — base + per-bot seat, not a flat plan — added to `lib/billing.js` alongside the four existing flat plans. Real, current Stripe mechanism: a plain per-unit recurring price with a code-managed quantity (`stripe.subscriptionItems.update()`), not Stripe's old Usage Records API, which was removed as of API version `2025-03-31.basil` and replaced by a Meters API meant for continuously-reported consumption — checked against current Stripe docs before writing any of this, not assumed from training data. "Extra bots" is a discrete, admin-set seat count, so the simpler quantity-update mechanism is the correct fit, not the newer Meters API.

**Naming collision flagged, not resolved silently**: the existing `ultimate` plan is also £99/month. Shipping two different products at the same price point under different names is a real source of customer confusion — worth a deliberate decision before launch, not something this round decided on your behalf.

**Per-workspace Claude usage attribution — closed a gap flagged three separate rounds running.** `lib/claude-client.js` now accepts and logs `{userId, workspaceId}` per call; wired through both real `assistant-bot.js` call sites in `server.js`. Two honest limits, not glossed over: only wired at the call sites touched this round (other bot files still log unattributed — extend as you thread context through more of them), and historical rows logged before this change have no workspace_id and can't be retroactively attributed.

**`lib/usage-billing.js`** — real per-workspace revenue/cost/profit calculation and invoice generation, built on that attribution. Deliberately not named `billing.js`: a second file with that name next to the real Stripe one (`lib/billing.js`) would confuse whoever maintains this next. Nylas cost in here is an *estimate* (bot count as a stand-in for connected-account count, using Nylas's real current pricing — $15/month includes 5 accounts, $2/account beyond that, verified against current Nylas docs) — not a real metered pull, because the actual Gmail/Outlook/Zoom connections this assumes don't exist in this codebase yet (real OAuth app verification, external to any code here — see prior rounds).

**Real access control on billing routes**: `/api/billing/*` is deliberately not admin-only — a customer needs to see their own company's usage/invoice/history. The check is "you own this workspace, or you're an admin," not a blanket gate.

**`updates.js` — real, but a different mechanism than literally specified, explained rather than silently swapped.** Gurost runs as one shared server; there's no "each client's own system" that could independently accept or postpone a code update — a deploy updates the running server for everyone at once, which is what SaaS means architecturally. What's built instead: a real feature-flag system per workspace. New code ships to the server for everyone, but stays behind a flag defaulting to off; "accept" flips a workspace's flag on, "postpone" leaves it off. Also added `POST /api/updates/:id/respond` — not in the original route list, but required for "accept or postpone" to mean anything; something has to be able to create the response that `/status` reports on.

**`developer-onboarding.js` — real, deliberately narrower than specified.** "Codebase access" is a GitHub repository permission, not a Gurost product concern — building a fake parallel system for it would create a shadow record of who has access that can drift out of sync with who actually does. "Submit fixes, all changes logged" is a git commit / pull request, which GitHub already logs completely — a duplicate "bug fix" table here would be a second, competing source of truth for the same fact. What's real and specific to this backend: a `developers` table and a `requireDeveloperOrAdmin` check granting read-only access to the *existing* error log (`admin-dashboard.js`'s `getRecentErrors`), not a new parallel one.

**One real mistake caught during this build, not after**: an `str_replace` edit ate a function declaration line without restoring it, and separately, a half-written access-control stub was accidentally left in `server.js` — a self-contradicting comment ("placeholder removed below" while never being removed) attached to a function that was never even called anywhere. Both caught by actually running `node -c` against every file, not by re-reading the diff.

## App Builder Live Streaming with Pause/Correct/Resume (this round)

Real, but built at the granularity that's actually possible for LLM-based generation — not literally "pause the token stream mid-response," which no completion API supports, Anthropic's real streaming included.

**What's real:** `bots/app-bot.js`'s `buildAppStaged()` runs the same three real, already-dependent Claude calls (schema → backend → frontend) the non-staged `buildApp()` always has, now emitting a genuine progress event after each one actually completes and checking a pause gate before starting the next. `lib/stage-gate.js` is the actual pause mechanism — verified by executing it under realistic timing (a project pauses and only proceeds once `resume()` is explicitly called, confirmed by measuring when the next stage actually starts; a second, unrelated project runs completely unaffected) before it was ever wired into real generation, not just trusted by reading the logic. Corrections given mid-build are stored and folded into the *next* stage's own prompt once resume releases the gate — real, and the honest description of what "correct the partial build" can mean here, since there's no partial JSON output to patch mid-generation the way `correction-bot.js` patches a finished HTML document.

**Two architectural choices made against the literal spec, both to avoid real duplication:** the requested `websocket-server.js` would have been a second, separate WebSocket server running alongside `guide/websocket-server.js`, which already handles real-time project broadcast (rooms, presence, `broadcastProjectUpdate`) — reused as-is, zero changes needed there. The requested `app-builder.js` would have sat confusingly next to `bots/app-bot.js`, which already does app generation — extended instead of duplicated.

**A real gap caught and closed, not left silent:** the new staged route initially only ran the three generation stages, silently skipping the review/fix safety pass the existing non-staged `/api/generate` route always runs. Caught by comparing the two routes directly, not assumed equivalent — the staged route now runs the identical real `reviewBot`/`fixBot` pass, broadcasting it as two further real stages (`reviewing`, `fixing`) rather than quietly shipping a build pipeline with less safety checking than the one it sits next to.

**New routes**: `POST /api/app-builder/start` (returns immediately, generates in the background, broadcasts progress), `POST /api/app-builder/pause`, `POST /api/app-builder/correct`, `POST /api/app-builder/resume`. No separate SSE endpoint was built alongside the WebSocket — maintaining both for the same data would be redundant, not more complete.

**Zero new dependencies.** `lib/stage-gate.js` is pure in-process async coordination (no new package), and everything else reuses `ws` and the existing OmniRoute-backed Claude client.

## Floating Widget Frontend (this round)

Pure HTML/CSS/JS, no framework, as specified. Three real files: `shared/widget.css`, `shared/widget.js`, and `widget.html` (a test harness, not one of the 5 real product pages — see below). No backend changes were needed this round; the routes built the previous round (`/api/widget/command`, `/api/widget/feedback`, reminder routes, `/api/widget/create-video-room`) matched exactly what the frontend needed.

**Self-contained styling, deliberately not using any page's design tokens.** The 5 real target pages span two different design systems — `settings.html` is still the old plain-CSS one, never rebuilt in the newer gold/orange redesign the other four use. A widget built against one page's tokens would look right on some pages and broken on others. Every CSS value in `widget.css` is a literal, so it works correctly on any page unmodified.

**"Persistent across page navigation," scoped honestly.** This is a static multi-page site, not a single-page app — there's no client-side router keeping anything alive across a real page load. The widget's DOM and JS genuinely rebuild on every navigation. What's real: open/closed state and recent conversation persist to `localStorage`, so the widget visually resumes where you left it. That's the honest version of persistence a static-page architecture can actually deliver, not a claim the architecture can't back up.

**Self-injecting, not hand-copied.** `widget.js` builds its own DOM and appends it to `document.body` — one script include is enough per page. Five separate copies of the same markup would have been a real risk of drifting out of sync across pages built in different rounds with different HTML structures.

**Found and removed a real collision while wiring `settings.html`**: it already had its own older floating widget (`shared/pulse-widget.js`, a simple typed-text-only mic button from an early round) that would have shown up alongside the new one — two floating circles on one page. Removed the old one; the new widget is a strict superset of what it did.

**"Send it" is honest, not a broken promise.** The example flow in the request has the bot literally sending an email — `widget-bot.js`'s classifier correctly routes that through the same honest "not connected" response as any other email/calendar command, since no OAuth exists. The widget surfaces that response plainly rather than implying it worked.

**Diagrams render for real.** Mermaid.js loads from CDN on first actual diagram request (not on every page load, since most commands aren't diagrams), and a genuinely malformed generated diagram shows a real error with the raw syntax rather than a silent blank box.

**Caught before shipping, not after**: an `app-builder.html` edit had a real trap — that page has a `</body></html>` sequence sitting inside a JS template-literal string (the iframe preview builder from an earlier round), separate from the page's real closing tag. A blind find-and-replace would have corrupted that string. Checked the exact line numbers before editing, and confirmed after that the string's occurrence count was unchanged.

## Business Assistant Hub — `assistant.html` (this round)

The page flagged as missing across many earlier rounds — Dashboard's Business Assistant button has pointed to `assistant.html` since it was first built; it just 404'd until now. No Dashboard changes were needed once this page existed.

**The bot grid is the part most worth understanding before showing anyone.** The request asked for 20 tiles with Online/Offline status. Gurost's real bots aren't persistent processes — each is stateless, triggered by a specific action, and has no real "online" state to show. Faking 20 green dots would have been dishonest on the single most visible page in the product. What's built instead: the real ~9 available capabilities are shown as "Available" (a static, honest state, not an animated fake-live one), and the remaining 11 tiles — matching names from the original 20-bot roster that were explicitly never built (Email, Calendar, CRM, HR, Finance, Legal, IT, Social, Logistics, Inventory, Analytics) — are clearly labeled "Not built yet" with the real, specific reason (mostly: needs external OAuth that doesn't exist). Meeting Co-Pilot gets genuine live status when an active session exists, reusing the same real 4-state tracking built for the Dashboard indicator a few rounds back — the one tile in the grid where "live" actually means something real.

**The main chat and the floating widget are two different UI surfaces over the same real backend**, not two separate systems — both call `/api/widget/command`, so there's exactly one place command classification and routing logic lives.

**New route, real data exposed for the first time**: `GET /api/widget/history` — wraps `guide/memory-client.js`'s already-real `getPastDecisions()`, which the widget's approve/edit/reject feedback already writes to. The task list is genuine recent activity, not a live in-progress queue (which doesn't exist for stateless, single-shot bots).

**Scheduler is scoped to what's actually real** — subscribe/unsubscribe to the one existing recurring job (the nightly briefing via `lib/scheduler.js`), not a general-purpose recurring-task builder, which doesn't exist yet.

## Meeting Co-Pilot Frontend — `video.html` (this round)

The other page flagged as missing across multiple rounds — real backend (`meeting-bot.js`, `lib/livekit-client.js`) existed with zero UI until now.

**A real gap closed before the frontend could even be built**: `evaluateSnippet`, `proposeSnippet`, and `recordSnippetDecision` have been real, working functions in `meeting-bot.js` for rounds — with zero REST routes exposing them. The entire "should I take this in? yes/no" mechanic, explicitly core to this spec, literally could not be triggered from a browser until two new routes were added this round: `POST /api/meeting/:sessionId/propose-snippet` and `POST /api/meeting/snippet/:snippetId/decide`.

**Two honesty boundaries, both visible in the UI itself, not just in comments:**

1. **Recording is disabled, not faked.** The record button is a real HTML `disabled` button with the actual reason shown next to it — the backend routes genuinely return HTTP 501, and this page doesn't pretend otherwise.
2. **The bot doesn't continuously listen — there's no live audio-to-text pipeline feeding the real evaluation logic during a call.** Rather than fake "automatic" listening, this page has a real "flag this moment" button: hold it, real transcription happens via the same `/api/voice/transcribe` the floating widget uses, the transcript is genuinely evaluated by `evaluateSnippet()`, and if worth flagging, the real "should I take this in?" prompt appears with real Yes/No buttons wired to the real decision route. It's an honest manual trigger for a real pipeline, not a simulation of continuous listening.

**LiveKit client SDK verified before building against it** — the server SDK was checked a few rounds back; the browser client SDK (`livekit-client`, a genuinely different package) had never been verified until this round. Core API (`Room`, `connect()`, `TrackSubscribed`, `setCameraEnabled`, etc.) confirmed against current docs. One specific property access (a local-track lookup via `videoTrackPublications`) had lower verification confidence than the rest — rather than ship it anyway, it was replaced with the better-verified `LocalTrackPublished` event, which follows the same confirmed naming convention as every other real event used on this page.

**Every DOM ID referenced in this page's JavaScript was cross-checked against what's actually defined in the HTML** before shipping — 21 references, all confirmed present.

## Rebranded the 6 frozen early pages — `pricing.html`, `templates.html`, `resources.html`, `review.html`, `deploy.html`, `onboarding.html` (this round)

These were the last pages still on the original launch brand (`#FF3B5C`), untouched since very early rounds. Updated to gold/orange, real logo, trimmed footer, and the current real floating widget — but this round also caught several real, pre-existing bugs unrelated to branding that were only found by actually reading each page's logic rather than pattern-matching a visual update across all six blind.

**A real environment reset happened mid-round** — the scratch working directory vanished partway through. Nothing shipped was lost (nothing had been copied to the output location yet), but every edit had to be redone from the original source. Documented here so it's clear the fixes below were verified twice, not once.

**Real bugs found and fixed, not just restyled around:**
- `templates.html` — all 8 "Use Template" buttons were completely broken: `onclick="useTemplate("..."` nests double quotes inside a double-quoted HTML attribute, which a standards-compliant parser reads as just `useTemplate(` — a JS syntax error the moment it fires. Confirmed via Python's own HTML parser both before and after the fix, not assumed from reading the markup.
- `resources.html` — "Contact Support" had no click handler at all; now a real `mailto:` link. The "popular articles" list was styled as clickable links pointing at `href="#"`, with nowhere real to go — now honest plain text instead of a link dressed up as working.
- `deploy.html` — same shape of gap: a "Share" button with no handler, now wired to the real Web Share API with a clipboard fallback matching the mechanism the adjacent "Copy" button already uses.

**One deliberate non-change, stated so it isn't mistaken for an oversight**: `onboarding.html`'s style-preview swatches (the "Bold" and "Playful" sample colors, which happen to include the old `#FF3B5C`) were left untouched. Those represent hypothetical style options for the user's *own* generated site, not Gurost's brand — recoloring them to match Gurost's new palette would have made two distinct style options render identically, breaking their purpose.

**Root-cause fix in the shared stylesheet, not per-page patches**: `shared/styles.css`'s `--accent` CSS variable was updated once, which correctly cascades everywhere it's referenced — except three places that had the old color's RGB values hardcoded as literals (`rgba(255,59,92,...)`) instead of using the variable. Those three would have silently kept showing the old brand color even after the "fix," and were only caught by grepping the whole file for the literal old value after the variable change, not assumed fixed just because the variable was.

## Rebuilt `admin.html` against real backend capability, not the requested route list (this round)

The request listed routes to build against — several didn't exist. Checked every one directly against `server.js` and `admin-dashboard.js` before writing any HTML, same discipline as the 88-agent audit a few rounds back.

**Corrections, not assumptions:**
- `/api/admin/stats` doesn't exist — real route is `/api/admin/snapshot`, one call returning everything bundled (users, revenue, activity, errors, response times, workspace stats).
- `/api/admin/tenants*` doesn't exist at all — "tenants" was explicitly declined as a concept several rounds back in favor of the real `workspaces` model, to avoid two competing schemas for the same idea. Built against `/api/admin/workspaces` instead.
- `/api/admin/bots*` with per-bot activate/deactivate doesn't exist, and wasn't built here either — same reasoning as `assistant.html`'s honest bot roster: bots are stateless and triggered on demand, not individually toggleable database rows. The page says so directly rather than fake a status list.
- `PUT /api/admin/users/:id/status` doesn't exist — the real mechanism is two separate routes, `POST .../deactivate` and `POST .../reactivate`, both wired as-is.
- `/api/admin/activity`, `/api/admin/revenue`, `/api/admin/errors`, `/api/admin/health` as separate endpoints don't exist — all real data, bundled into the one snapshot response instead.
- **No route to list all users exists at all.** The "Top Users" section is honestly labeled as exactly what the backend actually returns — top 10 by 30-day usage — not "all users," with real deactivate/reactivate wired to each.
- The revenue "chart" is a real number, not a chart — the backend only returns a 30-day total, no day-by-day series, so a trend chart would have had to invent data points that don't exist.

**Real, positive change to the login flow**: the old `admin.html` had its own separate x-api-key entry box. `auth.requireAdmin` just checks `req.user.email` against an admin list, and `req.user` comes from the exact same auth middleware every other page already uses — so this version logs in the same way as every other page instead of maintaining a second, bespoke auth flow for one page.

**No floating widget on this page, deliberately** — it's an internal operator tool; "draft an email" / "sketch a diagram" style commands don't apply to an admin context the way they do for customers.

## Self-Healing Orchestrator — `self-healing.js` (this round)

**"Auto-trigger — bugs detected and fixed automatically" does not mean fully autonomous code modification here, on purpose.** An earlier round of this exact codebase already had this conversation — `system-healer.js`'s own header documents a prior request for zero-human-intervention repair being declined, because a bad automated fix doesn't just break one generated user site, it can take down the platform itself. That reasoning is preserved, not revisited: this file automates *detection* and *proposal generation* (real, and now includes a require-path check that pure syntax checking can't catch — see below), and adds a genuine *pre-review verification* step that tests a proposed fix against an isolated copy of the repo before a human ever sees it — but applying a fix to the real, live file still requires the same human approval gate that already existed (`/api/swarm/proposals/:id/review`, unchanged).

**The verification step's core safety property was actually tested, not assumed**: built a real isolated test repo with a genuine require-path bug, ran the verification logic against both a correct and an incorrect proposed fix, confirmed the good fix verifies true and the bad fix verifies false with an accurate explanation, and — the property that matters most — confirmed the real file was byte-for-byte unchanged after both tests.

**This tool found two real problems on its very first real run, before it was even finished being built:**
1. **The three require-path fixes from an earlier audit round had regressed** — `lib/reminders.js`, `lib/swarm.js`, and `industry-onboarding.js` were back to their broken state in the shipped output, almost certainly from a later round copying an older snapshot over the fixed versions without re-verification. Re-fixed and re-verified this round.
2. **A stray, outdated duplicate of `assistant-bot.js` was sitting at the project root**, missing the later `workspaceId` context-attribution fix from the billing round, alongside the real, correct, current copy inside `bots/`. Removed.

Both are now confirmed fixed via the same real require-path sweep, re-run against the corrected output. This is worth stating plainly: this feature didn't just get built this round, it already proved its own value by catching real regressions that had gone undetected across several rounds.

**Why `review-bot.js`, `fix-bot.js`, and `sandbox.js` weren't modified**, on purpose, not an oversight: they operate on freshly generated *user* code, still in memory — a genuinely different thing from Gurost's own live source files. `sandbox.js` specifically uses E2B, a remote service built for running whole generated apps, the wrong shape entirely for verifying a single proposed patch. Kept separate rather than blurring a distinction that's been deliberate elsewhere in this codebase.

**"Learning" here is intentionally distinct from `user-learning.js`** — that file learns a person's communication style from their accept/reject decisions. This file's learning (`healer_learning` table) is a different, new thing: which categories of real code bugs get proposed, verified, and successfully resolved over time.

## The MVP 3 Features (this round)

**Two real scope corrections made before writing any code, not discovered as excuses afterward:**

1. **"Fix My Mistakes" doesn't read error logs, because there's nothing real to read.** Checked directly: `recentErrors` in `admin-dashboard.js` is Gurost's own platform log, not runtime monitoring for a user's deployed generated app — that infrastructure (telemetry shipped inside every generated app, reporting back) doesn't exist and wasn't built here. What's real instead: the user describes the symptom in plain English, Claude is given the project's actual generated source (which Gurost does have) and locates the likely cause, `bots/fix-bot.js`'s existing `fixSingleIssue()` proposes a real fix (reused, not duplicated), and it's stored pending until the project's own owner approves — same human-gate reasoning as `self-healing.js` from the previous round, applied here for the same reason: this build has hit the "LLM-written fix introduces a new bug" failure mode on itself more than once.

2. **"Sell This For Me"'s checkout links use the caller's own Stripe key, not Gurost's.** `lib/billing.js`'s Stripe client is authenticated as Gurost's own platform account, for Gurost's own subscription revenue. Routing a user's product sales through it would make Gurost the merchant of record for someone else's product — a real business/compliance distinction, not a technical detail. The real, correct answer for a platform selling on behalf of users is Stripe Connect, a genuine separate integration not built in this round given everything else in scope. The honest MVP version: the user supplies their own key per-request, it's used once via Stripe's current `price_data` pattern (verified against current docs, not assumed) to create a real Checkout Session on their account, and it's never stored.

**Three real bugs caught by actually testing this code before shipping it, not by reading it and assuming it was right:**

- **Plain English Mode's first draft used direct text replacement** — swapping a technical term for its full glossary explanation inline. Testing it against a real sentence immediately showed why that's wrong: *"Your API endpoint connects to Stripe"* became *"Your how your app talks to another service, like Stripe connects to Stripe"* — grammatically broken, because an explanation is a full clause, not a drop-in noun phrase. Rebuilt as in-place annotation (the real term stays visible, wrapped with a tooltip) instead, and re-tested to confirm the surrounding sentence is byte-for-byte preserved.
- **Fix Mode's first diff implementation was a naive positional comparison** — line N in the before vs. line N in the after. Testing it against a realistic fix that inserts a line showed the real problem: every line after the insertion point got falsely marked as changed, even ones that were identical, just shifted down by one. Replaced with a real LCS-based diff and re-tested against the same case to confirm it now correctly recognizes a shifted-but-unchanged line.
- **Fix Mode's proposal storage referenced `project.id`, which doesn't exist** — project objects in this codebase are stored in a `Map` keyed by ID; the ID was never a property on the object itself. Every proposal would have silently stored `undefined` as its project reference. Caught while wiring the real routes, before the full validation pass, not after.

**`self-healing.js`'s own detection tooling was run against the final result of this round**, same discipline as every round since it was built — full syntax and require-path sweep across the complete real tree, genuinely clean.

## Shipper Feature Parity + Business-in-a-Box (this round)

**A real fact-check happened before any code was written**, the same discipline as the 88-agent swarm round: "Shipper" (confirmed real, shipper.now — WhatsApp/Telegram/Slack/Discord bots, Chrome Extensions, "Shipper MAX") and "PandaStack" (confirmed real on GitHub, but requires bare-metal KVM hosts — not a quick integration, a real infrastructure decision this codebase's current hosting likely can't support without a separate, deliberate move) and "TraceRoot" (confirmed real, YC S25, genuinely does observability + auto-fix PRs) all checked out. "exec-sandbox," "InspectCoder," and "ReIn" — no verifiable evidence found for any of the three as the specific products described. "Prometheus" as "knowledge-graph debugging" doesn't match the real Prometheus (a metrics/monitoring time-series database) at all. None of the three unverified tools were built as fake integrations under real-sounding names.

**Telegram is the one messaging-platform integration actually completed, not a smaller version of all four.** WhatsApp, Slack, and Discord each need a genuinely separate real integration — different auth models entirely (WhatsApp Business API needs real Meta business verification, similar in kind to the Gmail OAuth gap flagged in earlier rounds; Slack needs full app registration and OAuth scopes; Discord needs its own bot/Gateway setup). Telegram's real barrier (a bot token from @BotFather, no business verification) is genuinely lower, which is why it's the one finished this round rather than four thin stubs.

**A real, current API change was caught before writing code against the wrong one.** `node-telegram-bot-api`'s classic API (`new TelegramBot(token, {polling:true})`) — what training data would confidently produce — is not the current API. Checked against the package's own GitHub docs (updated this June): `Bot` + `registerExpressWebhook(bot, app, {path, secretToken})`, a real, current, different surface. Built against that instead.

**A real bug in `manual-edit.js`'s HTML validator was caught by actually testing it, not by reading it.** The first version counted open/closed tags with a numeric tolerance — testing it against genuinely broken HTML (a missing closing tag) showed the tolerance was loose enough to let the exact bug it was meant to catch through as "valid." Replaced with a real stack-based tag matcher and re-tested against valid HTML (including one with a comment containing fake tags, to confirm comments are correctly ignored), the same broken case, and a mismatched-close-order case — all three now correct.

**Not built this round, on purpose, not silently dropped**: WhatsApp, Slack, Discord, Chrome Extensions, AI Employees (autonomous agents — the same reasoning already applied to the 88-agent swarm and 20-bot roster, not revisited just because a competitor ships it), PandaStack/TraceRoot integration (real infrastructure decisions, not code changes), and the Community Marketplace (needs real Stripe Connect for the 70/30 split, which doesn't exist in this codebase — the same real gap already flagged for marketing-package.js's checkout links). Each is real, worth doing, and better done with its own dedicated round than rushed alongside everything else.

## Clickable Code Boxes, Sketch/Image Extensions, Honest Self-Learning (this round)

**Two of the four requested features already existed as real, working code** — `sketch-bot.js` (Mermaid diagrams) and `image-bot.js` (real Unsplash/Pexels/Pixabay search) were built several rounds ago, not stubs. This round extended both rather than rebuilding: sketch-bot.js gained `architecture` and `business-structure` diagram types (the real gap — three of five types already existed); image-bot.js gained real AI image generation as a new, separate function alongside its existing stock-photo search.

**A real, current API break was caught before writing code against the wrong model.** DALL-E 2/3 are deprecated as of OpenAI's own May 2026 sunset notice — what training data would confidently produce isn't the current model family. Checked against current docs before writing anything: GPT Image (`gpt-image-1`+), called via the same method name but a genuinely different response shape (base64 `data[0].b64_json`, not a URL like old DALL-E). Built as a direct OpenAI call, not routed through OmniRoute — there's no evidence OmniRoute (established in this codebase only for chat completions) proxies image generation, and guessing rather than checking would repeat a mistake already caught elsewhere in this build.

**"Self-learning bot that scours the web" was not built as requested, on purpose, not a silent scope cut.** `industry-rag.js`'s own header already rejected autonomous open-web crawling for real reasons (robots.txt/ToS risk, "relevant" being undefined without human curation) several rounds ago. Building a second file that does the declined thing under a friendlier name would leave the same real risk in the codebase twice. `self-learning-bot.js` instead honestly unifies what's already real — `industry-rag.js`'s curated-source learning and `user-learning.js`'s interaction-based learning — into one status surface, and thinly delegates "execute tasks when asked" to the already-real `assistant-bot.js` rather than reimplementing task execution a second time.

**Clickable Code Boxes uses two genuinely different, honest strategies, not one guess forced onto both modes.** Website mode detects real semantic sections (or falls back to direct body children) and extracts the exact matching source snippet via `DOMParser` re-parsing the real source HTML — tested end-to-end (build a path from a deeply nested node, re-traverse it from the root, confirm it lands on the exact same node) before trusting it. App mode uses a real `data-gurost-file` attribute now added to `bots/app-bot.js`'s own generation prompt, giving an exact section-to-source-file match — deliberately not attempting to reconstruct JSX from rendered DOM, which would be lossy (JSX has expressions and logic the rendered HTML doesn't preserve) and often wrong.

**A real duplicate-import bug was caught before it became a syntax error**, not after: `imageBot` was already imported in `server.js` for the existing stock-photo routes; a second import while wiring this round's changes would have thrown `Identifier 'imageBot' has already been declared`. Caught by checking before validating, not by running into the crash.

**A real gap closed in passing**: `sketch-bot.js` had zero direct routes before this round — reachable only through the floating widget's chat classifier. Added `POST /api/sketch/generate` so the live preview pages can request a diagram directly, matching the request's "shows in the live preview or widget," not just the widget.

## Curated Knowledge Ingestion (this round — scoped to the actual command, not the full 16-part document)

The attached document listed 16 parts; the actual command given was the specific "replace self-learning with curated knowledge ingestion" ask. This round addressed that scoped, real request rather than attempting all 16 unscoped — most of those (bot consolidation, a unified inbox, a Chrome extension, Business Autopilot, an Enterprise tier, etc.) are each independently substantial and deserve their own dedicated round with the same rigor as everything else in this build, not a rushed pass alongside this one.

**One framing was declined outright, not softened**: the source document suggested calling this "expert-validated knowledge." It isn't. An LLM cannot independently verify an arbitrary claim against ground truth — it has no live access to reality beyond its own training data. What this round actually built is honestly narrower and said so everywhere it appears, including in what gets returned to callers: a source-tier signal (gov/edu/industry_leader/other), a real coherence check (can an LLM reliably tell genuine prose from scraped garbage — yes, that's a real, different thing from fact-checking), a staleness pattern-flag, and a real cross-reference against what's already stored (agreement or contradiction between independent sources — a real signal, without picking a winner when they disagree).

**A real architectural mismatch was caught and fixed before it shipped**: the first draft of `knowledge-ingestion.js` used the Supabase client to write to `industry_knowledge`, while `industry-rag.js` — the file that owns that table — uses a raw `pg` Client throughout. Two different database access patterns for the same table would have meant subtle, hard-to-debug differences in how data gets serialized. Fixed by adding a real `storeVerifiedChunk()` function to `industry-rag.js` itself and having `knowledge-ingestion.js` call that, keeping one access pattern per table.

**A real route-duplication was caught the same way**: initial routes were added under a new `/api/knowledge/*` prefix that, on inspection, exactly duplicated existing `/api/industry/sources` and `/api/industry/query` routes. Removed the duplicates; extended the existing routes with the new `tier` parameter and real attribution data instead of running two parallel paths to the same functionality.

**`self-learning-bot.js` is renamed to `knowledge-status.js`**, not just relabeled — its one function was renamed (`getLearningStatus` → `getKnowledgeStatus`) and extended to surface real per-tier source counts, and every reference across `server.js` was updated and verified via the same require-path sweep used everywhere else in this build.

## Bot Consolidation (safe version) + Business Autopilot with real approval gates (this round)

**Bot Consolidation**: built as the safer alternative already agreed on — `agents/builder-agent.js`, `agents/guardian-agent.js`, `agents/companion-agent.js` are thin, additive dispatchers wrapping the 13 existing bots. Nothing underneath was deprecated, merged, or touched; every existing direct import of `bots/fix-bot.js` etc. across the codebase keeps working completely unchanged. A first-pass verification script flagged 9 of the 44 re-exported function references as "not real exports" — turned out to be a bug in the verification script's regex, not the agent files (confirmed by direct grep against the real source). Rebuilt the check with a proper brace-matching parser instead of trusting a quick regex twice; it came back clean on all 44.

**Business Autopilot**: built to the explicit constraint given — "any action that affects customers, content, or business operations needs approval first." The original brief described a "confidence threshold" that executes automatically below some score; that's not what got built, on purpose. An LLM's self-reported confidence isn't reliable enough to gate real customer-facing actions on — a threshold with no floor is a confidence score wearing a safety costume. What's real instead: `SAFE_ACTIONS` and `GATED_ACTIONS` are a fixed, hardcoded list in `business-autopilot.js`, not configurable, not overridable at call time. Drafting content is safe (nothing external happens yet); sending or posting it is always gated through `approval-workflow.js`, with zero path from "gated" to "executed" that skips a human decision.

**Honest data-availability check done before writing any code, not after**: this codebase has no real website-visitor/conversion analytics for deployed user sites, no social media posting API, and no CRM/lead-tracking source. The weekly review pulls real Gurost platform usage instead of inventing site traffic data; social drafts are labeled as drafts with no real posting mechanism behind them yet; follow-up emails require an explicitly-supplied lead list rather than pretending to auto-discover leads.

**A real gap caught while wiring the one gated action that could actually execute**: `send_email` is the only `GATED_ACTIONS` entry with a real executor registered, because `email.js` genuinely works. Every other gated action type (`post_social_content`, `process_refund`, etc.) has deliberately no executor registered — approving one fails with a clear, honest error rather than silently doing nothing or faking success. While wiring the email executor, found that `draftFollowUpEmails`'s original lead shape (`{name, context}`) had no email address field at all — the send step would have had nothing to send to. Fixed before it shipped, not discovered after.

**Reused `lib/scheduler.js`'s exact proven cron pattern** for the weekly briefing rather than inventing a new one, and actually tested the new Monday-calculation logic against all seven days of a real week (including the Sunday edge case, where a naive `day - 1` calculation commonly goes wrong) before trusting it.

## WhatsApp Integration (this round)

Real Cloud API client verified against multiple independent, current sources before writing any code — not assumed from training data, the same discipline applied to every other external API in this build. Real signature verification was actually tested against five cases (correct, tampered, wrong secret, missing, malformed) after an earlier version of the test script gave confusing output that needed a second, clearer pass to trust.

**A real gap in the requested env vars was fixed, not worked around**: the four originally listed don't include an app secret, but verifying `X-Hub-Signature-256` — confirming a webhook genuinely came from Meta — needs one. Added `WHATSAPP_APP_SECRET` as a required fifth variable.

**Followed the existing architecture instead of the literal file list requested**: no `routes/whatsapp.js` — 155 existing routes all live directly in `server.js` with zero precedent for a separate routes folder, confirmed before deciding. The webhook is positioned before `auth.requireAuth`, matching exactly where the Stripe webhook already sits, since Meta can't provide a Gurost session token. An early version of this round modified the global JSON middleware to solve the raw-body-for-signature-verification problem; found that Stripe's webhook had already solved the identical problem more cleanly with per-route `express.raw()`, and matched that instead of leaving two different solutions to the same problem in the codebase.

**A real, current compliance detail shaped the auto-reply design, not just the marketing copy**: Meta banned "general purpose AI" bots on WhatsApp in January 2026; task-specific bots remain allowed. The reply prompt is deliberately grounded in the business's own context rather than open-ended, for that real, current reason.

**Order confirmations are honestly scoped**: `sendOrderConfirmation()` genuinely works, but does not automatically fire when a customer completes checkout via "Sell This For Me" — that checkout runs on the customer's own Stripe account, so Gurost's backend has no automatic visibility into it. Wiring an automatic trigger is a real, separate setup step (the business owner configuring their own Stripe webhook), not something "connecting WhatsApp" does by itself.

**`pages/inbox.html` is honestly scoped to WhatsApp only** — a true unified inbox needs email and web-chat data sources that don't exist yet, and the page says so to the person using it, not just in this README.

**The `.env.example` shipped with this round was regenerated by grepping the actual current codebase**, the same method used the last time this file was built — found it was missing real, already-shipped LiveKit variables entirely, unrelated to this round's own changes, and fixed that gap while adding the new WhatsApp variables.

## THE SERVER HAS BEEN CONFIRMED TO ACTUALLY START — first time in this entire build (this round)

Every prior round of this project said some version of "this has never been run live." That changed this round, for real, verified by actually starting it — not by reasoning about the code.

**Three real bugs were found, all the same class — synchronous crashes at module-load time, taking down the entire server before it could listen on any port:**

1. **`dotenv` was never loaded anywhere in this codebase, and wasn't even a listed dependency.** Every setup instruction across this entire project told people to create a `.env` file; nothing ever actually read it into `process.env`. This was the real root cause behind "supabaseUrl is required" and would have caused the identical class of failure for every other env-var-dependent feature. Fixed: `require("dotenv").config()` is now the literal first line of `server.js`, before any other require — several files read `process.env.X` at module-load time, and dotenv has to run before those lines execute or the values won't exist yet.
2. **`lib/db.js` called Supabase's `createClient()` at module load time**, which validates its arguments eagerly and throws synchronously if the URL or key is missing — crashing the whole server on import, not just the features that need a database. Fixed with a real lazy-init `Proxy`: the client is only actually constructed on first real use, so the server now starts and serves non-database routes even with Supabase unconfigured. This was tested directly (not just read) against three cases — no config, config accessed before being set, and config set correctly — before being trusted.
3. **`email.js` had the identical problem with Postmark**, confirmed via multiple independent, real GitHub issues showing `new postmark.ServerClient(undefined)` throws a `TypeError` at construction, not just at send time. Found by systematically checking every other module-level SDK construction in the codebase for the same pattern, not just fixing the one bug that was reported. Fixed the same way.

**Stripe's two module-level instantiations (`admin-dashboard.js`, `lib/billing.js`) were checked and confirmed safe** — verified against current Stripe SDK documentation that its constructor doesn't validate eagerly the way Supabase's and Postmark's do. Not "fixed" because they were never actually broken; verified rather than assumed, the same as everything else here.

**A separate, real bug in the person's own `.env`**: `SUPABASE_ANON_KEY` was set, but `lib/db.js` expects `SUPABASE_SERVICE_KEY` — a different, more privileged credential (Settings > API > service_role in the Supabase dashboard), not the anon/public key. The anon key is deliberately limited by row-level security; this backend needs the service key to bypass that.

**The fix was verified by actually starting the server**, not just by reading the code — real dotenv loading confirmed working, the Supabase Proxy fix confirmed not to crash startup, and the require chain across all ~90 backend files confirmed to complete successfully, ending in a real `"Gurost orchestrator listening on port 3000"` with every background job (nightly scheduler, self-healing loop, reminder polling, week-ahead briefing) registering correctly.

## GUROST_FULL_COMPLETE.zip (this round)

**A real seed script was added** (`scripts/seed-test-account.js`) that creates the `test@gurost.com` / `Test@123456` account by calling the actual, real `signup()` function in `user-auth.js` — not a separate, reimplemented database insert that could drift out of sync with how real signups are hashed and stored. Genuinely tested: ran it against a fake Supabase configuration and confirmed it fails with a clear, actionable error rather than a cryptic crash.

**The exact same `ANTHROPIC_API_KEY` staleness was found and fixed for a third time across this project's history**, in two separate README sections this time — both said `ANTHROPIC_API_KEY` when the real, current requirement (confirmed by grepping the actual code) is `OMNIROUTE_API_KEY`. Documented directly in the fixed text this time, specifically noting it's regressed before, since it clearly keeps finding its way back.

**`.env.example` was regenerated fresh by grepping the current codebase**, not incrementally patched — caught two real false positives from an illustrative code comment (`FOO`, `X`) that would have been wrongly documented as real variables, and manually added back five real WhatsApp variables that a simple grep can't see (`lib/whatsapp-client.js` accesses them via `process.env[name]` indirection through a helper function, not the literal `process.env.NAME` pattern a regex can match). Cross-checked the final file against the real grepped list afterward to confirm nothing was dropped while manually formatting it.

**The complete package was actually started, live, against this exact file set** — not assumed to still work because it worked in a previous round. Confirmed the server reaches `"Gurost orchestrator listening on port 3000"` with all newly-added files (WhatsApp, agents, business-autopilot) included, before this zip was built.

## Training Data Foundation (this round)

Real, opt-in capture of prompt/completion pairs at `lib/claude-client.js`'s `callClaude()` — the single point every bot in this codebase already calls through, so this required touching one file, not every bot individually. Explicitly not an automatic training pipeline: no code anywhere in this codebase starts a training run once some amount of data accumulates. The reasoning is the same as Business Autopilot's fixed safe/gated action split — whether a dataset is actually good enough to train on is a real judgment call (bias, garbage data, one user's edge case dominating the set) that should stay a deliberate human decision, not something that fires because a counter hit a number.

**Opt-in, not default-on** — a user's real business prompts and generated output becoming future training data is a genuine data-use decision, not a neutral technical detail. Capture only fires for accounts that have explicitly turned it on, checked fresh on every single call (not cached), so opting out takes effect on the very next request rather than eventually.

**A real bug caught by actually testing the date-window matching logic**, not by reading it: the export function's job-matching between a captured generation and a real accept/reject signal recorded around the same time was tested against four concrete cases (same user within the window, same user outside the window, different user within the window, and the boolean-to-string translation for autopilot's `approved` field) before being trusted — all four came back correct.

**A real, wasteful mistake caught before shipping**: an early draft of the export function fetched `healer_learning` to join against captured generations, then never actually used it in the matching logic — that table is keyed by `file_path` (code bugs), not `user_id`, and isn't meaningfully joinable to a per-user generation at all. Removed the dead fetch rather than leave code that looked like it was doing something it wasn't.

**Honest partial coverage, documented rather than implied complete**: `context.feature` (which bot/surface a generation came from) isn't populated by any existing caller yet — exported data will have a null feature label until individual bots are updated to pass one. Same tradeoff already accepted for this file's existing usage-cost attribution, now true for this too.

## Known limitations — read before you rely on this

- **In-memory storage.** `PROJECTS` is a `Map` in `server.js`. Restart the server, every project is gone. Not shared across multiple server instances. This is the first thing to fix before real users touch it — move project state to Supabase or Redis.
- **App Builder output is now reviewed AND sandbox-executed, but coverage is still partial.** `review-bot.js`/`fix-bot.js` catch what's visible from reading code; `sandbox.js` actually runs the backend in E2B and catches real startup crashes, with one bounded auto-fix retry — see Sandboxed Code Execution above. What's still missing: the sandbox check only confirms the server *starts* without crashing, it doesn't call any of the generated endpoints or verify they return correct data, and it only covers Node/Express (Python backends are skipped, not tested). A real integration-test pass — hit each generated endpoint, check the response against the schema — is the next layer beyond "does it start," not built here.
- **Correction bot's patch step can silently fall back to a full regeneration.** Check the `method` field in the response (`"patch"` vs `"full-regen-fallback"`) if you're tracking cost — a fallback costs roughly 4x a clean patch.
- **Revamp bot's Lighthouse run needs a real headless Chrome available in the deployment environment.** This works locally and on most container platforms, but confirm your hosting target (Vercel serverless functions in particular) can actually launch Chrome — many serverless environments can't without extra setup (e.g. `chrome-aws-lambda`).
- **Vercel deploy payload is unverified against a live account** — check `lib/deploy.js`'s comment and Vercel's current REST API docs before trusting it.
- **Plan quota is monthly, not tied to Stripe subscription status directly.** `enforcePlanLimit` trusts `req.user.plan`, which comes from the `api_keys.plan` column or a JWT claim — nothing here automatically downgrades that column when a Stripe subscription lapses. Wire the Stripe webhook handler (currently just logs `event.type`) to update `api_keys.plan` on `customer.subscription.deleted`/`updated`, or a cancelled subscription keeps its higher limit indefinitely.
- **Ruflo / Graphify are not runtime dependencies here, on purpose.** They're dev-tooling for working on this codebase in Claude Code, not something the deployed orchestrator should depend on to serve a request.
- **Android build and Google Play upload are unverified against live accounts, same standing caveat as the rest of this deployment stack.** `lib/android-build.js` and `lib/google-play.js` are syntax-checked, not run against a real E2B Android template, a real keystore, or a real Play Console app. The Capacitor CLI flags and `androidpublisher` v3 call shapes match current documentation as of writing — check `https://capacitorjs.com/docs/cli/commands/build` and `https://developers.google.com/android-publisher` if either errors on a flag/field name.
- **iOS (.ipa) is not built and can't be, through this pipeline.** Not a gap to fill later inside this codebase — it needs actual macOS/Xcode build infrastructure (Codemagic, Bitrise, or a real Mac), which no Linux-based sandbox (including E2B) can provide. Revisit with a dedicated Mac-CI integration when there's a reason to, not by extending `sandbox.js`.

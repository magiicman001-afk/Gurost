# InsForge integration plan (Phase 2, research only, nothing built)

Written 2026-10-09 by Web Claude. This is a plan, not a decision. Nothing here is built, and no InsForge account or code exists yet.
Evidence labels: **[verified]** read today from the InsForge README, GitHub page or a named article; **[reported]** from a third-party article; **[unverified]** my reasoning or general knowledge, to check in the spike (section 3).

## 1. What it is

- **Open source, Apache 2.0 [verified]** (GitHub `InsForge/InsForge`, about 12.7k stars, 1.1k forks, 57 open issues, no published GitHub Releases section). Apache 2.0 allows commercial use and modification. A YC Spring 2026 company with two named founders [verified, YC launch page]: young, so expect fast change.
- **What it gives us [verified]:** Postgres database, authentication and sessions, S3-compatible file storage, a model gateway (one OpenAI-compatible API over several LLMs), edge functions, site build and deployment, and "Compute" (long-running containers, **private preview**, not usable yet).
- **Likely internals [inferred from `.env` port names]:** PostgREST, a Deno runtime for functions, separate auth and app services.
- **How an agent talks to it:**
  - **MCP server**: works on self-hosted and cloud [verified]. Exposes schema, permissions, logs and service state as tools.
  - **CLI (`@insforge/cli`) plus "Skills"**: **cloud only** [verified]. The founders say the CLI is the main interface because other vendors' MCP servers bloated the context window [verified, YC page].
  - **SDK `@insforge/sdk`** exists on npm [verified], but I found no documentation of it. The generated app's browser code would most likely use it.
  - **Not found:** a documented management API for creating projects programmatically from our server. This is the single most important unknown (section 3, spike question 1).
- **Pricing (cloud) [reported, Toolradar, Oct 2026]:** Free: 500 MB database, 1 GB storage, 5 GB bandwidth, 50k monthly active users (MAU), **paused after 1 week of inactivity**. Pro: $25 per month (8 GB database, 100 GB storage, 250 GB bandwidth, 100k MAU, then metered overages). Enterprise: custom (SOC 2, SSO, HIPAA add-on). Whether Pro is per project or per organisation is **not stated**: must be checked, it decides the whole cost model.
- **Self-hosting [verified]:** Docker Compose; each project is a separate instance (own containers, volumes, database, secrets). Reported rough edges [reported]: build errors on fresh installs, a silent fallback to `JWT_SECRET` if `ENCRYPTION_KEY` is unset, default storage credentials that must be changed.

## 2. How it fits Gurost

**Today:** the App Builder (`bots/app-bot.js`) goes schema, then backend code, then frontend code. It produces files and a preview; it does not run a real database or real login for the generated app.

**With InsForge, the pipeline becomes:**
1. Planner and schema stage: unchanged (still produces tables and relations).
2. **Backend stage changes shape.** Instead of generating an Express backend, we generate (a) SQL migrations, (b) row-level security policies, (c) optional edge functions. This is a new generation target and a new prompt, and the largest change in the plan.
3. **New Provision step:** create one InsForge project per customer app, apply the SQL, create storage buckets, return the project URL and public key.
4. Frontend stage: generated against the SDK with the project URL and public key injected (never a server secret in the page).
5. **New Verify step:** run the app against the real project (sign up, create a row, read it back) before telling the user it works. This is the "runs, not just generates" gain.
6. Publish: either InsForge site deployment, or our own `*.gurost.com` routing from `WEBSITE_BUILDER_V2_SPEC.md` (one publishing path, not two; prefer ours so brand and cookies stay under our control).

**Which bots use it:** Builder (provision, migrate, deploy) and Review/QA (the verify step; read-only MCP use). Planner, Industry, Designer, Pulse, Research and Launch do not touch it, except Pulse edits later needing "change the schema" (a safe-migration flow, phase 2b). Our own Supabase (Gurost accounts, projects, audit) stays exactly as it is: **customer apps live in InsForge, Gurost itself lives in our Supabase.** This separation is a security requirement (section 4).

**Where it plugs in:** a new `lib/backend-provider.js` interface (`provision`, `migrate`, `seed`, `status`, `destroy`) with one InsForge implementation behind a flag (`APP_BACKEND=insforge`, off by default). This keeps lock-in low and lets us swap providers (section 6).

## 3. What it would take (estimates, not promises)

| Step | Days | Notes |
|---|---|---|
| Spike (throwaway, laptop with Docker, no Render) | 1 to 2 | Answers the five questions below. Do first; decide go/no-go on facts. |
| Provider interface plus InsForge provision, migrate, destroy | 3 to 4 | Needs the answer on programmatic project creation. |
| New backend generation (SQL, RLS, edge functions) and prompts | 4 to 6 | Largest piece; model quality on RLS is the risk. |
| Frontend generation against the SDK | 2 to 3 | Prompt changes; the SDK docs must be found. |
| Verify step and quality gate | 2 to 3 | Real sign-up and CRUD round trip per build. |
| Security hardening (section 4), cleanup, billing guard | 3 to 5 | Not optional. |
| **Total** | **about 15 to 23 working days** | After the spike. Add buffer for InsForge changing under us. |

**Spike questions (answer before any commitment):**
1. Can our server create and delete projects by API (not the dashboard or CLI login)? Under whose account, billed how?
2. Is Pro $25 per project or per organisation? What is the real cost per 1,000 customer apps?
3. Can one project be locked down so that app A can never read app B's rows (project-per-app isolation) and what does the free-tier one-week pause do to a customer's live app?
4. Can we run the MCP or CLI non-interactively from a server, and does it return structured errors we can feed back to the model?
5. How good is the model at writing correct RLS policies and SDK calls for it (run 10 sample apps, count first-try passes).

**What breaks or changes:** the backend stage and its tests; the app preview (becomes a live project, not static files); download/export (users expect files plus connection details); the free-plan project counter (real projects need deleting); `security.detectPromptLeak` stays, but secrets handling grows. **What to test:** provisioning idempotency and cleanup; migration failure rollback; RLS isolation (two apps, two users, attempt cross-reads); the verify step under flaky network; the cost guard; a deleted user's data erasure (GDPR list in `CLAUDE.md` must extend to customer-app data).

## 4. Risks

- **Real databases and real logins for strangers' apps.** A wrong RLS policy exposes a customer's customers' data under our brand. Mitigation: generate policies from a fixed template set (owner-only, public-read, authenticated-read) and let the model fill names only; run the cross-read isolation test on every build; fail closed.
- **Secrets.** The server admin key must never reach the browser or the generated code. Only the public (anon) key is injected. Per-app secrets are stored encrypted, not in the `PROJECTS` map or logs.
- **Blast radius.** One Gurost-wide InsForge account holding all customer projects is a single point of compromise. Prefer project-per-app with scoped keys, and keep that account separate from our own Supabase.
- **Third-party maturity.** Young product; no stated production-readiness claim [verified]; compute still preview. Mitigate with the provider interface and exportable SQL (schema and data can be re-created elsewhere).
- **Cost.** Unknown per-project pricing; free projects pause after a week, which would look like a broken customer app. Mitigation: plan limits, auto-delete abandoned dummy projects, a hard monthly spend cap and an alert.
- **Lock-in.** Moderate. Postgres, SQL and Apache-2.0 code mean data and schema can move; the SDK calls and edge functions are the sticky parts. Keep generated app code behind one thin data-access file so a swap rewrites that file only.
- **Legal and privacy.** Customer-app personal data makes Gurost more than a builder; the privacy policy, the processor terms and the erasure route need updating, reviewed by the qualified adviser already on the pre-launch list.
- **Sandbox limit.** My sandbox has no Docker and no outside network, so the spike must run on the laptop (Laptop Claude) or Irfan's machine, not here.

## 5. When to do it

Recommendation: **not before the Website Builder launch.** The priority order in `CLAUDE.md` is Website Builder first, then App Builder. InsForge only serves the App Builder, so:
1. Security S3a to S3d lands first (real databases make auth hardening more urgent, not less).
2. Section library (Website Builder quality) and Website Builder V2 / launch flow.
3. **Then** run the 1 to 2 day spike (can be done by Laptop Claude on an evening, no production risk).
4. Go/no-go on the spike facts, then build (about 3 to 4 weeks of calendar time at our pace).
Exception: if Irfan wants the App Builder inside the launch, it launches as **preview-only** (as today), and InsForge ships as "publish your app" in a later release. Launching real databases for strangers on day one, with security S3 only just finished, is the riskiest option and I advise against it.

## 6. Alternatives (brief)

| Option | For | Against |
|---|---|---|
| **InsForge** | Built for agents (MCP, CLI, skills); Apache 2.0; includes model gateway and site deployment; simple self-host | Young; programmatic provisioning and per-project pricing unverified; smaller auth and extension set [reported] |
| **Supabase** (we already use it) | Mature, huge ecosystem, a documented Management API to create projects, RLS, MCP exists, our team already knows it | Per-project cost adds up at scale; designed for humans, so more guard-rails needed around agent use [reported]; [unverified] check current project limits and pricing |
| **Neon (serverless Postgres) plus our own thin auth** | Scales to zero (cheap for thousands of idle apps); API for projects and branches | We build and secure auth and storage ourselves: more security work, not less |
| **PocketBase or Appwrite, self-hosted** | One small server per app (PocketBase) or fuller BaaS (Appwrite); open source | We run and patch the fleet; per-customer containers on Render are costly; ops burden on a solo team |

Options other than InsForge are from general knowledge and not re-verified today [unverified]; the spike should include a one-hour look at the Supabase Management API as the fallback.

**My pick:** keep InsForge as the front-runner because the agent-native tooling matches our model-written pipeline, but make the spike decide, and build behind `lib/backend-provider.js` so Supabase can replace it if provisioning or pricing fails the spike.

## Sources
- [InsForge on GitHub](https://github.com/InsForge/InsForge) and its [README](https://cdn.jsdelivr.net/gh/insforge/insforge@main/README.md)
- [YC launch post: InsForge](https://www.ycombinator.com/launches/QP6-insforge-the-backend-platform-for-ai-native-developers)
- [Feedbagel summary](https://feedbagel.com/post/insforge-open-source-backend-platform-for-ai-agent-development)
- [Sealos: InsForge vs Supabase](https://sealos.io/blog/insforge-vs-supabase/) (its benchmark figures are InsForge's own, not independently reproduced)
- [Toolradar: InsForge pricing](https://toolradar.com/tools/insforge/pricing)

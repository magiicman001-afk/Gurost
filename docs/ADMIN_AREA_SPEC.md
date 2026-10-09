# Admin Area spec: role-based, key-auth, weekly reports, plus Bug U

Written 2026-10-09 by Web Claude from Irfan's instructions (attached spec, verbatim intent). Planning only: no code, nothing built.
Build order is locked by Irfan: 1 Security S3a-d, 2 Section library, 3 Website Builder V2 + Bug U, 4 App Builder + InsForge, 5 **Admin Area (all 12 sections, must-have before launch)**, 6 Launch prep.

Note on the count: the brief says "10 sections" in one heading but lists 12. This spec covers all 12.
Evidence labels: **[repo]** read from the code today; **[spec]** from Irfan's brief; **[proposal]** my suggestion for Irfan to confirm.

## 0. What exists today [repo]

- `public/admin-dashboard.html` (304 lines) and `admin-dashboard.js` (234 lines), served with routes in `server.js`.
- A separate admin login: `POST /api/admin/login` with `accessCode` + `password`, checked against an `admin_accounts` Supabase table (salted hashes), signing an 8-hour token with its own `ADMIN_JWT_SECRET` (scope `admin`). Middleware `requireAdminAuth`.
- Routes already there: users (list, block/unblock, deactivate/reactivate), projects, api-usage, audit, system-health, payments, bot-activity, snapshot, workspaces, company usage, developers (create/list/update).
- **Gaps against this spec:** one flat admin level (no roles), no key invitation/regeneration flow, no weekly report, no ops controls, token in the browser rather than a cookie session (S3 is replacing that), no per-user login history view.
- So the Admin Area is an **extension and restructure** of what exists, not a blank start. Estimates below assume reuse.

## 1. Roles and access matrix [spec, with gaps filled by proposal]

Roles: **Owner** (Irfan), **Admin**, **Team Lead**, **Engineer**, **Viewer**. Sections numbered as in the brief.

| # | Section | Owner | Admin | Team Lead | Engineer | Viewer |
|---|---|---|---|---|---|---|
| 1 | Dashboard | all | all except revenue | own team | own work | numbers only |
| 2 | Weekly report | full | no revenue lines | team lines | no | full numbers, read-only |
| 3 | Software inventory | rw | r | r | r | r |
| 4 | Models and APIs | rw (rotate keys) | r (no balances $) | no | no | no |
| 5 | Projects | rw | rw | team only, r | r (assigned) | no |
| 6 | Builds log | r | r | team, r | r | no |
| 7 | Bots activity | r | r | r | r | no |
| 8 | Security status | rw | r | no | no | no |
| 9 | Code and deploy | rw | r | r | r | no |
| 10 | Docs links | r | r | r | r | r |
| 11 | Team management | rw | invite/revoke below own role, no key view | no | no | no |
| 12 | Ops controls | rw | no | no | no | no |

Rules:
- **Deny by default.** A section not listed for a role returns 403, enforced on the server for every route (hiding the menu item is cosmetic only).
- A role can create or revoke only roles **below** it (Admin cannot create Admin or Owner). Only the Owner can change the Owner.
- Viewer never sees user personal data, code or ops. Engineer never sees revenue, user lists or admin controls [spec].
- "Own team" needs a `team_id` on each person (new field, section 5). Until teams exist, Team Lead sees all non-financial activity [decided: no team field until 5 or more Team Leads exist].
- **Open point:** Admin "financial details" are hidden [spec]; confirm that "revenue" and "costs" both count as financial.

## 2. Key-auth flow [spec]

1. Owner (or Admin, for lower roles) invites: enters **email + role** (+ team for Team Lead/Engineer).
2. The server makes a 32-character random key (cryptographically random, about 190 bits), stores only a **salted hash** (reuse the existing `verifySecret` scheme), and shows the key **once**.
3. Owner sends the key by WhatsApp or email. Gurost does not email it [proposal]: avoids a secret sitting in mailboxes and avoids needing Postmark for this.
4. Member logs in with **email + key** and is asked to set their own password immediately (optional per brief; **strongly prompted at first login**). After that, key login stays allowed only until a password is set, then is disabled (DECIDED: once a password is set the key is dead; lost password means the Owner regenerates a key).
5. Session: **httpOnly cookie session** from the S3 work (S3b/S3c/S3d), not a token in `localStorage`. Idle timeout 8 hours (matches today), sliding; absolute 7 days [proposal].
6. **Lost key:** Owner clicks Regenerate; the old key stops working at once; a new key is shown once.
7. **Revoke:** sets the person inactive and kills all their sessions immediately ("logout everywhere", an S3 feature).
8. Owner sees all login attempts; each member sees their own login history (time, IP, success or fail). IP addresses are personal data: add to the privacy policy audit-rows line already on the pre-launch list.

Security requirements [spec] and how:
- Keys hashed, never plain: yes, as above. The key is never logged and never appears in URLs.
- Rate limit: per email and per IP (reuse `authLimiter`), plus an escalating delay after repeated failures; lock for 15 minutes after 10 fails and tell the Owner.
- Failed attempts logged to an `admin_login_events` table; **suspicious** = new country or ASN, many emails from one IP, or login right after a regenerate. Flag in section 8 and (once Postmark exists) email the Owner.
- Optional TOTP 2FA (Security Layer 1a): **required for Owner and Admin** [proposal], optional for others.
- Owner account must never be lockable by others; recovery for the Owner is out-of-band (a one-time server command with the Render shell), documented in a runbook [proposal].
- Same-origin and CSRF checks on every admin write (the S3 cookie work covers the mechanism; admin routes must not rely on CORS alone).
- **Dependency:** this flow assumes the S3 cookie session. It must not be built on the old `gurost_jwt` localStorage pattern.

## 3. The 12 sections

For each: what it shows, where the data comes from, and what already exists.

1. **Dashboard (role-filtered).** Cards: builds this week, active users, errors, spend, revenue (if Stripe live), open bugs. Owner: all. Engineer: their builds and bugs. Viewer: numbers only. Source: existing snapshot, projects and api-usage routes, plus new counters. *Mostly exists; needs the role filter.*
2. **Weekly report.** See section 4.
3. **Software inventory.** One row per product (Website Builder, App Builder, Pulse, Business Assistant, Admin, Launch flow): status, version (git short hash plus date), last deploy, owner. Source: a small `products` table seeded by hand, deploy data from the Render API. *New, small.*
4. **Models and APIs.** Per provider (OpenRouter, Gemini, OpenAI image, Deepgram, LiveKit, Supabase, Vercel, GitHub, free providers): connected yes/no, balance where an API exists, last error. Never show key values; show "set / not set". Uses the existing `[code-call]` and `[free-llm]` log data and `api-usage`. *Partly exists.* Balance for OpenRouter and Gemini needs their balance endpoints (to confirm).
5. **Projects.** Filter by user, status, date. **Important:** projects live in an in-memory `PROJECTS` map that resets on deploy [repo, CLAUDE.md], so this section is only trustworthy once projects are persisted in Supabase. Persisting them is a prerequisite (see section 7).
6. **Builds log.** Live and recent builds, failure reason (using the real error text from the Bug S fix), model used, seconds, cost estimate. Needs a persistent `build_events` table; today it is log lines only. *New table.*
7. **Bots activity.** The 8 bots, who spoke when, counts and failures. Source: existing `bot-activity` route. *Exists.*
8. **Security status.** Layers on/off (headers, CSP report-only vs enforced, CORS, 2FA coverage), active sessions, login attempts, flagged logins, CSP reports. *New, built on S3.*
9. **Code and deploy.** Latest commits on `clean-main`, latest Render deploys and status, live site health. Source: GitHub and Render APIs (read-only tokens). *New.*
10. **Docs links.** One click to CLAUDE.md, TEAM_STATUS, and the specs in `docs/`. Static list of GitHub links; the repo is public, so only link, never inline private content. *Trivial.*
11. **Team management.** Section 5.
12. **Ops controls (Owner only).** Restart server, clear cache, redeploy, rotate API keys, test connections. Each action needs: a confirmation step, a typed reason, an audit entry, and a cooldown. "Rotate keys" is the dangerous one: it must write to Render env vars and trigger a redeploy, so it is **phase B** and may be better as a guided checklist than a button [proposal]. "Test connections" is read-only and ships first.

## 4. Weekly report format [spec]

- **Schedule:** every Sunday 21:00 Europe/London, plus **on-demand** "Generate this week's report now", plus an optional daily summary the Owner can switch on ("if I request it every day").
- **Storage:** a `weekly_reports` table (week start, JSON payload, generated at, generated by). Show the last 12 in the admin. The report is the stored JSON rendered by one template, so the email and the page cannot disagree.
- **Contents (in this order):**
  1. Headline: builds completed, build success rate, new users, revenue, AI spend, net (revenue minus costs).
  2. Done this week: commits merged and features shipped (from `git log` of `clean-main`).
  3. Crashes and errors: top errors by count with first/last seen, builds that failed and why.
  4. Bugs: opened, fixed, still open (from a `bugs` table or from `CLAUDE.md` "Known bugs" until a table exists).
  5. Money: revenue (Stripe, only when live), costs by provider, **"not making"**: failed or abandoned builds, free-plan usage, churn and refunds. Mark any figure that is an estimate.
  6. Users: new, active, blocked, deletion requests.
  7. Team activity: logins and actions per member (Owner and Admin view only).
  8. Credit and balances: OpenRouter balance and the Gemini prepayment status (today both are depleted [repo, CLAUDE.md]).
- **Honesty rule:** if a data source is not connected (Stripe not live, Postmark not set), the report says "Not connected" for that line. It never shows zero or an invented figure.
- **Delivery:** in-app first. Email (Owner and Admins weekly, Viewers monthly, Team Leads and Engineers in-dashboard only) via Postmark only once Postmark is configured (it is on the "Parked" list), so the report does not wait on it.
- **Role view:** Viewers get the numbers only; Team Leads get their team lines; revenue lines are hidden from everyone except Owner and Viewer (investors, per the brief), and from Admin.

## 5. Team management flow (section 11) [spec]

- **List:** name, email, role, team, status (invited / active / revoked), last login.
- **Invite:** email + role (+ team). The key is generated and shown once with a Copy button and a clear "this will not be shown again" notice.
- **Change role** (downwards or sideways within the rule above) and **move team**; each is audited.
- **Regenerate key** and **Revoke**: each needs a confirmation and kills the person's sessions.
- **Per-user activity log:** logins, sections opened, write actions (ops, role changes), filterable by date.
- New or changed tables [proposal]: `admin_accounts` gains `role`, `team_id`, `email`, `password_set` and `key_hash`; new `admin_teams`, `admin_login_events`, `admin_audit`, `weekly_reports`, `build_events`. Row-level security on all, service-role access only, since the app server is the only reader.

## 6. Bug U: built sites use anchor scrolling instead of real page navigation

- **Severity:** HIGH. It breaks the multi-page promise.
- **Symptom:** on a built site, clicking "birthday cake" (or any item) only scrolls up or down the one page. It should open a real page, for example `/order-birthday-cake`, with a form that is pre-filled with that item.
- **Cause (hypothesis, not yet traced in code):** the Website Builder emits one single-file HTML page, and the navbar and links use `href="#section"`. There are no per-page files and no router. This agrees with "Real 'add a page' feature" being parked in `CLAUDE.md`.
- **Definition of done:**
  1. A site is a set of pages (`/`, `/menu`, `/menu/<item>`, `/services/<service>`, `/contact`, `/order-<item>`), each a real HTML document with its own `<title>`, one `<h1>`, and navbar and footer shared.
  2. No link in the nav, menu or cards uses `href="#"` or a bare `#id` to reach a different page. In-page anchors stay allowed only for same-page jumps.
  3. A form page arrives pre-filled from the link (query string or path slug), and every form posts to the form handler.
  4. A static check in the quality gate fails the build if any internal link points to a page that does not exist (dead-link check) or uses `href="#"`.
  5. Mobile: nav drawer links navigate and close the drawer.
- **Where it connects:** the section library must be page-aware (slot `links[].href` gets real paths, the assembler generates the page set), and **Website Builder V2** owns the multi-page output (the V2 spec already asks for five pages). So Bug U is **fixed inside V2, not as a quick patch**, consistent with the locked build order. A cheap interim honesty fix is possible earlier: have Pulse say plainly that links scroll on the current build (already the behaviour of the "add a page" answer).
- **Tests:** link-graph test over every generated site; a Playwright click-through of the home page nav and one card; a pre-filled-form test.
- Add as "Bug U" in the `CLAUDE.md` known-bugs list when the doc next changes.

## 7. Build order and effort estimate (rough, after prerequisites)

**Prerequisites (outside this spec):** S3a-d cookie sessions and sessions table; persistent projects (the in-memory map must go before section 5 means anything); Postmark for emailed reports (not required for in-app).

| Phase | Work | Days |
|---|---|---|
| A. Foundation | roles, access matrix middleware (deny by default), `admin_accounts` migration, key invite/regenerate/revoke, login history, rate limits, tests | 4 to 5 |
| B. Data plumbing | `build_events`, `bugs` source, products table, Render and GitHub read APIs | 3 to 4 |
| C. Sections | role-filtered Dashboard, Inventory, Models and APIs, Projects, Builds log, Bots, Security status, Code and deploy, Docs links (many reuse existing routes) | 5 to 6 |
| D. Weekly report | generator, storage, scheduler, on-demand button, in-app page, Postmark email later | 3 to 4 |
| E. Team management UI | invite flow, per-user log | 2 to 3 |
| F. Ops controls | test connections first; restart, clear cache and redeploy with guards; rotate keys last | 2 to 4 |
| G. Hardening | TOTP for Owner/Admin, suspicious-login flags, cross-role access tests, penetration pass by Laptop Claude | 2 to 3 |
| **Total** | | **about 21 to 29 working days** |

Suggested slicing for approval-sized commits (each within the 3-file rule or pre-approved batch): A, then B+C in slices of three sections, then D, E, F, G. A first usable "Owner sees weekly report" milestone is reachable after A + B + D (about 10 to 13 days) if Irfan wants an early win.

**What breaks or changes:** the existing admin login moves from the flat access-code + password to email + key and cookie sessions (existing admin accounts need a migration to the Owner role so Irfan is never locked out); the admin page is restructured by role. **Test list:** every route per role (403 matrix), key shown once and hashed, regenerate kills the old key, revoke kills sessions, lockout and rate limits, report numbers against known fixtures, no secret in any response or log.

## 8. Risks and decisions

Decisions by Irfan (2026-10-09):
1. **Key after password:** once a password is set, the key is dead. Lost password: the Owner regenerates a new key. (Two valid credentials would be more attack surface.)
2. **Report recipients:** Owner and Admins get the report by email weekly. Viewers (investors) get it monthly (trajectory, not noise). Team Leads and Engineers see it in the dashboard only, no email.
3. **Teams:** no team field yet. Team Leads see "all non-financial". Add real teams when 5 or more Team Leads exist.
4. **Rotate API keys:** a guided checklist, never a one-click action on production credentials: generate new key, test it, swap it in Render, confirm it works, revoke the old key.
5. **Migration:** the existing admin account must migrate to the Owner role so Irfan is never locked out (critical, first step of phase A, with a tested rollback).
6. **Projects section:** depends on persisting projects to the database, which is part of Website Builder V2.
7. **Bug U** is fixed inside Website Builder V2, not as a quick patch.

Risks that remain:
1. **This is the most powerful door into Gurost.** Owner ops controls can redeploy. Highest security surface: 2FA for Owner and Admin, same-origin checks, full audit, a re-login before ops actions.
2. **Admin sees user data** (IP, projects). The privacy policy, the erasure route and the adviser review must cover the admin system itself.

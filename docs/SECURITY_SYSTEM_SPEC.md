# Gurost Security System: spec

Status: written 2026-10-12 (Web Claude). Source: Irfan's directive: "Our security needs to be top. We need a security
procedure in place so nothing leaks. Our cleanups need to be strong. If bots can't fix, they email us. We need to cover
our asses big time." This is a system of five layers, not a one-off fix.

Owner split: Laptop Claude owns S3 (sessions table, cookie login, WebSocket auth, logout everywhere). Nothing here
re-does S3; where a piece depends on it, it says so.

## 0. Honest status (what is real today, what is not)

Real and live (verified in code and tests):
- Keys redacted from every log line (`lib/log-redact.js`, `5c5a480`): stdout and stderr, shapes plus exact env values.
- Passwords hashed with scrypt (`server.js`, Node crypto). Admin member credentials are hashed and never selected back.
- Security headers on every page, CORS allowlist, `/shared/:token` pages sandboxed (`lib/security-headers.js`).
- Rate limits: IP limiter, login limiter (8 per 15 min), per-user limiter, site-form limiter, admin ops lockout.
- Admin: roles with deny-by-default matrix, role re-read from the database, audit table, ops actions audited.

NOT real yet, so not to be described as done:
- Cookie sessions: S3, in progress with Laptop Claude. Admin uses an 8-hour token in the browser.
- Two-factor login for admin: not built.
- CSP is report-only. Important: the policy allows `'unsafe-inline'` scripts (generated sites and the pages need
  them), so enforcing it blocks framing, plugins and foreign form posts, but it does NOT stop an injected inline
  script. Escaping is the real XSS defence; CSP is the second wall. Moving to nonces is a larger change (section 1.2).
- Dependency scanning, secret scanning, log scanning, alerts, auto-block, auto-revert: none exist yet.
- Email: Postmark env vars are not set on Render, so no alert email can leave the server until they are.

Corrections to the directive's "already done" list: "Session cookies" is S3 (pending); everything else listed is true.

## 1. LAYER 1: PREVENT

1.1 Escaping. One rule: every value that reaches `innerHTML` or an HTML template string goes through `escapeHtml`
(or is put in with `textContent`). Enforced by a scanner (section 2.5) that fails the test suite when a template
interpolates an unescaped value. Server-rendered HTML gets the same check. Hostile-string tests for every admin and
user page renderer.

1.2 CSP. Plan in three steps, each its own commit: (a) read the report-only violations and fix pages that
violate; (b) set `CSP_ENFORCE=1` (needs Irfan's phone walkthrough first; it can break the builder preview, so it is a
switch, not a code change); (c) later, replace `'unsafe-inline'` with nonces on Gurost's own pages (generated sites
stay sandboxed under `/shared`).

1.3 Rate limiting. Admin routes get their own stricter limiter (per IP and per admin); login stays 8 per 15 min;
public write routes keep per-IP limits; API routes keep the per-user limiter. Limits are stated in one table in
`lib/rate-limits.js` so they can be reviewed.

1.4 Input validation. A small server-side validation helper (`lib/validate.js`: string length, enum, uuid, integer
range, email, no control characters) used on every route that takes a body, query or param. Reject early with 400.
Client-side checks never count.

1.5 Dependencies. Commit the lockfile, pin exact versions, GitHub Dependabot for weekly security PRs (this is the
right tool for "auto-create PR with fixes"; the sandbox cannot reach the npm registry, so our own code cannot do it),
and `npm audit` in CI.

## 2. LAYER 2: DETECT

2.1 Secret scanner: `scripts/secret-scan.js`, run by a git pre-commit hook (`.githooks/pre-commit`, enabled with
`git config core.hooksPath .githooks`) and by CI on every push. Same shapes as the log redactor plus AWS keys.
Blocks the commit. The repo is PUBLIC: a key that reaches GitHub history is leaked for good, so this is the most
important scanner. Also ask Irfan to turn on GitHub's own secret scanning and push protection (free for public repos).

2.2 Log scanner: hourly. If `RENDER_API_KEY` is set it reads recent Render logs and checks for key shapes; always
runs a canary self-test (a fake key is logged and must come out redacted). Any hit raises an alert.

2.3 Dependency scanner: daily `npm audit` through CI plus Dependabot; results appear in the admin Security tab.

2.4 Config auditor: on startup and weekly. Flags missing secrets, weak values (short, default-looking), duplicated
values across variables, and flags that should be on. Never prints a value.

2.5 XSS scanner: two parts. Static (in the test suite, so every build fails on a hole): finds unescaped
interpolation in `innerHTML` templates across `public/`. Dynamic: renders pages with hostile strings and checks that
no script runs and no raw tag appears.

## 3. LAYER 3: RESPOND

3.1 Alert system: events with level LOW / MED / HIGH / CRITICAL, stored in `security_events`, shown as a red banner
in admin. Email through Postmark when its env vars are set. Sound and a browser notification while the admin page is
open. A true phone push needs a push service and is parked.

3.2 Auto-rotate: honest scope. Gurost holds no management rights over OpenRouter, Supabase, Gemini or GitHub keys, so
it cannot rotate them by itself. Version 1 = CRITICAL alert, the guided rotation checklist (already built in the Ops
tab), and a record of when each key was last rotated. Real automation is added per provider only where a management
API key exists and the Owner opts in.

3.3 Auto-block: repeated failed logins or abuse patterns put an IP on a block list within the request, auto-unblock
after 1 hour, every block logged. In-memory for speed, mirrored to the database so a restart does not free an
attacker. Owner can unblock. Never blocks an IP that is logged in as an admin.

3.4 Auto-revert: version 1 = detect (error rate over threshold for two checks in a row, crash loop) and alert with a
one-click "revert to last good deploy" for the Owner. Fully automatic revert comes only after that has been seen to
work, with a hard limit of one revert per hour, and never across a database migration. Needs `RENDER_API_KEY`.

3.5 Email escalation: when a bot level cannot fix an issue it emails Irfan: what happened, what was tried, what needs a
human, link to the admin view, buttons "I'm on it" and "Auto-fix it" (both are admin-page links with login).

## 4. LAYER 4: ESCALATE

Security issues ride the existing chain (fixer, manager, senior). The senior bot's report for a security issue lists
the vulnerability, how it could be exploited, and the fix. Level 4 is the alert plus email from 3.1 and 3.5. One
attempt per level, the same rule as builds.

## 5. LAYER 5: AUDIT

5.1 Security events timeline in admin: every event, fix, alert and escalation, filterable and exportable.
5.2 Threat model: `docs/THREAT_MODEL.md` (NOT written yet), reviewed quarterly.
5.3 Compliance dashboard: GDPR, UK consumer rights, SOC 2 preparation, each item with a status and the gap. These
are checklists of what we do, not legal advice; a qualified adviser still has to review (as the privacy policy note
in CLAUDE.md says).

## 6. Build order and what needs Irfan

Week 1: Layer 1 (escaping audit and scanner, rate limits, validation, dependency pinning, CSP step a), secret scanner.
Week 2: log scanner, dependency scanner, config auditor, alert system.
Week 3: auto-block, auto-revert (detect plus one-click), email escalation, security admin views.
Week 4: threat model, compliance dashboard, penetration test (simulated attacks against our own app, in the test suite).

Needs from Irfan: enable GitHub secret scanning and push protection; set Postmark env vars on Render; a Render API
key for the revert and log scanner; his phone walkthrough before `CSP_ENFORCE=1`; decide on 2FA method (authenticator
app recommended, built with Laptop Claude after S3 so it uses the same sessions).

## 7. Principles (never break)

1 Never trust user input. 2 Never log secrets. 3 Never expose internals to users. 4 Never run unescaped values in
HTML. 5 Always validate server-side. 6 Always rate-limit public routes. 7 Always encrypt sensitive data at rest.
8 Always require 2FA for admin (not yet built, see section 0). 9 Always log security events. 10 Always have a
rollback plan (`git revert`, and the Ops tab).

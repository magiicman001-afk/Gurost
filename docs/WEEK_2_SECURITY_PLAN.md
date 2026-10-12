# Security Week 2: plan (log scanner, dependency report, config auditor, alert system, email templates)

Written 2026-10-12 (Web Claude). **Plan only: nothing here is built.** It extends `docs/SECURITY_SYSTEM_SPEC.md` (layers 2 and 3)
and is written for Irfan: every term is explained, every threshold has a reason.

**Gate before building (Irfan's decision, 2026-10-12):** Week 2 does not start until the GitHub security workflow is green. Today
the secret scans and tests pass; the dependency audit step is red (0 critical, 12 high) and waits for Laptop Claude (see the
hand-off in `CLAUDE.md`). Reason: an alert system built on a pipeline that is always red teaches everyone to ignore red.

## 0. The one idea that ties it together

Every piece below does the same three things: **look** (a scanner), **decide** (is this worth a human?), **tell** (an event
in one shared place, `security_events`). The four items are four scanners feeding one alert system. Building the shared place
first means each scanner is small.

## 1. The shared place: security events (build first)

A table `security_events` in Supabase and `lib/security-events.js` (one function, `record(event)`).

| Column | Meaning |
|---|---|
| `id`, `created_at` | automatic |
| `level` | LOW, MED, HIGH or CRITICAL (section 5.1) |
| `source` | which scanner: `log`, `dependency`, `config`, `login`, `ci`, `manual` |
| `kind` | short fixed code, e.g. `key_in_log`, `high_vulnerability`, `missing_secret` |
| `title` | one plain sentence a non-programmer can read |
| `detail` | extra facts. **Never a secret value**: it passes through `lib/log-redact.js` before it is stored |
| `fingerprint` | a stable hash of source + kind + subject, so the same problem is one event, not 500 |
| `status` | `open`, `acknowledged`, `fixed`, `muted` |
| `count`, `last_seen_at` | how many times it was seen again (repeats update the row) |

Rules: a repeat of an open event only raises `count` and `last_seen_at` (this is what stops alert floods); a fixed event that
comes back opens a new one and is marked "came back"; events are never deleted (audit layer), only closed.
If the database is down, `record` writes one redacted line to the log and never throws (security code must not crash the app).

Admin: the Security tab gets a red banner when any HIGH/CRITICAL event is open, and a list (filter by level, source, status;
buttons Acknowledge and Mute-for-7-days for Owner and Admin; Viewer sees but cannot click). Uses the existing role matrix
(`security` section) and `validateInput` on the write routes.

## 2. Log scanner

**What it scans:** the server's own recent log output (a rolling in-memory buffer of the last ~2,000 lines, which needs no
outside access) and, if `RENDER_API_KEY` is set, the last hour of Render's logs through Render's API.
**What it looks for:** the same key shapes as `lib/secret-scan.js` (OpenRouter, OpenAI, Google, Supabase, JWT, database URL
with password, GitHub, AWS) plus the exact values of our own environment variables (if the text of `OPENROUTER_API_KEY`
appears in a log, that is a leak even if its shape is unusual).
**How often:** every hour, and once at startup.
**If it finds something:** CRITICAL event `key_in_log` naming the *kind* of key and the log line number or time, never the key.
Redaction (`lib/log-redact.js`) should have hidden it, so a hit means redaction has a hole: the event says "redaction missed
this", and the guided key-rotation steps in the Ops tab are linked.
**Canary self-test (proves the scanner works):** each run logs a fake key made of random characters, then checks that
(a) the log line came out redacted and (b) the scanner would have caught it unredacted. If either check fails, that is a
CRITICAL event `scanner_blind`: "the alarm itself is broken". A silent scanner is worse than none.
**Other cheap log checks (same pass):** more than 20 failed admin logins in 10 minutes (HIGH `login_burst`); more than 50
server errors (status 500) in 10 minutes (MED `error_spike`); the string "Unhandled" crash lines twice in an hour (HIGH `crash_loop`).
**Cost:** reading a buffer and a regex pass; no model calls.
**Tests:** a fixture log with one fake key of each shape is found; a clean log gives zero; the canary fails when redaction is
turned off; no event detail ever contains the fake key. (Fake keys carry `secret-scan-ok: why`.)
**Needs Irfan:** `RENDER_API_KEY` for the Render-side logs (optional; the in-process buffer works without it).

## 3. Dependency report (admin)

**What it shows (Security tab, new "Dependencies" block):** counts by severity (critical, high, moderate, low), then the list
of affected packages: name, installed version, severity, whether we use it directly or it comes with another package,
and the fixed version if there is one. A line at the top says when it was last checked and whether the last GitHub workflow
was green.
**Where the data comes from:** the server runs `npm audit --json` itself once a day (the live server can reach the npm
registry, unlike the sandbox where Web Claude works) and keeps the result in memory and in a `dependency_reports` row.
No new package and no GitHub token needed. Optional later: also show the last CI result using the GitHub API.
**Events:** a new critical or high finding opens a `high_vulnerability` event (CRITICAL if critical, HIGH if high); a
finding that disappears closes its event automatically. Moderate and low are listed but raise no alert (they would drown the
real ones); they are counted in the weekly summary.
**What the page tells a non-programmer to do:** "Ask Laptop Claude to update `<package>`" with the exact command shown
(`npm install <package>@<version> --save-exact`). The page never offers an "update everything" button: blind updates break
the app, and our packages are pinned on purpose (a test enforces it).
**Honest limits:** `npm audit` only knows published flaws; it says nothing about a package someone has hijacked. The pin,
the lockfile and Dependabot (when Irfan turns it on in GitHub) are the other half.
**Tests:** parse a saved audit JSON fixture (including the "fix is a downgrade" oddity seen with lighthouse); severity
mapping; event opens and closes; a failed audit run (no network) records "could not check", not "all clear".

## 4. Config auditor

**What it checks** (names and states only; values are never read out or logged):
1. **Missing must-haves:** `OPENROUTER_API_KEY`, `SUPABASE_URL`, the Supabase server key, the admin JWT secret, `GITHUB_TOKEN`.
   Missing = HIGH `missing_secret`. Missing nice-to-haves (`GEMINI_API_KEY`, `POSTMARK_API_KEY` and its from-address,
   `RENDER_API_KEY`, `DEEPGRAM_API_KEY`) = LOW, shown as "feature off because X is not set".
2. **Weak values:** a secret under 20 characters, a value equal to a placeholder (`changeme`, `secret`, `test`, `ci-placeholder`,
   `your_key_here`), or a JWT secret under 32 characters. The event says which variable, never what it holds.
3. **Duplicates:** two different variables holding the same value (usually a copy-paste mistake that makes one key's
   leak open two doors). Compared by hash, so the value never leaves the check.
4. **Flags that should be on:** `CSP_ENFORCE` (off until Irfan's phone walkthrough: shown as "report-only", LOW),
   `PREMIUM_PIPELINE`, `DESIGN_MEMORY`, `ESCALATION_HIERARCHY` (shown as a status line, not a fault, because they are
   deliberate switches); `NODE_ENV=production` missing = MED.
5. **Known-wrong:** the leftover Supabase key `gurost_server_2` cannot be seen from here; the page keeps an Owner checklist
   item "deleted `gurost_server_2`" with a tick box and a date.
**When:** at startup and every Sunday 06:00 UK time (same slot as the weekly routine in the Guide).
**Output:** a table (check, state, what to do) in the Security tab, and one event per fault.
**Tests:** an env fixture with each fault; the output never contains any fixture value; a clean env gives no HIGH.

## 5. Alert system

### 5.1 Levels (what each means in plain English)

| Level | Meaning | Examples |
|---|---|---|
| CRITICAL | A secret may be exposed, or the alarm itself is broken. Act now. | `key_in_log`, `scanner_blind`, secret scan fails on the live repo, critical vulnerability |
| HIGH | Real risk, fix today. | high vulnerability in a package we use, missing required secret, 20+ failed logins, crash loop |
| MED | Needs a look this week. | error spike, `NODE_ENV` not production, CI red for over a day |
| LOW | Information. | optional feature not configured, moderate vulnerabilities count |

### 5.2 Channels

| Channel | Who | When | Status |
|---|---|---|---|
| Red banner in admin (all roles that can open Security) | everyone with access | any open HIGH or CRITICAL | build in Week 2 |
| Security tab list | Owner, Admin (act), Viewer (read) | always | build in Week 2 |
| Sound and browser notification while the admin page is open | the person looking | new HIGH/CRITICAL | build in Week 2 (small) |
| Email via Postmark | Owner (Irfan) always; Admin for HIGH+ | see 5.3 | built the moment Postmark variables exist; **until then the code logs "email not configured" and the banner is the only channel. This must be said on the page.** |
| Phone push | Irfan | CRITICAL only | **parked**: needs a push service (the existing `lib/notify.js` is ntfy-based and could be reused later; decide then) |

### 5.3 Thresholds, quiet hours, anti-flood

- **CRITICAL:** email immediately, any hour, repeat every 2 hours until acknowledged (max 6 emails, then a daily reminder).
- **HIGH:** email within 5 minutes during the day; between 22:00 and 07:00 UK time it is held and sent as one email at 07:00,
  unless it is still open and was not acknowledged, in which case it follows the CRITICAL rule only if the Owner turns on
  "wake me for HIGH" (default off).
- **MED:** included in a daily digest at 07:30 (only when there is something).
- **LOW:** weekly digest on Sunday with the routine reminder; never its own email.
- **Quiet hours** are a setting (default 22:00 to 07:00, Europe/London) stored with the Owner's settings; CRITICAL ignores them.
- **Flood guard:** same fingerprint = one email per level rule above (the `count` goes up, not the mail). At most 10 alert
  emails per hour across everything; the 11th becomes "N more alerts, see admin" so a bug cannot spam or run up cost.
- **Acknowledge** stops repeats and records who and when. **Mute 7 days** is allowed for MED/LOW only, never for CRITICAL.
- **Self-check:** every Monday the system emails "alerts are working" (a heartbeat). If Irfan stops getting it, the alert
  email path is broken. The admin page also shows "last email sent: <time>, last error: <text>".

### 5.4 Escalation (ties into the bot chain)

Security issues use the same four steps as builds (fixer, manager, senior; one attempt each; spec layer 4). For a *code*
cause (for example an unescaped value the XSS scanner finds) the bots may propose a fix, which is a normal commit that must
pass the tests and shows its diff. For anything involving a **key, an account, a customer's data or money**, bots only
*advise and alert*; a human acts. If the senior step fails or does not apply, the event is HIGH with the "needs a human"
template below. Nothing in Week 2 changes code or settings by itself.

## 6. Email templates (plain text first; HTML copy is the same words)

Sender: the Postmark from-address; reply-to is Irfan. Subject begins with the level so a phone shows it at once.
No secret, no customer name and no key fragment ever goes in an email (emails are copied, forwarded and stored by others).
`{{...}}` are filled in by code from fixed fields only.

**A. CRITICAL / HIGH single alert**

> Subject: [{{LEVEL}}] Gurost: {{title}}
>
> Hi Irfan,
>
> What happened: {{plain_sentence}}
> When: {{time_uk}} (seen {{count}} time(s))
> Why it matters: {{why}}
> What to do now:
> 1. {{step_1}}
> 2. {{step_2}}
> Do not: {{dont}}
>
> Open it in admin: {{admin_link}}   (you will be asked to log in)
> Mark "I'm on it": {{ack_link}}
>
> This is alert {{n}} of at most 6 for this problem. It stops when you acknowledge it.
> Gurost Security

**B. Needs a human (bots could not fix)**

> Subject: [NEEDS YOU] Gurost: {{title}}
>
> Hi Irfan,
>
> Our bots tried and could not fix this on their own.
> The problem: {{plain_sentence}}
> What was tried: fixer: {{fixer_result}}; manager: {{manager_result}}; senior: {{senior_result}}
> What a person must do: {{human_step}}
> Safe to wait? {{safe_to_wait}} (the senior bot's view; it is advice, not a guarantee)
> Open in admin: {{admin_link}}   Mark "I'm on it": {{ack_link}}

**C. Daily digest (07:30, only if there is anything)**

> Subject: Gurost security digest: {{n_open}} open, {{n_new}} new
>
> New since yesterday: {{list of title + level}}
> Still open: {{list}}
> Closed: {{list}}
> Nothing needs you right now. / These need you today: {{list}}

**D. Weekly summary and heartbeat (Mondays)**

> Subject: Gurost security: week summary
>
> Alerts are working (this email is the proof).
> This week: {{new}} new, {{closed}} closed, {{open}} open. Dependencies: {{crit}} critical, {{high}} high, {{mod}} moderate.
> Last checks: log scan {{t}}, dependency check {{t}}, config check {{t}}, last CI run {{state}}.
> Your Sunday checklist is in the Guide tab: {{guide_link}}

**E. "It came back"** (a fixed problem reopened): same as A, with the line "This was fixed on {{date}} and has returned."

A test renders every template with hostile strings (angle brackets, quotes, 5,000 characters) and checks the output has no
raw HTML in the text version, no secret shapes, and no unfilled `{{`.

## 7. Build order (each step its own commit, three files or fewer, pushed at once)

1. `lib/security-events.js` + migration SQL + tests (the shared place). Run the SQL in Supabase (Irfan or the Supabase tool).
2. Admin route + Security tab list + banner (events only, nothing scanning yet). Help text updated (a test enforces it).
3. Config auditor (smallest scanner; proves the pipeline end to end).
4. Log scanner + canary.
5. Dependency report (server-side `npm audit`).
6. Alert rules (levels, quiet hours, flood guard, digest) with email sending behind the Postmark variables.
7. Email templates + test.
8. Guide text for "Read a security alert" gets the real screens (the section is waiting for this).
9. Update `CLAUDE.md` and `docs/HOW_GUROST_WORKS.md` section 4 (built / not built).

Rough size: about three working days of Web Claude time, most of it tests. Each scanner is under ~150 lines.

## 8. What I need from Irfan (nothing blocks the start except the green pipeline)

- Postmark: API key, verified sending address (needed only for step 6's real sending).
- `RENDER_API_KEY` (log scanner reads Render's logs; optional).
- Turn on GitHub secret scanning, push protection and Dependabot alerts (the workflow notes "Dependabot alerts are disabled").
- Decide quiet hours (default 22:00 to 07:00) and whether HIGH may wake him (default no).
- Who else gets emails (default: Irfan only).

## 9. What this plan does not do (be honest)

No phone push, no automatic key rotation, no automatic revert, no auto-block (those are Week 3 or parked). It does not
make us un-hackable; it makes sure we find out fast, and that the next steps are written down. It cannot see a leak that
never reaches our logs, our repo or our dependencies (for example a key pasted into a chat by a person).

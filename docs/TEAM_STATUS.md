# Team status (shared by Web Claude and Laptop Claude; update at the end of every stage)

Last updated: 2026-10-13 (morning) by Web Claude.

## FILE OWNERSHIP (agreed by Irfan 2026-10-12; check this file BEFORE editing; if a clash is possible, write it here and one waits)
| Owner | Files |
|---|---|
| **Laptop Claude** | `server.js`; `lib/*` for security, auth and sessions; all security files; dependencies (`package.json`, the lock file); CI (`.github/`) |
| **Web Claude** | `public/*` (all UI, including the admin UI); `lib/sections/*`; `bots/*`; `docs/*` (specs, plans); `scripts/build-*-preview.js` |
| Shared, tell the other first | `CLAUDE.md` (small, dated additions only), `test/*` (each side tests its own files) |
Generated files (`public/sections-preview.html`, `public/premium-looks-preview.html`) are made by scripts: change the SCRIPT, then regenerate. A hand edit of the output is lost. (Case 2026-10-12 23:35: a hand edit of the premium preview was found uncommitted; it was not Web Claude's. The same two fixes were made in the generator, `9078e87`.)
**Flag defaults (Laptop Claude, 2026-10-13 evening, done - claim released):** SECTION_LIBRARY and PREMIUM_PIPELINE are now on unless "0" (`86ec7c5`, `8ac85b2`); ESCALATION_HIERARCHY already was; DESIGN_MEMORY stays opt-in. Admin inventory reads the same defaults (`2d4793a`). Every env var: `docs/DEPLOYMENT.md`. **For Web Claude:** `lib/admin-guide-content.js` (lines ~76 and ~235) still says SECTION_LIBRARY=1 must be set - it is now on by default; please reword.
**Mic privacy fix (Laptop Claude, 2026-10-13 late, done - claim released):** Stop while the mic is starting now stops it; Stop works while voice loads; mic off when the page is hidden; one mic in the Pulse panel (the hands-free Voice button removed, its code kept, no button). Commits db01c6a, b39b5b8 and the one-mic commit. Needs Irfan phone test. **For Web Claude:** decide whether hands-free voice should come back on the header mic (e.g. a long press) or be deleted.
Known overlaps right now: Week 2 security is Laptop Claude's to build (plan: `docs/WEEK_2_SECURITY_PLAN.md`; Web Claude only helps when asked, and owns the admin screens for it); the admin Guide text (`lib/admin-guide-*.js`, Web Claude) must be updated by whoever adds an admin tab.

## Who is working on what
| Who | Role | Now |
|---|---|---|
| Irfan | Boss, phone tests | Gave the verdict "build on it" on the section preview |
| Web Claude | Day builder | Section library: all 20 sections built; waiting for Irfan's phone verdict on the full preview, then the polish pass |
| Laptop Claude | Evening tester, security | Security S3 (S3a WebSocket auth, S3b sessions table, S3c server side, S3d browser side, S3e admin) |
| DeepSeek | Strategy, second opinion | Not active today |

## Current stage
Sunday plan 2026-10-11 stages 0 to 9 done; stage 10 (summary report) given to Irfan. Next, in this order (Irfan, 2026-10-11): (1) the remaining 17 sections (DONE, batches 1-5; Irfan reviews the full preview), (2) Layer 2 polish (real fonts, Pixabay images, GSAP, Lenis on published sites only, micro-interactions; test on 5 business types), (3) Website Builder V2.

## Done
- Stage 0 `b36973e` memory foundation. Stage 1 `dda80c5` design tools installed globally.
- Stage 2 `a731c2a` foundation (manifest of 20 sections, 6 palettes, base.css, render.js, test helper).
- Stage 3 `d045748` Navbar A/B/C. Stage 4 `fdbb332` Hero A/B/C. Stage 5 `c230068` Footer A/B/C.
- Stage 6 `7ab4eb5` preview page `public/sections-preview.html`; Bug BB (controls covered the section on phones) fixed `2008b66`.
- Stage 7 `3ac25b0` assembler `lib/sections/assemble.js` + `recipes.json` behind `SECTION_LIBRARY=1` (off by default; wired into the Website Builder afterwards by V2 commit 2, `81916cf`).
- Stage 8 `2317804` quality gate `lib/sections/quality-gate.js` (static + browser + Impeccable advisory; swap variant, then default content, then ship; never throws).
- Tests: 1503 run, 1501 pass (the 2 failures, `cors-policy` and `security-headers`, need `express`, which only the laptop has).

## In progress
- Stage 9 (this commit) and stage 10 (report).

## Blocked / waiting
- **S3a has not landed on GitHub** (Laptop Claude). Reconnect clash with `ef392a6` must be fixed before S3a goes live (see CLAUDE.md, RISK note).
- Money: OpenRouter balance negative; Gemini image prepayment depleted (Irfan to top up). Real images (Layer 2) need this.
- DNS answers (registrar, current `gurost.com` target) not yet received. Do not touch DNS until hostname routing is deployed.
- Impeccable runs only where `IMPECCABLE_CLI` points at it (this sandbox and the laptop); on Render the gate reports it as skipped.

## Update 2026-10-13 (Web Claude): shared-file edits Laptop Claude should know about
At Irfan's direction the six GDPR fixes touched `server.js` (Laptop Claude's file). Please pull before editing it:
- `POST /api/me/export` rewritten (emails a 24 h link); new public `GET /api/me/export/download` (above the auth line, token-signed, rate limited).
- New `DELETE /api/account` (Stripe subscriptions cancelled first, rows and files deleted, credit records anonymised, account record last).
- Retention job started inside the `listen` callback (`lib/retention.js`, `RETENTION_JOB=off` disables).
- New files: `lib/user-data.js` (the one list of user data; add a table here and it is exported and deleted), `lib/retention.js`, tests `data-export`, `account-delete`, `retention`, `marble-loader`.
Not done, waiting on Irfan "go" + Laptop Claude: session idle timeout (30 min, warning at 28; today there is none). Waiting for Irfan: phone test (marbles, export, delete on a throwaway account), OpenRouter privacy settings.
Full test run in my sandbox: 33 failures, all missing packages and the same set as before this work (no new failures); GitHub CI is the judge.

## Rules in force
Only `clean-main`; never `main`; never force-push; `git fetch` before push; push immediately after commit; hold all pushes while Irfan is testing live; nothing from `.claude/` and no `CLAUDE.local.md` in the public repo.

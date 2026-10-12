# How Gurost works

Written 2026-10-12 by Web Claude, for Irfan. This is the master reference. It has three jobs:

1. **The "if Irfan is hit by a bus" document.** Someone who has never seen Gurost should be able to read this, find
   everything, and keep the company running.
2. **The investor overview.** Section 1 to 4 say plainly what the product is and how far along it is.
3. **Your own map.** When you ask "how does this part work?", the answer starts here.

It describes what exists today and says so when something is not built yet. Where a detail changes often (counts,
status), this file points at the file that holds the truth instead of copying numbers that go stale. Every technical word
is explained the first time it appears, and the glossary at the end repeats them.

---

## 1. What Gurost is

Gurost is a voice-first AI builder. A person says (or types) what they want, for example "a website for my bakery", and
Gurost builds it. It is owned by Surii Global LTD.

What makes it different is not the AI. It is the promise. These are the **design principles**, and they never change:

- **You own your code from day one.** Whatever Gurost builds belongs to the customer.
- **You get all the keys.** Signing keys, API keys, database keys. Nothing is held back.
- **You can publish anywhere.** No lock-in to Gurost.
- **No hidden lock-in.** Clear pricing, easy cancel.
- **If we fail, we refund.**

Why these exist: Irfan paid another AI builder (Emergent) and it withheld the keys. He then paid a freelancer more than
GBP 300 to fix it. Gurost must never do that to anyone. Every product decision is checked against these five lines.

## 2. The products

There are four. The first is the current priority.

| Product | What it does | Where the code is |
|---|---|---|
| **Website Builder** | Turns a description into a website. Offers four design directions to pick from, then lets you edit by talking to it. | `bots/variant-bot.js` |
| **App Builder** | Builds a working app in three stages: the data (schema), the server (backend), the screens (frontend). | `bots/app-bot.js` |
| **Business Assistant** | Helpers for running a business: Research, Email, Task and Code agents. | `bots/assistant-bot.js` |
| **Amend Website** | Takes an existing website, audits it, rebuilds it, and keeps the brand. | `bots/revamp-bot.js` |

**Current priority (decided 2026-10-09):** the Website Builder must reach premium quality first (design quality about
4 out of 10 today, target 8 out of 10). The App Builder waits until the Website Builder is ready to launch.

**The Pulse widget** is the round button on the builders. It is how people talk to Gurost: 13 action buttons, voice, and
Design Mode (point at a part of the page and say what to change). Its code is `public/shared/pulse-widget.js`.

## 3. The systems underneath

These are the parts that make the products good and safe. Each one has a spec in `docs/`.

### 3.1 The section library (design quality)

**The problem:** if you ask an AI to invent a design from nothing, you get an average design. That is why the Website
Builder scores about 4 out of 10.

**The fix:** stop asking the AI to invent design. Instead we built a library of 20 finished sections (navigation bar,
hero, footer, pricing, and so on). Each has three variants (A, B, C) and works in six colour palettes. The AI chooses
and fills in sections; it does not draw them. All 20 are built. They live in `lib/sections/`, and you can look at all of
them on your phone at `/sections-preview.html`.

It is switched off by default (`SECTION_LIBRARY=1` turns it on) and is not yet connected to the builders. Connecting it
is called **Website Builder V2** (`docs/WEBSITE_BUILDER_V2_SPEC.md`).

A **quality gate** (`lib/sections/quality-gate.js`) checks every page before anyone sees it: static checks, a 375px phone
width check, colour contrast, and an advisory check by a tool called Impeccable. If a page fails, the gate swaps the
variant, then falls back to default content, then ships.

### 3.2 The premium pipeline

A set of 24 curated "looks" (design recipes). A generated page is scored against them; the pass mark is 70 out of 100.
Switched on with `PREMIUM_PIPELINE=1`. You approve the 24 looks by viewing `/premium-looks-preview.html`.

### 3.3 Design memory

Gurost remembers which designs scored well for each industry (it keeps the last 50 builds per industry). Four builds in
five reuse what worked; one in five explores something new, so the system keeps learning instead of repeating itself.
Switched on with `DESIGN_MEMORY=1`.

### 3.4 Industry design

`lib/industry-design.js` matches a request ("bakery") to one of 192 industries and feeds that industry's colours and
fonts to the builder. A bakery gets warm browns and cream; a law firm does not. The data comes from the UI/UX Pro Max
dataset (MIT licence, free to use) stored in `lib/design-data/`.

### 3.5 Escalation (when a bot cannot fix it)

If one bot cannot solve a problem, a more senior one takes over, in this order: **builder, fixer, manager, senior**.
Only if all four fail does a human get involved. Switched on with `ESCALATION_HIERARCHY=1`. The aim stated in the
security brief: "If bots can't fix, they email us." The emailing part is not built yet (it needs the Postmark email
service set up on Render).

### 3.6 Models: which AI does which job

Models are called through OpenRouter (one account that reaches many AI companies). `lib/tier-router.js` decides which
model handles which job and what to fall back to when one fails or you have no credit.

- App Builder backend, edits and Pulse: Kimi K2.6 first, then Sonnet 5, GLM-5.2, and a free Nemotron model.
- App Builder frontend: GLM-5.2 first (it is about five times faster).
- Website Builder: unchanged from before. Do not move it to Kimi unless Irfan asks.
- Last resort, only if a key is set: free tiers from Gemini, Mistral, Cerebras and Groq (`lib/free-llm-providers.js`).

Images: `image-bot.js` in the repo root. It tries Gemini first and OpenAI second.

### 3.7 Projects and where they live

Today, projects live **in the server's memory** (the `PROJECTS` map). That means every deploy, and every server restart,
wipes them, and a page refresh loses the project. This is the known **Bug AA**, and it is why a push to `clean-main`
can destroy a build someone is testing. The fix (save projects in the database) is part of Website Builder V2. Until
then: do not push while Irfan is testing live.

## 4. The security system

Written in `docs/SECURITY_SYSTEM_SPEC.md`. The brief: "Our security needs to be top. Nothing leaks."
It has five layers: **Prevent, Detect, Respond, Escalate, Audit.**

**Built (week 1 of 4):**

- **Log redaction** (`lib/log-redact.js`): secrets and personal data are blanked out of logs before they are written.
- **XSS scanner** (`lib/xss-scan.js`): XSS means an attacker sneaks code into a page through text. The scanner reads
  every page script and fails the tests if any value is put into HTML without being escaped (made harmless). A reviewed
  exception must be marked `// xss-ok: reason`. This found and fixed real holes.
- **Input validation** (`lib/validate.js`): every admin write route checks what it is given before using it.
- **Rate limits** (`lib/rate-limits.js`): a table that stops anyone hammering the server.
- **Secret scanner** (`lib/secret-scan.js`): blocks a commit containing a key or password. It runs on your machine
  before every commit (`.githooks/pre-commit`) and again on GitHub (`.github/workflows/security.yml`). This matters
  because the GitHub repo is **public**: anything committed is visible to the world.
- **Pinned dependencies and Dependabot**: the libraries we use are fixed to exact versions, and GitHub warns us when one
  has a known flaw.
- **Admin roles**: Owner, Admin, Team lead, Engineer, Viewer, with "deny by default" (a role sees nothing unless it has
  been explicitly given it). The table is `lib/admin-access.js`.
- **Security headers, CORS allowlist, sandboxed shared pages** (from the 2026-10-08 audit).

**Not built yet (be honest with investors about these):**

- CSP enforcement. The Content Security Policy is the browser rule that blocks unexpected scripts. It is in
  report-only mode (it reports but does not block). Turning on enforcement needs a phone walkthrough first, because it
  can break pages.
- Two-factor login for admins (decision pending: which method).
- Cookie sessions (Laptop Claude's piece, in progress).
- Email alerts, the log scanner, the config auditor, auto-block and auto-revert (security weeks 2 to 4).

## 5. The admin area

The private control room at `/admin-dashboard.html`. Tabs include Overview, Inventory, Models, Projects, Builds, Build
Logs, Memory, Code & Deploy, Docs, Ops, Team, Security, Users, Usage, Health, Payments, Bot Activity and Assistant Audit.
Which tabs a person sees depends on their role.

**Help is built in.** Every tab has a "?" button that explains it in plain English, and there is a **Guide** tab with
routines, step-by-step procedures, emergency steps and a glossary. It shows only what that person's role may do. The
text lives in `lib/admin-guide-help.js` and `lib/admin-guide-content.js`; a test fails if a new tab ships without help,
or if help is outside 200 to 400 words. First-time visitors get a 5-step tour (re-open it from the Guide tab).

## 6. The team

| Who | Role |
|---|---|
| **Irfan** | Founder and boss. Not a programmer. Decides priorities, tests on his phone. |
| **Web Claude** | The day builder. Writes features and fixes. Writes this file. |
| **Laptop Claude** | The evening tester, and does the security work (cookie sessions). |
| **DeepSeek** | Strategy and a second opinion. |

They share one memory: `CLAUDE.md` in the repo root. Both Claudes read it first and `git fetch` before starting, so work
is not done twice. The progress log is `docs/SESSION_MEMORY.md`, the status board `docs/TEAM_STATUS.md`.

## 7. The rules of the code

- The source of truth is the branch **`clean-main`** on GitHub. Render (the host) deploys from it automatically, so
  nothing is live until it is pushed, and anything not pushed can be lost with a machine.
- `main` is not used. Nobody force-pushes.
- Commit, then push **immediately**. Show the change before each commit.
- A change touching more than 3 files stops for a question first.
- Never commit `.env`, `__auth-state.json` or `CLAUDE.local.md`. The repo is public.
- A bad change is undone with `git revert` (a small logged "undo"), not by holding work back.
- Every live test gets a screenshot.

## 8. Daily and weekly workflow

**Each day:** Web Claude builds. In the evening Laptop Claude tests and Irfan tries it on his phone. Fixes happen the
next day.

**Irfan's morning check (3 minutes):** open the admin Overview; check Health is green; look at Build Logs for failures
from the night; look at Security for anything new; check the money balances (below). The Guide tab has the same list.

**Weekly (Sunday):** review the week's builds and costs in Usage; read the Dependabot warnings on GitHub; check that
tests pass on the latest commit; update `CLAUDE.md` with what changed; top up balances if low.

## 9. Money and accounts

- **OpenRouter** (pays for the AI models). The balance is **negative right now**, so paid models fail with a 402
  error. Top up first when anything "does not work".
- **Gemini image API** (pays for images). Prepayment is depleted. Top up.
- **fal.ai** also needs topping up.
- **Render** hosts the live site. **Supabase** is the database and file storage (project `jiadrorezquvthyujykb`).
- **GitHub** holds the code (public repo `magiicman001-afk/Gurost`).
- **Vercel** is used for published sites. A known problem: its deployment protection makes published URLs ask for a
  login, so visitors cannot open them yet.

The keys for all of these live in Render's environment settings, never in the code. Keep a private list of who has
access to each account somewhere safe outside the repo.

## 10. Emergency procedures

Short versions. The Guide tab has the full, role-aware steps.

**The site is down.** (1) Open Render, service `srv-d9t3vbqfngtc73d49100`, and read the latest deploy and its logs.
(2) If it began right after a push, find that commit and `git revert` it, then push. Render redeploys. (3) If not, check
that OpenRouter and Supabase are up and the balances are positive. (4) Tell customers honestly what happened.

**A key leaked** (it appeared in the repo, a log, or a screenshot). Do this immediately, in this order: (1) rotate the
key at its provider (create a new one, then delete the old one); (2) put the new key in Render's environment; (3) check
the provider's usage for anything you did not do; (4) find out how it leaked and fix that. Deleting the file from GitHub
is not enough: the old copy stays in history, so rotating is the real fix. Known open item: delete the Supabase key
`gurost_server_2`.

**A bad change went live.** `git revert` it and push. Do not try to fix forward under pressure.

**Someone should not have access.** In the admin Team tab, revoke them first; ask questions afterwards.

**Customer data question or breach.** Stop and get a qualified adviser; IP addresses count as personal data under UK
law. Note what happened and when.

**The bus plan.** If Irfan is unavailable: (1) a trusted person logs in to Render, GitHub, Supabase, OpenRouter and
Vercel (access held by Surii Global LTD, in a password manager that a second person can open); (2) read this file and
`CLAUDE.md`; (3) with the services paid and the repo intact, Gurost keeps running and any developer or Claude session
can continue from `clean-main`. Setting up that shared password-manager access is an action for Irfan; it is not done
yet.

## 11. Before launch (still to do)

None of this is built: a privacy policy line about audit rows and a review by a qualified adviser; a "delete my account
data" route that clears every user row; per-user GitHub login (today every user's project lands in the owner's GitHub);
checking that all backup repos are private; testing voice on a real iPhone; saving projects to the database (Bug AA);
real page navigation in built sites (Bug U); and the Website Builder V2 work.

## 12. Evening checklist for Irfan

- Delete the Supabase key `gurost_server_2`.
- Top up OpenRouter, the Gemini image API and fal.ai.
- Approve the 24 premium looks at `/premium-looks-preview.html`.
- On Render set `PREMIUM_PIPELINE=1` and `DESIGN_MEMORY=1`, and confirm `ESCALATION_HIERARCHY=1`.
- Test the full flow on your phone.
- Turn on GitHub secret scanning and push protection.
- Set the Postmark email variables on Render, and create a Render API key.
- Decide the 2FA method.

## 13. Glossary

- **Branch**: a separate line of work in git. Ours is `clean-main`.
- **Commit**: saving a change to the code with a note about it.
- **CORS**: browser rule about which websites may call our server.
- **CSP**: Content Security Policy, the browser rule that blocks unexpected scripts.
- **Dependabot**: GitHub's robot that warns when a library we use has a flaw.
- **Deploy**: putting new code on the live site. Render does this when `clean-main` changes.
- **Environment variable (env)**: a setting or secret stored on the server, not in the code.
- **Escalation**: a more senior bot takes over when the first cannot fix a problem.
- **Escaping**: making text harmless before it goes in a web page.
- **Force-push**: overwriting shared history. Never done here.
- **Frontend / backend**: what people see / the server work behind it.
- **Git revert**: a small logged "undo" for a commit.
- **Key (API key)**: a secret password a program uses to talk to a service.
- **Model**: an AI such as Kimi, GLM or Sonnet.
- **OpenRouter**: one account that reaches many AI models.
- **Pulse**: the round talk-to-Gurost button.
- **Quality gate**: the checks a page must pass before anyone sees it.
- **Rate limit**: a cap on how often something can be asked.
- **Rotate a key**: replace a key with a new one and delete the old one.
- **Schema**: the plan of what data an app stores.
- **Section library**: the 20 finished page sections the AI assembles from.
- **Supabase**: our database and file storage.
- **Test suite**: the automatic checks run before changes are accepted.
- **XSS**: sneaking code into a page through text.
- **2FA**: a second proof of identity when logging in.

---

*Keep this file true.* When something here changes, change it here in the same commit. If a statement and the code
disagree, the code is right and this file is wrong; fix the file.

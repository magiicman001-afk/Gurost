# Tool stack review: one playbook for every tool Irfan has sent

Written 2026-10-10 by Web Claude. Planning document only: **nothing has been installed**. Install commands for the 6 active tools are in section 3, waiting for Irfan's approval.
Evidence labels: **[read]** read from the tool's own GitHub/README page today; **[search]** only from a search-result page or third-party site; **[memory]** from my earlier research this week or general knowledge, not re-checked today.
Roadmap order is locked (Irfan, 2026-10-09): 1 Security S3a-d, 2 Section library (week 1-2), 3 Website Builder V2 + Bug U, 4 App Builder + InsForge, 5 Admin Area, 6 Launch prep.

Important framing: tools 1 to 6 below are **Claude Code skills/CLIs used by the builder (Web Claude, Laptop Claude) while writing Gurost**. None runs inside Gurost on Render. Gurost's runtime output is made by the section library plus the models; these tools shape the library and check its quality.

## 1. Inventory (all 20)

Status key: **USE NOW** (Sunday), **USE LATER** (named phase), **STUDY** (read, take ideas, no install), **SKIP**.

### Category 1: Design and UI

| # | Tool | GitHub | Licence | What it does | Status | When |
|---|---|---|---|---|---|---|
| 1 | ScrollCraft | github.com/nateherkai/scroll-craft | MIT [read] | Claude Code plugin that builds scroll-driven premium sites and self-verifies them in a headless browser | USE NOW as reference only (see 3.1) | Study during section library; any build use after V2 |
| 2 | UI/UX Pro Max Skill | github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT [read] | Design-rules skill: 192 palettes, 74 font pairings, 119 UX guidelines, design-system generator | USE NOW (already the source of `lib/design-data`) | Section library, Sunday |
| 3 | Taste Skill | github.com/Leonxlnx/taste-skill | MIT [read] | Design-taste rules with three dials (variance, motion, density) to stop generic "AI slop" UI | USE NOW | Section library, Sunday |
| 4 | Awesome DESIGN.md | github.com/VoltAgent/awesome-design-md | MIT [read] (repo files only; the brand looks belong to the brands) | 73 `DESIGN.md` files extracted from public sites, in a fixed format | USE NOW as a **format** reference only | Palettes/design-system docs, Sunday |
| 5 | Impeccable | github.com/pbakaus/impeccable | Apache-2.0 [read] | Design director skill with 24 commands plus a CLI detector that flags design anti-patterns in HTML | USE NOW (detector = quality gate) | Section library quality gate, Sunday |
| 6 | Playwright CLI | github.com/microsoft/playwright | Apache-2.0 [memory] | Browser automation for visual checks and screenshots; already installed in the sandbox (v1.56.0) | USE NOW | Every UI test, Sunday |

### Category 2: Motion and media

| # | Tool | GitHub | Licence | What it does | Status | When |
|---|---|---|---|---|---|---|
| 7 | "awesome-opus5-5-videos" | The repo I could find is **athemeroy/awesome-claude-5-5-videos** [search]; name differs, **please confirm it is the one meant** | CC BY 4.0 [search] (needs credit if reused) | Source-linked guide to 1,000+ videos made with Opus 5.5 and how each was made | STUDY | Later (video/motion, parked) |
| 8 | GSAP | github.com/greensock/GSAP | GSAP "Standard" licence [memory, checked earlier this week]: free on any website or web app; forbids tools that let users build visual animations without code, and competing with Webflow | Animation engine | USE LATER (hooks only in slice 1; no GSAP code yet) | Section library motion pass; get **written confirmation** before launch |
| 9 | Lenis | github.com/darkroomengineering/lenis | MIT [memory] | Smooth-scroll library | USE LATER | Section library motion pass |
| 10 | React Bits | github.com/DavidHDev/react-bits | MIT + Commons Clause [memory] (cannot be sold as part of a product) | React animated components | STUDY (inspiration only, copy no code) | Reference during motion pass |

### Category 3: Backend (Phase 2)

| # | Tool | GitHub | Licence | What it does | Status | When |
|---|---|---|---|---|---|---|
| 11 | InsForge | github.com/InsForge/InsForge | Apache-2.0 [read] | Agent-native backend (Postgres, auth, storage, functions, deploy) | USE LATER (1 to 2 day laptop test first) | Step 4 of the locked order; see `INSFORGE_INTEGRATION_PLAN.md` |
| 12 | Logto | github.com/logto-io/logto | MPL-2.0 [search] (weak copyleft: changes to Logto's own files must be shared) | Open-source auth platform (OIDC/OAuth 2.1, SSO, RBAC, multi-tenant) | STUDY. **Do not swap S3 onto it**: S3 is mid-flight with Laptop Claude. Revisit for customer-app auth or enterprise SSO | After launch |
| 13 | Instatic CMS | github.com/corebunch/instatic | MIT [read] | Self-hosted visual CMS and publisher in one Bun server (v0.0.x, early) | STUDY | Possible idea source for "edit your site visually" in V2 |

### Category 4: Agent frameworks (study)

| # | Tool | GitHub | Licence | What it does | Status | When |
|---|---|---|---|---|---|---|
| 14 | Council of High Intelligence | github.com/0xNyk/council-of-high-intelligence | **Not stated** [search]: check the repo before reusing anything | 18 AI personas deliberate hard decisions across models | STUDY | Idea source for DeepSeek-style second opinions |
| 15 | Everything Claude Code | github.com/affaan-m/everything-claude-code | **Not verified** [search] | Large agent-harness collection: skills, memory, security, research-first workflow | STUDY | Idea source only |
| 16 | Harness (team architecture) | github.com/revfactory/harness | Apache-2.0 [read] | Claude Code plugin that turns a domain description into an agent team and its skills | STUDY | After launch |
| 17 | HelixDB | github.com/HelixDB/helix-db | **AGPL-3.0** [search] | Graph-vector database in Rust | **SKIP** for now. AGPL obliges us to publish source of anything that serves users over a network with it; Supabase already offers vectors if ever needed | Revisit only with legal advice |

### Category 5: Misc

| # | Tool | GitHub | Licence | What it does | Status | When |
|---|---|---|---|---|---|---|
| 18 | AI Website Cloner | github.com/JCodesMore/ai-website-cloner-template | MIT [read] | `/clone-website <url>` rebuilds a site as a Next.js app (map, observe, build, compare) | STUDY as a reference for Amend Website. Its README forbids impersonation/phishing and passing off others' design; Gurost's own rules agree, so it is never used to copy another business's site | Amend Website work, after the three builders |
| 19 | OpenPencil | github.com/ZSeven-W/openpencil | MIT [read] | Open-source AI-native vector design tool with an MCP server (`.op` files); Rust rewrite still in progress | STUDY | Later, if a design-handoff step is wanted |
| 20 | ppt-master | github.com/hugohe3/ppt-master | MIT, attribution required [read] | AI workflow that turns documents into editable PowerPoint decks (Python 3.10+) | SKIP (not on the Gurost roadmap; Claude's own slide tooling covers decks) | Revisit if investor decks become a product feature |

Licence summary: the tools that can end up **inside shipped Gurost code** are the ones to watch. None of the 6 active tools ships inside Gurost output, so none of their licences touches customers. GSAP (when added) ships to customer sites: written licence confirmation is a launch task. HelixDB (AGPL) is the one to keep out of the stack.

## 2. ACTIVE TOOLS: USE SUNDAY

These 6 are installed or used when the section library starts (after S3 lands and Irfan says go):
1. **ScrollCraft** (reference, see caveat)
2. **UI/UX Pro Max** (design rules and data)
3. **Taste Skill** (design taste rules)
4. **Awesome DESIGN.md** (format reference)
5. **Impeccable** (design critique plus the detector quality gate)
6. **Playwright CLI** (visual verification)

## 3. Install check (commands waiting for approval; nothing run)

General notes: slash commands (`/plugin ...`) run inside Claude Code on whichever machine installs them; Web Claude's sandbox and the laptop are separate, so each machine installs its own copy. The repo is **public**: prefer installs that go to `~/.claude` (global) so third-party files do not land in the Gurost repo. My sandbox has Node 22 and Playwright 1.56.0 already; npm and GitHub are reachable, other sites usually are not.

### 3.1 ScrollCraft
- **Install** [read]: `/plugin marketplace add nateherkai/scroll-craft`, then `/plugin install nateherk-design`, then `/nateherk-design:scrollcraft` to use it. Run `/reload-plugins` if asked. Check: `node scripts/doctor.mjs`; workspace: `node scripts/workspace.mjs --ensure`.
- **Dependencies:** Node 18+; a **full ffmpeg build**; `playwright-core` plus Chrome for its own checks; `KIE_AI_API_KEY` optional (paid asset generation).
- **Where it fits:** it builds scroll-video sites by an interview and a bundled engine. That is a different output style from our plain-CSS section library. Best use: study its scoring and self-verification steps and borrow ideas for the quality gate; later, a "premium scroll" hero variant.
- **What it changes:** adds a plugin to Claude Code and a workspace folder; writes sites to its own `builds/` folder, not into Gurost.
- **My concerns:** its author says the scripts were only run on Windows; ffmpeg is heavy; generated video costs money; it fights the "model never invents design" rule if used to generate pages. **Recommendation: install on the laptop only, as reference, and do not make slice 1 depend on it.**

### 3.2 UI/UX Pro Max
- **Install** [read], choose one: `npm install -g ui-ux-pro-max-cli` then `uipro init --ai claude --global` (installs to `~/.claude/skills/`, **recommended**), or `npx ui-ux-pro-max-cli init --ai claude --global`, or the plugin route `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`. Preview first with `--dry-run`.
- **Dependencies:** Python 3.x (standard library only, no network calls).
- **Where it fits:** it is already the source of `lib/design-data` (192 palettes), per `CLAUDE.md`. On Sunday it is used to generate the design-system recommendation per industry that feeds the six locked palettes in `INDUSTRY_PALETTES_SPEC.md`.
- **What it changes:** adds a skill to `~/.claude/skills/` (global, so nothing enters the repo). Optional `--persist` writes `design-system/` files into a project: **do not use `--persist` in the Gurost repo** (repo hygiene).
- **Note:** my sandbox's `~/.claude/skills` does not have it (the laptop does), so the sandbox needs its own install to use it.

### 3.3 Taste Skill
- **Install** [read]: `npx skills add https://github.com/Leonxlnx/taste-skill` (all skills), or only the main one: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`. **Recommended: the single main skill.**
- **Dependencies:** Node/npm for the `npx skills` CLI. Several of its skills mention GSAP; GSAP is not installed by it. Image-generation skills in the repo need outside image tools and are not needed.
- **Where it fits:** the three dials (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY, 1 to 10) become written settings per industry in the section CSS briefs, so the 3 variants A/B/C differ on purpose.
- **What it changes:** adds skill files. The page does not say exactly where `npx skills add` writes them (project or global); I will run it with `--dry-run`/inspect the result and, if it writes into the repo, move it to `~/.claude/skills/` before any commit.
- **Caveat:** it is aimed at models writing UI freely; Gurost's rule is the model fills slots and does not design. So the skill informs how **we** write the section CSS, not what the runtime model sees.

### 3.4 Awesome DESIGN.md
- **Install** [read]: nothing to install. Copy a brand's `DESIGN.md` into a project root and tell the agent to build from it. Each folder also has `preview.html` and `preview-dark.html`.
- **Dependencies:** none.
- **Where it fits:** use the **format** (colour palette, typography, components, layout, depth, do's and don'ts, responsive behaviour, agent prompt guide) to write one `DESIGN.md` per Gurost industry from our locked palettes. These become the human-readable design brief next to `lib/sections/palettes.js`.
- **What it changes:** nothing in the repo unless we write our own `DESIGN.md` files (docs only, small).
- **Caveat:** the repo says the tokens are public CSS values and claims no ownership of any brand's identity. Gurost must **not** ship a look-alike of a real brand (our own policy and the clone tool's README both say so). Use for structure, never to copy a brand.

### 3.5 Impeccable
- **Install** [read]: from the project root `npx impeccable install` (update: `npx impeccable update`), or `/plugin marketplace add pbakaus/impeccable`. Then `/impeccable init` (writes a `PRODUCT.md`).
- **Detector** [read]: `npx impeccable detect index.html` (also folders and URLs). `--json` for machine output (schema undocumented). Exit codes: 0 clean, 2 findings, 1 could not scan. Waive a rule with `<!-- impeccable-disable <rule>: reason -->`.
- **Dependencies:** none for the skill; a self-contained engine binary is downloaded once to `~/.impeccable/bin/` (needs outbound network the first time, **may be blocked in my sandbox**). URL scans need Chrome/Chromium.
- **Where it fits:** the static **quality gate** from the section-library blueprint: run `detect` on every assembled page in CI and on the laptop; failing exit code 2 blocks the build. It also covers Bug X style problems (generic, sloppy output).
- **What it changes:** `install` adds a skill and, on Claude Code, a **hook in `.claude/settings.local.json`** that runs the detector after UI file edits and on Stop. Local settings are not committed (confirm `.claude/settings.local.json` is gitignored before installing). `PRODUCT.md` is a new file (docs-level; commit only if Irfan agrees).
- **Not in Gurost runtime:** the detector runs in CI/laptop, not on Render, so the Render image does not grow.

### 3.6 Playwright CLI
- **Install:** already present in the sandbox (Playwright 1.56.0, Chromium pre-installed; do not run `playwright install`). For the laptop: `npm i -D playwright` then `npx playwright install chromium` (Irfan's laptop; check the repo's `package.json` first, since `CLAUDE.md` already lists a Playwright MCP for live tests).
- **Dependencies:** Node; Chromium.
- **Where it fits:** the Sunday visual checks in the slice-1 plan: a 375px overflow check, a contrast spot check, and a screenshot gallery of all 3 variants x 6 industries for each section (`e2e/sections/`), run locally against plain-CSS pages (no Tailwind CDN needed, so it works in the sandbox).
- **What it changes:** dev dependency and spec files under `e2e/`. Screenshots are test artefacts: labelled as test data, not committed.

## 4. Proposed order of use on Sunday (once S3a lands and Irfan says go)

1. Install UI/UX Pro Max and Taste Skill (global); run each in `--dry-run`/inspect mode first.
2. Install Impeccable on the laptop; run `detect` on the six generated palette preview pages to calibrate which rules matter; decide the pass threshold with Irfan.
3. Foundation commit (palettes file, tokens, section checks helper) as in `SECTION_LIBRARY_SLICE_1_PLAN.md`.
4. Navbar, Hero, Footer one by one; for each: Playwright screenshots, Impeccable detect, contrast tests.
5. ScrollCraft: reference reading only, no install on the build machine.

## 5. Decisions by Irfan (2026-10-10)

1. **ScrollCraft:** reference only for slice 1. Stays listed under Sunday as reading material, **not installed** (Windows-tested only, needs ffmpeg, different output style).
2. **Impeccable hook:** approved on the laptop. **First** make sure `.claude/settings.local.json` is in `.gitignore` (added in its own commit); never commit it to the public repo.
3. **HelixDB:** SKIP confirmed (AGPL-3.0).
4. **Logto:** do not swap into S3 while Laptop Claude is mid-build; discuss after S3 completes.
5. **"awesome-opus5-5-videos" (tool 7):** UNCONFIRMED, skip for now; the repo found (athemeroy/awesome-claude-5-5-videos) may not be the one meant.
6. **Licence checks parked, not blocking Sunday:** Everything Claude Code and Council of High Intelligence (verify later); GSAP written confirmation before launch.
7. **Install commands approved to run Sunday**, when the section library starts, **globally, never into the repo**: UI/UX Pro Max (`npm i -g ui-ux-pro-max-cli`; `uipro init --ai claude --global`), Taste Skill (`npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`), Impeccable (`npx impeccable install`; `/impeccable init`), Awesome DESIGN.md (no install, copy the format), Playwright (already installed), ScrollCraft (no install).

Sunday kickoff order: Laptop Claude pushes S3a; Web Claude pulls and verifies the reconnect; install the active design tools; then Navbar, Hero, Footer.

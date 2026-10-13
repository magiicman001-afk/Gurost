# Gurost session memory (running log)

Newest session first. Every session adds an entry: what was done, what was decided, what changed, what's next.
Read this and `CLAUDE.md` before starting work. `git fetch` first and check what the other Claude pushed.

## Session 2026-10-13 (Tuesday): GDPR fixes, marbles, specs (Web Claude)
- **Done and pushed:** GDPR security-spec section (`319ec83`); six fixes: policy `c3cd553`, export `cc9101f`+`4e652a9`, delete `2766a20`+`11430ab`, retention `426ce36`, rights `7b02f8e`, AI data flow `3f9fb7c`; idle-suspension spec `bc46162`; free AI tools spec `5c6c73c`; marbles `80658ce`, `6c639d6`, `3aa5270`, `98d8efe`.
- **Findings:** live database has 39 tables and no foreign keys to the user, so deletion needs the explicit list in `lib/user-data.js`; the policy's provider list did not match the code (rebuilt); export only held the profile (now a full ZIP); launched sites are frozen rows, so idle suspension only matters for deployed backends; several tools in the free-AI list were mis-described (checked, spec corrected); the AI gateway sends no ids but sets no provider data options.
- **Corrections I made to the research list:** MOVA is Apache-2.0; TRELLIS.2 needs 24 GB; benchmark claims are the developers'; AssetFurnace not found; the 10-second video cost has no basis.
- **Not verified live:** everything above (export, delete, retention, marbles). Irfan is testing on his phone.
- **Waiting:** Irfan's phone test; his "go" for the session idle timeout (needs Laptop Claude); OpenRouter privacy settings; adviser review of the policy.
- **Next after the phone test:** fix what it finds, then premium pipeline polish.

## Session 2026-10-12 (Monday): security week 1, admin help, plans (Web Claude)
- **Done and pushed (hashes in `git log`):** security week 1 (log redaction, XSS scanner, input validation, rate-limit table, secret scanner + history allowlist, pinned dependencies); admin Help and Guide (`6bb151c` to `03ebe82`); `docs/HOW_GUROST_WORKS.md`; CI made readable (annotations) and green except the dependency audit (handed to Laptop Claude; aislop since updated by him); all GitHub repos private + test (`0dc0909`); plans: `WEEK_2_SECURITY_PLAN.md`, `PREMIUM_PIPELINE_POLISH_PLAN.md`, `APP_BUILDER_STATUS.md`, `MOBILE_APP_ROADMAP.md`; premium preview phone fix in the generator (`9078e87`); file ownership rules in `TEAM_STATUS.md`.
- **Decided (Irfan):** no Flutter/Swift/Kotlin; mobile order PWA, Android, iPhone (Phase 2); Week 2 security waits for a green pipeline and is built by Laptop Claude; customer code in the owner's GitHub is a Phase 2 gap.
- **Corrected:** projects are NOT wiped on refresh/deploy any more (`0c3a008`); several specs said "not built" for built things (fixed in the 2026-10-12 docs sweep).
- **Open:** Irfan's evening list (migrations, top-ups, approve 24 looks, flags, phone test, GitHub secret scanning, Postmark, 2FA, password manager); old public `gurost-<id>` repos to switch to private by hand.

## Session 2026-10-11 (Sunday): section library build begins
- **Done:** stages 0 to 8 (see `docs/TEAM_STATUS.md` for hashes): memory foundation, design tools, `lib/sections/` foundation, Navbar, Hero, Footer (A/B/C each, 6 palettes), preview page with Bug BB fixed, assembler behind `SECTION_LIBRARY=1`, quality gate with mutation tests. 828 tests, 826 pass (2 need express).
- **Decided:**
  - Irfan issued the Sunday "BEAST COMMAND": 11 stages, in order, each ending in a commit and a push, reported by hash. Irfan leads the phone tests; Web Claude builds; Laptop Claude tests and owns security S3.
  - Section library is built behind the flag `SECTION_LIBRARY` (off by default); the old generator keeps working. It is not wired into the builders yet (Website Builder V2 does that).
  - Irfan's phone verdict on the preview: build on it. Order from here: the other 17 sections, then Layer 2 polish (real fonts, Pixabay images, GSAP, Lenis on published sites only and off in the preview, micro-interactions; test on 5 business types), then Website Builder V2. Layer 3 (after launch): user feedback, A/B tests, more variants.
  - If Irfan is testing live, hold all pushes (every push redeploys Render and the in-memory `PROJECTS` map is wiped: Bug AA).
- **Changed from the plan:** hero scrim 0.6 to 0.65 (0.55 failed contrast for cream text); slot names follow the approved plan (`links[]`, `cta_label`, `cta1_*`, `image`, `link_groups`), not the command's `nav_1..5` / `cta_text` / `image_url`; hero carries both `data-g-reveal` and `data-gsap-*` hooks; dead links are gate warnings until V2 makes real pages (Bug U).
- **Bug found and fixed:** Bug BB (`2008b66`): the preview's sticky controls bar covered the section on phones.
- **Next:** the 17 remaining sections (Trust Bar, Features, About, Services, Gallery, Testimonials, Pricing, Team, Process, Stats, FAQ, Booking, Location, Blog, CTA, Newsletter, Product Highlight), in batches, each with the same tests and the gate.
- **Open on arrival:** S3a (WebSocket auth) had NOT landed on GitHub when this session started. When it does: pull, check how the socket is authenticated, and fix the App Builder reconnect (`ef392a6`) BEFORE S3a goes live (fresh token on every retry; an auth-error close stops retrying and sends the person to login).

## Earlier sessions (summary, 2026-10-08 to 2026-10-10)
- **Done and pushed:** free LLM fallback tier (`b92cd59`), per-bot avatars and names (`9f42f6c`, `0dbec59`, Bug P fixed), honest AI error messages plus the free-model rescue on 402 (`4de6a05`, Bug S fixed), Website Builder V2 spec with the domain plan (`84d8a4d`), section library slice 1 plan (`545fe6c`), locked industry palettes (`087604b`), InsForge plan (`ad3dd08`), Admin Area spec (`31da742`), tool stack review (`45e520f`), `.gitignore` for `.claude/settings.local.json` (`20bcadd`), bug entries U, X, Y, Z, AA, H-partial.
- **Decided:** build order is locked: 1 Security S3a-d, 2 Section library, 3 Website Builder V2 + Bug U, 4 App Builder + InsForge, 5 Admin Area, 6 Launch prep. InsForge comes after the Website Builder launch (laptop test first, behind `lib/backend-provider.js`). ScrollCraft is reference only. HelixDB skipped (AGPL). Logto not swapped into S3.
- **Live proof:** the free LLM fallback kept a library-website build alive when OpenRouter had no credit (Gemini free, about 2 minutes for the first design).
- **Known open:** Bugs H (partial), U, X, Y, Z, AA; see `CLAUDE.md`.

# Premium Pipeline: polish plan

Written 2026-10-12 (Web Claude). **Plan only: no code changes.** Companion to `docs/PREMIUM_PIPELINE_SPEC.md` (what was built)
and `docs/DESIGN_MEMORY_SPEC.md`. Plain English, for Irfan.

## 0. Where it stands

- Built and tested, behind `PREMIUM_PIPELINE=1`, **off until you approve the 24 looks** at `/premium-looks-preview.html` (4 looks
  for each of 6 industries: cafe, law, salon, trades, health, tech; each look = a section order + an A/B/C variant per section).
- The pipeline: pick a look from code, the model writes only words, code assembles the page, a browser measures it, the **score**
  (0 to 100, pass mark 70) decides, and if it fails the loop (at most 2 retries) swaps the look or adds/drops a section by the
  reasons. If nothing passes, the best attempt is shown with a note. It never shows nothing and never hides a failure.
- Design Memory (`DESIGN_MEMORY=1`) records each scored design, whether you picked it, then a day later whether you kept, edited
  or deleted it. After 50 builds in an industry the best-performing combination leads; 1 build in 5 still explores.

## 1. The honest finding that shapes this plan

I read the scores of all 24 looks as shown on the preview page (built with the sample copy, measured in a real browser):

| Result | Count |
|---|---|
| 100 / 100 | 15 |
| 97 / 100 | 9 (all the "Friendly" looks in cafe, law, salon, trades, health, tech, plus "Immersive" in law, health and tech) |
| Lowest / highest / mean | 97 / 100 / 98.9 |

**The score cannot tell the 24 looks apart, and 70 is nowhere near any of them.** That is not a bug in the looks: the score
was built to catch *cheap* pages (thin, cramped, no image, off-palette), and the curated looks are none of those. So:

1. The score is a **floor** (it stops bad pages), not a **ranking** (it does not say which good page is better).
2. "Tune the threshold from real data" has nothing to tune on until real builds exist. The 70 was set before any real build;
   the only evidence for or against it will be real builds, which score lower than sample pages because real copy is shorter
   or longer and real photos are sometimes missing.
3. Which look is *best* has to come from you (taste) and later from Design Memory (what customers keep). Not from the score.

I am telling you this so the polish work is aimed at what is true, and so nobody reads "all looks score 98" as "all looks are
8/10 on design". Your 8/10 target is a design target; the score cannot prove it.

## 2. Step 1: your approval (you, on your phone; nothing else moves until this)

Open `/premium-looks-preview.html`, one industry tab at a time, 4 looks each.
For each look write one of: **keep**, **fix** (with one sentence: "hero too tall", "boring gallery"), or **drop**.
Rule of thumb for "drop": would you be embarrassed to show it to a paying customer?
Needed result: at least **2 kept looks per industry** (the loop needs somewhere to swap to), so at least 12 kept in total.
Dropped looks are removed from `premium.json` (a one-line change each; the test that says "all 24 pass" becomes "all kept looks pass").
If you approve nothing yet, `PREMIUM_PIPELINE` stays off and the older generator keeps running, as today.

## 3. Step 2: fix the looks you marked "fix" (Web Claude, design work, no model calls)

Each fix is one of four kinds, in order of how often I expect them:
1. **Variant swap** (change the A/B/C of one section in that look): a one-line edit in `premium.json`.
2. **Order change** (move a section up or down): one line.
3. **Section CSS tweak** (spacing, size, alignment of one section variant): this changes the section for every look that uses it,
   so I check the other looks using it in the preview before committing.
4. **A new variant** (rare; a bigger job: 20 sections already have 3 each).
Every fix: before/after screenshots at 375px and 1440px; the premium test and the section tests must stay green; the preview page
is regenerated (`node scripts/build-premium-preview.js`) so you can re-check on the phone.
Limit: three files per commit, one look or one section per commit, pushed at once.

## 4. Step 3: switch on, then collect real data (needs the evening list: flags, OpenRouter credit)

1. Set **`SECTION_LIBRARY=1`** on Render FIRST (the premium pipeline, Design Memory and escalation only run inside the section-library path; with `SECTION_LIBRARY` off the old generator runs and the other three switches do nothing), then `PREMIUM_PIPELINE=1` and `DESIGN_MEMORY=1` (confirm `ESCALATION_HIERARCHY=1`). Also run the pending database migrations (`docs/migrations/`: `build_memory`, `build_logs`, `published_sites`, `user_sessions`, `admin_roles`, `admin_audit`); an unapplied table makes that feature silently do nothing. Top up OpenRouter first: a build with no
   credit falls to free models and tells us nothing about real quality.
2. Run **at least 3 real builds per industry** (18 builds) on the phone: different business names and descriptions, some with very
   little detail, some with a lot, with and without a logo. Screenshot each.
3. Every build already logs `[premium] <look> score=NN parts=... reasons=...` and writes a `build_memory` row. Nothing new to
   build for collection. (The Admin "Memory" tab shows industries and counts.)

## 5. Step 4: tune the score from the data (after about 18 real builds)

What I will do, in this order, with the numbers shown to you before any change:

| Question | How it is answered | Possible change (all in `premium.json`, no code) |
|---|---|---|
| Is 70 too low or too high? | Sort the real scores; compare with your own verdict (good / meh / bad) for the same pages. A good threshold has no page you call bad above it and few you call good below it. | raise or lower `threshold` |
| Does the loop help? | For builds where attempt 1 failed: did attempt 2 or 3 score higher and did you prefer it? | change `maxLoops` (now 2) |
| Which part fails most in real life? | Count the `reasons[]` codes (`no-hero-image`, `few-images`, `few-sections`, `many-sections`, `no-gallery`, `build-failed`). | reweight the 5 parts (mix 25, whitespace 20, typography 20, imagery 20, harmony 15) |
| Is the score blind to something you see? | Pages you dislike but that score 90+. Name what is wrong. | add a new check to the score (a code change, planned separately) |

Rules for tuning: change one number at a time, re-run the 18 builds' saved pages through the new score (the score is a pure function:
`score(page, {look, metrics})`, so old pages can be re-scored without new builds), never lower the threshold just to make a
page pass, and log the change with the reason in this file.

Likely findings, stated as guesses so nobody treats them as facts: real builds will fail more on **imagery** (the photo search
returns nothing for niche terms; the loop already swaps to a type-led look) and on **mix** (very thin descriptions give 2 sections).
That would mean improving copy handling and the image fallback rather than the threshold.

## 6. Step 5: which looks need refinement (decided by data, not by guess)

After the real builds and 2 to 4 weeks of Design Memory:
- A look that is **picked rarely** (the design chooser shows 4 directions; if one is never picked, it is a weak slot) is a
  candidate to rework or replace.
- A look that is picked but **deleted or edited heavily** within a day is "attractive but wrong"; read what was edited.
- A look that is **never reached by the loop** and always passes is fine; leave it.
- Industry gaps: only 6 industries have looks today; the other 186 industry matches fall to the nearest palette (the `tech` palette
  when nothing matches). Adding looks per new industry is a content job (4 looks each) and should follow customer demand,
  not be done up front.
Design Memory's 50-build rule means the *leading* look per industry only changes after real volume; until then the fixed looks decide.

## 7. Known limits (not hidden)

- The score is structure, not taste (spec 4.3). It will miss ugly-but-well-spaced pages.
- Impeccable (the design-lint tool) is not wired in as a hard test yet; it needs the laptop (spec 4.4 and the status line in the spec).
- The premium promise covers the **library path only**. The older generator is the fallback and is not premium-gated.
- Real fonts, Pixabay photos, GSAP motion and Lenis scrolling (Layer 2 polish) change how the pages look and feel. They are
  separate work in `CLAUDE.md` "Parked" and will move the numbers (heavier pages, different measurements), so the score must be
  re-checked after they land.
- Bug Y (hero image missing on a live library build) and Bug X ("DARK_MODE" text in a nav) are the kind of defect that costs more
  design points than any weight; they should be understood before the real-data round.

## 8. Order of work and who does what

| # | Step | Who | Blocked by |
|---|---|---|---|
| 1 | Approve / fix / drop the 24 looks | Irfan | his phone time |
| 2 | Fixes to the looks marked "fix" | Web Claude | step 1 |
| 3 | Flags on, 18 real builds | Irfan builds; Web Claude reads logs | OpenRouter credit, step 2 |
| 4 | Tune threshold and weights | Web Claude, shown to Irfan first | step 3 |
| 5 | Refine looks by data; Impeccable hard test | Web Claude; Laptop Claude for Impeccable | 2 to 4 weeks of data |

Nothing in this plan needs code until step 4, and even then most changes are numbers in `premium.json`.

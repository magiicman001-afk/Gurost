# Website Builder — Premium Pipeline (spec)

> BUILT 2026-10-12 (pieces 1-3 and the preview page), behind `PREMIUM_PIPELINE=1`, OFF by default until Irfan approves the 24 looks
> on his phone at `/premium-looks-preview.html` (regenerate with `node scripts/build-premium-preview.js`). The flag is named
> `PREMIUM_PIPELINE` (Irfan's name), not `PREMIUM_GATE`. Decisions 1-4 were answered by Irfan on 2026-10-12: best-with-note,
> threshold 70, Impeccable on laptop/CI only, library path only.
> Files: `lib/sections/premium.json` (24 looks), `premium.js`, `premium-score.js`, `premium-loop.js`, wiring in `bots/library-bot.js`,
> tests in `test/premium.test.js`.
> NOT done: the Impeccable hard test over the 24 looks (needs the CLI's output format, which can only be seen on the laptop);
> a gate that "scales over measured parts" is built, but on Render a browser is assumed present.
> Known limit: single mild flaws (e.g. one tight section) are tolerated by design; the bad-page tests combine the flaw with its
> usual companions. A look whose `needs` (hero photo, three gallery photos) are unmet fails regardless of its total.

Status: DRAFT for Irfan's approval, 2026-10-12. Written by Web Claude. Pieces 3 (live preview) and 4 (honest video) are
already built (commits 163e447, a25df9f, held locally until Irfan's test is over). Pieces 1 and 2 are the build this
document asks to approve.

Irfan's requirement, verbatim: "Every build must be premium quality by default. I shouldn't have to say 'make it
beautiful.' The bots should work together to guarantee it. The live preview should show real progress. Top-notch HD
quality every single time."

This is a pipeline change, not prompt engineering. The model never designs. It writes words; code picks the look,
assembles it, scores it and refuses to show anything that fails.

---------------------------------------------------------------------------------------------------

## 1. What is true today (checked in the code, 2026-10-12)

| Claim | Reality |
|---|---|
| "AI can pick basic combinations" | The model cannot pick a layout at all (library engine). A weak result comes from four other places: (a) the fixed four directions (`minimal`, `bold`, `corporate`, `playful`) are the same variant letters for every industry, so some industry + direction pairs look weaker than others; (b) the model returns thin copy, so sections are dropped and the page is short; (c) no photo is found, so the hero is blank; (d) an unmatched industry falls back to the `tech` palette. |
| "No premium gate" | The gate (`lib/sections/quality-gate.js`) checks correctness only: leftover slots, fake facts, broken images, alt text, 375px overflow, text contrast. Nothing asks "is this page good?". A short, image-less, cramped page passes. |
| "30s blank preview" | Fixed by Bug EE (163e447): styled shell in about a second, then the page grows section by section. |
| "Motion video lies" | Fixed by Bug FF (a25df9f): no clip means no change and an honest message; a clip is verified on the page. |
| The old generator (`variantBot`) | Still the fallback when the library fails or the flag is off. It is NOT premium-gated and this spec does not change it. Premium is a promise of the library path only. |
| "Bots work together" (Planner, Industry, Designer, Builder...) | These are labels in the builder's activity log over ONE code path (`generateLibraryVariants`), not separate programs. The pipeline below is stages of that function, plus a loop. Nothing here needs new services. |
| Impeccable | Runs only where `IMPECCABLE_CLI` points at an installed CLI (the laptop and CI). It is not on Render, so the live gate cannot depend on it. See 4.4. |

## 2. Definition of "premium"

A design is premium when ALL of these hold:

1. It is one of the curated premium looks for its industry (Piece 1).
2. It passes every hard gate: contrast, no fake content, no leftover slots, no broken or missing images, no horizontal
   overflow at 375px (existing checks, unchanged).
3. Its premium score is at least 70 out of 100 (Piece 2).

A design that fails 2 is never shown. A design that fails 3 is replaced (see 5) and only shown if the replacement passes.

## 3. Piece 1 — Premium defaults

### 3.1 Data

New file `lib/sections/premium.json`, one entry per industry palette (the six that exist: cafe, law, salon, trades,
health, tech). Each entry lists up to four premium looks, in the order they are offered:

```
"cafe": { "recipe": "local-business", "looks": [
   { "id": "warm-editorial", "label": "Warm / Editorial", "variants": { "navbar":"a", "hero":"c", ... },
     "order": ["navbar","hero","services","about","gallery","process","cta","footer"], "needs": ["hero-image"] },
   ... ] }
```

- `variants`: the A/B/C choice for every section, chosen per industry (today it is the same four sets for everybody).
- `order`: the exact section order. 1 hero + 3 to 6 content sections + footer. Never 10.
- `needs`: what the look cannot do without (`hero-image`, `gallery-3`). If the build cannot supply it, the look is
  skipped for that build, not shipped broken.
- The look ids replace today's hard-coded `DIRECTIONS`. `FIRST_IDS` = the first two looks, `MORE_IDS` = the next two
  ("Show 2 more"), exactly as now.

### 3.2 What stays

Basic variants (the A/B/C letters not used by a premium look) still exist and stay selectable when the owner asks for a
specific change ("use the simple navbar"). Premium is the default, never the only option. The owner's explicit request
always wins over the default.

### 3.3 Who approves the list

The looks are curated by us, then Irfan approves them on his phone from the existing `/sections-preview.html` page,
extended with a "Premium looks" view (24 looks = 6 industries x 4). Nothing is called premium until Irfan has seen it.
This is the one human gate in the pipeline, done once, not per build.

## 4. Piece 2 — Premium quality gate

### 4.1 Where it runs

In `buildDirection` (bots/library-bot.js), after assembly and photo fill, next to the existing gate:

```
assemble -> fill photos -> hard gates (existing) -> premium score (new) -> pass? show : swap look and repeat
```

New module `lib/sections/premium-score.js`: `score(page, probe) -> { total, parts, reasons[] }`. Pure and fast.
The browser probe (one Playwright page at 1280px and one at 375px, already launched by the gate today) supplies measured
numbers; if no browser exists (tests, some servers) the browser-measured parts are skipped and the score is scaled over
the parts that could be measured, with a note. A page is never passed on a score it could not measure at all.

### 4.2 The score (first version, 0-100)

| Part | Points | What is measured | Full marks | Zero marks |
|---|---|---|---|---|
| Section mix | 25 | content sections between hero and footer, kinds, neighbours | 3 to 6 content sections, at least one proof or action section (services, gallery, process, cta), no two sections of the same kind next to each other | 0-1 content sections, or 8 or more |
| Whitespace | 20 | desktop measure: vertical padding per section, section height, characters per line | every content section has at least 64px padding top and bottom, no content section shorter than 160px, lines of 45-75 characters | cramped sections (under 32px padding), full-width text lines over 100 characters |
| Typography | 20 | computed font sizes and families | h1 is at least 2.4x the body size, body at least 16px, no more than 2 font families, exactly one h1, headline of at most 70 characters | h1 within 1.5x of body size, 3+ families |
| Imagery | 20 | hero image, image slots filled, broken images | hero image present and loaded, at least 60% of image slots filled, no broken images; a look marked type-led (`needs: []`) gets full marks here without a hero image | hero without an image in a look that needs one, or any broken image |
| Colour harmony | 15 | colours actually used vs the palette tokens | every colour comes from the locked palette tokens, no inline off-palette colours, contrast at least AA everywhere | off-palette colours, any contrast failure |

Threshold 70. `reasons[]` is a list of plain sentences ("hero image missing", "only 2 content sections") used for the
loop-back feedback (5) and for the log.

### 4.3 Honest limits of the score

It is a heuristic. It measures things that make a page look cheap (thin, cramped, flat, image-less, off-palette). It
cannot measure taste. So:

- Calibration is part of the build: a fixture set of bad pages (cramped, no image, 12 sections, one font size,
  off-palette) MUST score under 70, and all 24 curated looks built with sample copy MUST score 70 or more. Both are tests.
- Weights and threshold live in `premium.json` (`"threshold": 70`, weights) so they can be tuned after Irfan's phone
  review without a code change.
- Every build logs `[premium] <look> score=NN parts=... reasons=...` so we tune on real data, not guesses.

### 4.4 Impeccable

Impeccable stays advisory on the live server because the CLI is not installed there. It is made a hard test instead:
the test suite runs Impeccable over all 24 premium looks wherever `IMPECCABLE_CLI` is set (laptop, CI) and fails on a
HIGH finding. A look cannot reach `premium.json` with an Impeccable HIGH. If Irfan wants it on Render too, that is a
separate decision (Render build must install the CLI; it adds build time).

## 5. The loop (Review -> Designer -> Builder)

For each direction slot (first-two, then the next-two on "Show 2 more"):

1. Designer takes the next look from the industry's premium list that is not yet used by another slot.
2. Builder assembles it, Research fills photos, Review scores it.
3. Fail on a hard gate: the existing repair ladder runs first (swap variants, then default content).
4. Fail on score under 70: LOOP BACK with the reasons. The feedback is applied by code, not by a model:
   - "hero image missing" -> next look in the list that is type-led, or retry the photo search with the industry's own
     fallback query;
   - "too few content sections" -> add the next available section the copy supports (the model's copy for it already exists);
   - "too many sections" -> drop the lowest-priority one;
   - otherwise -> next look.
   At most 2 loops per slot, then stop.
5. If a slot still fails after its loops: that slot shows the highest-scoring attempt with a visible one-line note
   ("Quality check 64/100: hero image missing"). The owner is never shown a failing design silently, and never shown
   nothing. This is the one place the spec bends "only show if pass": the alternative is an empty slot. Decision 1 below.
6. The owner sees two designs only once both slots are resolved (pass, or best-with-note). A design that passes first
   is pickable immediately, as today.

Cost: no extra model call. A loop is assembly plus a photo lookup plus one browser probe, a few seconds each; the model
is called once per build, as now.

Order of the stages in the activity log (what the owner reads, matching the requested pipeline):
Planner (understands) -> Industry (palette and premium list) -> Designer (picks the look) -> Builder (assembles) ->
Research (photos) -> Review (score and gate; "Review: 64/100, swapping the hero..." when it loops) -> shown -> Pulse
(watches) -> Launch.

## 6. Piece 3 — Live preview (built)

Done in 163e447. As built: the shell paints once the industry matches (about a second), the page then grows navbar +
hero, then each section, progress 8% -> 40% (words) -> 90% (sections) -> 100%. Images are blank until the finished
design because photos arrive after assembly. Still to add in this build: the Review stage shows in the log, and a loop
shows as "swapping" instead of a blank gap.

## 7. Piece 4 — Honest motion video (built, with a named gap)

Done in a25df9f: a video request finds a real Pixabay clip first; no clip means no change and an honest message (422);
a clip is verified on the page before anything is saved; the published-site CSP now allows https video.

Gap, stated plainly: the clip is placed by the edit model, not by a library hero variant. A proper library hero with a
video slot (poster, reduced-motion fallback, mobile data saver) is a later build; until then video works through Pulse
edits only and is not part of the premium score. Needs `PIXABAY_API_KEY` on Render, which Irfan confirmed for photos.

## 8. Build plan (each its own commit, pushed when Irfan says his test is over)

| # | Commit | Contents | Done when |
|---|---|---|---|
| 1 | Premium data | `premium.json` with 24 looks, loader, test that every look assembles | all 24 build and pass the hard gates |
| 2 | Score | `premium-score.js`, calibration fixtures | bad fixtures under 70, 24 looks 70+ |
| 3 | Gate loop | wire into `buildDirection`, loop-back rules, `[premium]` logging, `PREMIUM_GATE=1` flag (off by default until Irfan approves, same pattern as `SECTION_LIBRARY`) | tests for pass, swap, best-with-note |
| 4 | Preview + proof | Premium view in sections-preview, side-by-side screenshots | Irfan's phone verdict |

Files: commits 1-3 touch `lib/sections/` (3 new files), `bots/library-bot.js`, and tests. Approved scope: multi-file.

### Screenshot proof, with its limits

The side-by-side is a premium look against a deliberately basic combination (the old default set, no photo, 3 sections),
built from the same copy. It will be rendered with fallback fonts and placeholder photos, because this build machine
cannot reach Google Fonts or Pixabay. It proves the layout, spacing and hierarchy difference, not final HD photography.
Real photos and fonts show on Render. I will not present it as a render of the live site.

## 9. Decisions needed from Irfan

1. When a slot cannot reach 70 after two loops: show the best attempt with a visible note (recommended), or show an
   error and ask the owner to retry? Recommended: best-with-note, because an empty slot is worse than an honest 64.
2. Threshold 70 for the first release, tuned after his phone review. Agree?
3. Impeccable as a hard test on the laptop/CI only (recommended), or also installed on Render?
4. Premium applies to the library path only; the old generator fallback stays ungated. Agree, given the fallback should
   rarely run once OpenRouter credit is topped up?

## 10. Risks

- The score can pass an ugly page or fail a good one. Mitigation: calibration tests, tunable weights, per-build logging,
  Irfan's phone review is the final judge.
- Browser probing on Render adds seconds and memory per build. Mitigation: one shared browser (already the case), 1280px
  and 375px passes only, and the 2 GB OOM cause found today (311 processes at once) is already fixed in b56437a.
- Six industries only. A prompt that matches none gets the `tech` look set. Widening to the 192-industry list is a
  separate piece of work; the unmatched fallback is stated, not hidden.

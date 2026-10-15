# Design recipe: why some sites look "premium", and where our templates stand

Written 2026-10-15 by Web Claude. Docs only: no code was changed.

## 1. Where this comes from, and its limits

Irfan sent four screenshots of sites he admires (a legal-AI site, a document-signing site, a bot-builder site and a UI-kit site).
I looked at the **screenshots only**. I did not see their code, and nothing here copies their logos, wording, layouts or artwork.
What follows is a list of **general principles** (spacing, colour discipline, hierarchy), which nobody owns. Our designs stay our own.
Where a principle says "proof", it means **real** proof only. We never invent numbers, logos, ratings or reviews.

Two things in the screenshots were presentation, not the site: tilted browser frames and 3D props. Part of the consistency
of the UI-kit site comes from having one design system behind it. That is the real lesson: **one system, applied everywhere**.

## 2. The nine principles

1. **One accent colour on a tinted neutral.** The page background is never pure white or pure grey: it leans a few percent toward the accent. Only one hue is saturated.
2. **A big, tightly set headline with a two-tone phrase.** One part of the headline in the accent (or a softer tone). Tight letter-spacing and line-height.
3. **An eyebrow label above the headline.** A small label (place, category, "new") that tells the visitor what this is before they read the headline.
4. **One main action.** A single obvious thing to do. The strongest version is an input box as the call to action, because typing is already the first step.
5. **Suggestion chips.** A few small tappable examples under the main action ("try: ..."), which remove the blank-page problem.
6. **A proof row under the action.** A thin line of *real* evidence: a real count, real years, a real rating with its source, real client names with permission.
7. **The product peeking at the bottom.** A screenshot or visual of the real thing, cropped by the fold, so the visitor sees there is more below.
8. **Whitespace, a soft glow, thin borders, rounded corners, soft shadows.** Space does most of the work. A faint radial glow behind the hero. Cards are one-pixel borders, 12 to 20 px radius, shadows that are wide and faint.
9. **A floating, light nav with one dark call-to-action.** A pill-shaped bar with a little margin around it, three or four links and one filled button.

## 3. Audit of our 159 templates

**Method.** The 159 templates (15 industries) were filled with their own demo content in a scratch folder (tracked files untouched), then
opened in headless Chromium at 1440 px and at 375 px wide, and measured with a script, rule by rule. I also looked at six of the renders
(bakery, tech, legal, clinic, restaurant on desktop; bakery on phone). Counts are of the 159 home pages.

**Caveats.** The measurements are heuristics (they read class names and computed styles), so treat each number as "about", not exact.
Rules 6 and 7 are partly a matter of eye. The 3D scenes were drawn by a software renderer, so their look in the screenshots is approximate.
Nothing here has been seen on a real phone.

| # | Principle | Result (of 159) | Verdict |
|---|---|---|---|
| 1 | One accent hue | 129 use a single saturated hue, 30 use two, none use three or more. 48 have a tinted light background, 42 a dark one, the rest are plain or mid-tone | **Strong.** Colour discipline is already a strength |
| 2 | Big tight headline, two-tone | Headline 56 px or larger on desktop in all 159. Tight letter-spacing in 94. Two-tone phrase in 139 | **Strong.** Tight spacing is the gap (65 not tight) |
| 3 | Eyebrow label | 128 have one. The `daylight` and `motion` generic styles (30 templates) are the ones without | **Good**, two styles to fix |
| 4 | One main action as an input | **0** have an input or form in the hero. Every one has a button pair (main plus secondary) | **Gap.** Fine for a shop, but we have no "type here to start" pattern at all |
| 5 | Suggestion chips | 23 have chip-like elements in the hero | **Gap** (mostly absent) |
| 6 | Proof row under the action | No template has proof directly under the hero action. About 41 have a stats band further down the page | **Gap**, and the main risk is honesty: see section 4 |
| 7 | Product peeking at the fold | 22 on desktop; 66 on a phone (the hero art drops below the text there) | **Partial.** Strongest in `daylight`, absent in `atelier`, `gallery`, `studio` on desktop |
| 8 | Whitespace, glow, thin borders, soft shadow | Thin one-pixel borders in 158. Soft shadows in 44. A radial glow in only 11 | **Partial.** Borders yes; glow and soft shadows are rare |
| 9 | Floating light nav with one dark CTA | **0** floating pill navs. 64 have a dark filled call-to-action on desktop. On a phone the nav collapses to a menu icon | **Gap.** Our navs are full-width bars |

**Real defect found (not a design-principle point).** At 375 px wide, `tutor/chalk` scrolls sideways: a row of buttons ends at 399 px.
Every other template fits. This is worth a small fix.

**What the numbers say in one line.** We are already good at colour discipline, big headlines and eyebrows. We are weakest at the
"interactive" half of the recipe (an input as the action, chips, a proof row) and at the "air" half (glow, soft shadows, a floating nav).

## 4. The recipe we will use (original to Gurost)

- **Colour.** One accent per site, chosen from the industry palette. Background tinted toward it. Never a second saturated hue.
- **Headline.** Tight tracking (about -0.02 em) and line-height near 1.05. The two-tone phrase is the *benefit*, not the business name.
- **Eyebrow.** Always present, one short line: town plus what we do.
- **Action.** One filled button; for businesses where the first step is a question (quote, valuation, "what do I need?"), an input box with
  one question is the action instead. Secondary action is a quiet text link, not a second button.
- **Chips.** Three to four real example questions or services the visitor can tap. They must lead somewhere that works.
- **Proof row.** **Only from facts the customer gives us:** years trading, a real review count and its source, a real accreditation.
  If the customer has none, **show nothing**. The row is hidden, never filled with invented numbers. This protects us and the customer.
- **Visual peek.** The first real photo, or a real 3D scene, cropped by the fold (about 15 to 25 percent of it hidden).
- **Air.** Hero padding at least 96 px top and bottom on desktop, a faint radial glow in the accent at about 8 to 12 percent opacity,
  cards with a 1 px border at 14 to 18 px radius, shadows wide and faint (blur 24 px or more, opacity under 10 percent).
- **Nav.** A floating pill with a 12 to 16 px margin from the edge, three or four links, one dark filled button. Phone: the same pill, logo plus a menu button.
- **One system.** Spacing steps (4, 8, 12, 16, 24, 32, 48, 80, 128 px), one radius scale, one shadow scale, shared by all 15 industries.
  This is what makes a family of sites look like one product.

## 5. Suggested order of work (nothing started; each needs Irfan's "go")

1. Fix `tutor/chalk` at 375 px (one file, small).
2. Tighten headline tracking in the 65 templates that are loose (a shared style change; changes the generated CSS in many folders, so it needs a plan under the 3-file rule).
3. Add eyebrows to `daylight` and `motion`.
4. Floating pill nav as a new shared nav option, tried on two industries first.
5. Soft glow and soft shadow tokens in the shared base style.
6. Hero input and chips pattern for the industries where it fits (clinic, legal, realestate, tutor), with the honest proof row.
7. Re-run this audit (the script is simple to repeat) and write the new counts here.

For the App Builder the same recipe applies, with "app kind" in place of "industry". That is a separate document and waits for the priority rule (Website Builder first).

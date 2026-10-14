# Marble build animation: spec

Written 2026-10-13 (Web Claude) for Irfan. Built the same day, rebuilt with real pictures the same day (version 2): `public/shared/marble-loader.js`, `public/marbles/*.png`, tests in `test/marble-loader.test.js`.
Marbles are the Gurost brand: glossy, tactile, playful, premium.

## 0. Honest notes first
- **Version 2 (2026-10-13): real pictures replaced the drawn marbles.** Irfan said the canvas-drawn marbles looked flat and fake. The eight
  marbles are now real glass-marble pictures made in Stitch (`public/marbles/<bot>.png`). Code only MOVES them. The old painting code is deleted.
- **The uploaded pictures were not truly transparent.** All eight arrived as RGB files with the grey-and-white checkerboard baked into the
  pixels (a screenshot of a transparency preview), so there was no alpha channel. The marbles are near-perfect circles, so each was cut out by
  finding its circle (edge fit, ignoring the checkerboard's straight edges), cropping to it, cutting a soft 2 px circular edge just inside the rim, and
  saving a 288 x 288 PNG with a real alpha channel (130 to 150 KB each). Checked on cream and on near-black: no box, no checker fringe. Cost of this
  method: the clear glass at the rim is opaque pale grey, not see-through (the checkerboard that showed through is baked into the colour). On the
  cream panel this looks like glass anyway. If Irfan can export the Stitch marbles with a real transparent background, drop the files over `public/marbles/` (same names);
  nothing else changes. The checker test (RGBA colour type) will still pass.
- **"Every 10 seconds, a preview of the build"** can only show what exists. While the page is still empty, the marbles keep moving. Once the
  first section of the lead design has painted (the live preview frames), every 10 seconds the marbles fade out for 3 seconds to show the real page, then return.
- Scope: Website Builder now. App Builder waits (priority rule in `CLAUDE.md`); the module is generic, so it needs one call later.

## 1. The marble
A real glass-marble picture, 48 to 88 px across (size scales with the panel: about 56 px on a 375 px phone), round, with a soft drop shadow
(CSS box-shadow; no filters, which iOS handles badly). Files: planner, designer, industry, builder, pulse, research, review, launch (`.png`), named after the bot.
Colours by picture: Planner deep blue, Designer coral, Industry teal, Builder orange, Pulse gold, Research purple, Review red, Launch green.

## 2. The motion
Eight marbles drift in straight lines around the preview area, bounce off the four walls, and **push apart when they meet** (equal masses swap
speed along the line between them; a few correction passes so a pile of three ends up apart), each with a slow spin (0.15 to 0.45 radians a second).
Speed is kept in a moderate band (50 to 100 px a second); starting directions are 20 to 70 degrees off the walls so each marble roams the whole box.
Loops until the build ends. Each marble is one `<img>` moved with `transform: translate3d(...) rotate(...)`. Measured in desktop Chromium at 375 px:
60 fps; phone speed to be confirmed on Irfan's phone.
- **Bug LL (phone test 2026-10-13): the marbles clustered at the top-middle and overlapped.** I had removed marble-to-marble physics on Irfan's earlier
  "keep it simple" note, which let them pile; he then asked for them spread out and pushed apart, so collisions are back (this supersedes the earlier note).
  Cause of the bunching: marbles are placed when the panel is measured, and the preview panel can still be short then; they stayed in that old corner when it
  grew. Now a resize moves each marble to the same RELATIVE spot (`resizeWorld`). Tests: no overlap at the start or after any step at four sizes, they reach
  most of the box, and a short-then-tall box stays spread.

## 3. The eight bots
Same names as the build log (`shared/bot-conversation.js`; a test checks them). Marbles are not clickable and do not show which bot is working
(idea for later: the working bot's marble glows).

## 4. The loop
Marbles move, with "Building… 45%" and a thin orange-to-coral bar under them (a moving bar when no percentage is known). Every 10 s, if the page has
started to paint, a 3-second look at the real build, then back to marbles. When the build ends, the marbles fade out (0.5 s) and the finished
site shows. The overlay does not catch taps, so scrolling and tapping the page underneath still work.

## 5. Safety rules
- **Reduced motion** (phone setting "reduce motion"): no movement; the eight marbles sit still in a grid, progress still updates, fades are instant.
- **Never blank, never glitch:** if any marble picture fails to load, or anything throws, a plain spinner with the same progress text shows.
- Marbles hide while the design picker is open (the cards are the thing to look at) and show again after.
- Text is set with `textContent` only; no HTML injection; no external requests (the pictures come from our own `/marbles/` folder).

## 6. Where it plugs in
Website Builder live preview (`public/builder.html`): starts with `setPreviewStatus(true)`, progress from `setBuildProgress`, stops with
`setPreviewStatus(false)`. App Builder and other build screens: later, same three calls.

## 7. Tests
Unit: the eight PNGs exist, are real RGBA PNGs, square, 20 to 500 KB; movement for 60 simulated seconds at four panel sizes (stays inside, keeps moving,
moderate speed, no NaN); wall bounces; push-apart collisions, spread, resize; sizes; reduced-motion layout; source rules (no HTML injection, no network calls, fallback
and reduced-motion present). Browser (Playwright, 375 px, real files served over http, not an automated test in the repo): all eight pictures load, all move,
never leave the box, 60 fps, no sideways scroll, no console errors, snippet fade at 10 s for 3 s, spinner fallback when a picture is blocked, still grid under reduced motion.
Not covered by an automated test: the look (judge on the phone) and the live builder page (needs a signed-in build).

## 8. Later ideas (not built)
The "GUROST" wordmark with a marble as the O (as in the reference); the working bot's marble glows; marbles on the empty-state card, the dashboard
and the launch screen.

## Version 2: the staircase (2026-10-14, Web Claude, approved by Irfan from screenshots)

The Website Builder live preview now uses `public/shared/marble-steps.js` (`MarbleSteps.create`, same `start`/`stop`/`setProgress`
options as `marble-loader.js`, which stays in the repo, unused). Tests: `test/marble-steps.test.js`.

- The eight bot marbles (14 to 18 px) roll down rounded pastel steps, drop with gravity and a small squash, turn at the landing and
  roll into a glass jar. Each marble has its own speed, a contact shadow, and a glint that stays put while the marble turns.
- Night to day: the scene starts as a dark night (moon, twinkling stars, fireflies, lit lanterns, violet clouds) and a day layer
  (sun, white clouds, warm dunes) fades in as `setProgress(percent)` rises. With no percentage it dawns slowly over about two minutes.
- Original design (dusk palette, striped pastel steps, jar finish): chosen on purpose to share no characters, colours or layout with
  any existing game. This is not a legal opinion; ask a lawyer if certainty is needed.
- Same safety rules as v1: SVG/CSS only, no network, no innerHTML, reduced motion shows the still scene, any error shows the plain
  spinner. Verified in a browser at 375 px and 1100 px with the network stubbed; NOT yet seen on Irfan's real phone.

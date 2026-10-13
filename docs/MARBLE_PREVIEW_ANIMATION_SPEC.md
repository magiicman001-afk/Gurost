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

## 2. The motion (Irfan: "just move around the screen, left, right, up or down. That's it.")
Eight marbles drift in straight lines around the preview area and bounce off the four walls, each with a slow spin (0.15 to 0.45 radians a second).
Speed is steady and moderate (55 to 95 px a second), directions 20 to 70 degrees off the walls so each marble roams the whole box.
**No marble-to-marble physics:** they pass over each other. Loops until the build ends. Each marble is one `<img>` moved with
`transform: translate3d(...) rotate(...)` (graphics-chip friendly). Measured in a desktop Chromium at 375 px: 60 fps, 99% of frames 16.8 ms or better; phone
speed to be confirmed on Irfan's phone.

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
moderate speed, no NaN); wall bounces; no marble-to-marble physics; sizes; reduced-motion layout; source rules (no HTML injection, no network calls, fallback
and reduced-motion present). Browser (Playwright, 375 px, real files served over http, not an automated test in the repo): all eight pictures load, all move,
never leave the box, 60 fps, no sideways scroll, no console errors, snippet fade at 10 s for 3 s, spinner fallback when a picture is blocked, still grid under reduced motion.
Not covered by an automated test: the look (judge on the phone) and the live builder page (needs a signed-in build).

## 8. Later ideas (not built)
The "GUROST" wordmark with a marble as the O (as in the reference); the working bot's marble glows; marbles on the empty-state card, the dashboard
and the launch screen.

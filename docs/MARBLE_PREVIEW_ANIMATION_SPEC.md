# Marble build animation: spec

Written 2026-10-13 (Web Claude) for Irfan. Built the same day: `public/shared/marble-loader.js`, tests in `test/marble-loader.test.js`.
Marbles are the Gurost brand: glossy, tactile, playful, premium.

## 0. Honest notes first
- **I could not see Irfan's reference image** (only the written description reached me). The marble was built from the description: glossy,
  swirls of orange, coral and teal, soft top-left highlight, soft shadow, cream background. **Irfan: compare the phone result with your image
  and tell me what to change** (swirl tightness, gloss, size).
- **Drawing method differs from the recommendation (a decision, not an accident):** the first idea was SVG with CSS. SVG cannot do soft swirls
  without blur filters, and blur filters on moving shapes are slow on iPhones. So each marble is painted **once** into a small picture on a
  canvas (soft colour blobs along a spiral), and each frame only moves and turns that picture. Still no libraries, no files, no network.
- **"Every 10 seconds, a preview of the build"** can only show what exists. While the page is still empty, the marbles keep rolling. Once the
  first section of the lead design has painted (the live preview frames), every 10 seconds the marbles fade out for 3 seconds to show the real page, then return.
- Scope: Website Builder now. App Builder waits (priority rule in `CLAUDE.md`); the module is generic, so it needs one call later.

## 1. The marble
Glossy glass ball, 40 to 80 px (size scales with the panel: about 65 px on a 375 px phone). Body colour is the bot's colour with swirls of
orange (#F97316), coral (#FB7185) and teal (#0D9488) (the accent that equals the body colour is skipped), plus pale glassy bands. A fixed soft
highlight top-left and a small bright dot, a faint bounce light bottom-right, a thin rim, and a soft shadow under each marble. The light does
not rotate; only the swirl rolls, which is what makes it look like glass.

## 2. The motion
Eight marbles roll around the preview area, bounce off the walls and off each other (equal masses swap speed along the line of contact), and turn
as they go (turn = distance travelled / radius, i.e. rolling without slipping). A tiny random wander stops the paths repeating. Speeds are kept in
a lively band (55 to 120 px a second), so they never stall or race. Loops until the build ends. 60 frames a second (measured about 60 in a
desktop Chromium; phone speed to be confirmed on Irfan's phone). Pauses automatically when the tab is hidden.

## 3. The eight bots (same names as the build log, deeper tones for the cream background)
Planner #2563EB (deep blue), Designer #FB7185 (coral), Industry #0D9488 (teal), Builder #F97316 (orange), Pulse #F59E0B (gold),
Research #8B5CF6 (purple), Review #EF4444 (red), Launch #22C55E (green). A test checks the names against `shared/bot-conversation.js`.
Marbles are not clickable and do not show which bot is working (idea for later: the working bot's marble glows).

## 4. The loop
Marbles roll, with "Building… 45%" and a thin orange-to-coral bar under them (a moving bar when no percentage is known). Every 10 s, if the page has
started to paint, a 3-second look at the real build, then back to marbles. When the build ends, the marbles fade out (0.5 s) and the finished
site shows. The overlay does not catch taps, so scrolling and tapping the page underneath still work.

## 5. Safety rules
- **Reduced motion** (phone setting "reduce motion"): no rolling; the eight marbles sit still in a grid, progress still updates, fades are instant.
- **Never blank, never glitch:** if canvas is missing or anything throws, a plain spinner with the same progress text shows.
- Marbles hide while the design picker is open (the cards are the thing to look at) and show again after.
- Text is set with `textContent` only; no HTML injection; no external requests.

## 6. Where it plugs in
Website Builder live preview (`public/builder.html`): starts with `setPreviewStatus(true)`, progress from `setBuildProgress`, stops with
`setPreviewStatus(false)`. App Builder and other build screens: later, same three calls.

## 7. Tests
Physics (60 simulated seconds at four panel sizes: stays inside, keeps moving, speeds in band, no NaN), head-on collision, sizes, reduced-motion
layout, and source rules (no HTML injection, no network, fallback and reduced-motion present). Screenshots at 375 px, desktop and reduced motion were taken in a real browser.
Not covered by an automated test: the look (judge on the phone) and the live builder page (needs a signed-in build).

## 8. Later ideas (not built)
The "GUROST" wordmark with a marble as the O (as in the reference); the working bot's marble glows; marbles on the empty-state card, the dashboard
and the launch screen; a sound-off tactile "clack" on collisions (no).

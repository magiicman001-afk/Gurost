# Premium template library (started 2026-10-14)

Irfan's idea: ready-made premium sites per industry that the builder fills with the customer's details, instead of asking a model to invent a design.
Goal: at least 10 templates per industry across 15 industries, each one better than the last, plus a shared library of pictures, video, motion and maps that the swarm bots pick from.

## Status
- BUILT: 6 bakery templates in `templates/bakery/<style>/` (tokenised output, committed).
  - `minimal`, `bold`, `editorial`: 6 pages each (Home, Menu, About, Contact, Privacy, Terms).
  - `atelier`, `gallery`, `motion` ("premium plus"): white page, 2 pages (Home, Menu), a looping video, picture frames, Privacy and Terms as pop-ups.
- NOT BUILT: the other 14 industries, the template picker, the hook into the live builder, the media catalog.

## How it is made
- Generators: `templates/_src/*.js` (one per style, shared `common.js`, `plus-base.js`, `illustrations.js`, `fill.js`).
- Build: `node scripts/build-bakery-templates.js [--demo <dir>]` writes `templates/bakery/<style>/`. Fonts come from `FONT_DIR` (OFL only).
- Media: `node scripts/build-bakery-media.js [images|videos|all]` renders `templates/_media/` (soft 3D pictures, looping videos as mp4 + webm + poster).
  Needs Playwright Chromium and ffmpeg. The committed copies in `templates/bakery/*/assets` are what ship.
- Test: `test/bakery-templates.test.js` (pages, links, no outside loads, fill leaves no gaps, committed output matches the generators).

## Filling
`fillTemplate(files, values)` in `templates/_src/fill.js` replaces `{{tokens}}` (business name, tagline, city, phone, email, address, hours, social links, map link, form address, year founded, years baking, owner name). It escapes HTML, and `{{json:name}}` for the structured data. It returns the names that had no value, so the caller can fall back to the AI builder.
Forms post JSON to `/api/site-forms/:projectId` with kind `order` or `contact`.

## Honest limits
- The pictures are soft 3D-style art drawn by script, not photographs. Every picture is tagged `data-gurost-image` / `data-gurost-image-role` so `bots/premium-images.js` can swap in a real or AI photo.
- The videos are original loops made by script, not stock footage.
- GSAP is not used; motion is plain CSS and a small script (`SITE_JS`, `PLUS_JS`).
- Instrument Serif's licence file was not available in the font folder; add `OFL-InstrumentSerif.txt` to the Minimal template before launch.
- Legal text in the templates is a starting point and needs the owner's own policy.

## Plan
1. Extract about 10 layout families from the bakery work.
2. Industry pack format: palette, fonts, wording, content structure, art, video, map block.
3. Prove it on a second, very different industry (animal sanctuary or a video-style site).
4. Picker, then the hook into the live builder; then scale to all 15 industries.
5. Media catalog the swarm bots search (images, loops, icons, map blocks), real photos from Pixabay / Openverse / Unsplash first, the drawn art as fallback.

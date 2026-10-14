# Premium template library (started 2026-10-14)

Irfan's idea: ready-made premium sites per industry that the builder fills with the customer's details, instead of asking a model to invent a design.
Goal: at least 10 templates per industry across 15 industries, each one better than the last, plus a shared library of pictures, video, motion and maps that the swarm bots pick from.

## Status
- BUILT: 9 templates, committed as tokenised output in `templates/<industry>/<style>/`.
  - Bakery (6): see below. Animal sanctuary (3): `atelier`, `gallery`, `motion` (approved by Irfan 2026-10-14).
  - `minimal`, `bold`, `editorial`: 6 pages each (Home, Menu, About, Contact, Privacy, Terms).
  - `atelier`, `gallery`, `motion` ("premium plus"): white page, 2 pages (Home, Menu), a looping video, picture frames, Privacy and Terms as pop-ups.
- NOT BUILT: the other 13 industries, the remaining bakery and sanctuary templates (target 10 each), the template picker, the hook into the live builder, the media catalog.

## How it is made
- Layouts (`templates/_src/atelier.js`, `gallery.js`, `motion.js`, plus `minimal`, `bold`, `editorial` for bakery only) hold NO industry wording. An industry PACK (`templates/_src/packs/<id>.js`) supplies words, items, tags, demo values, SEO, form kind, art palette/motifs, video settings and css overrides. A new industry = a new pack (+ motifs in `illustrations-*.js`), not new layouts.
- Build: `node scripts/build-templates.js [--demo <dir>] [industry ...]` writes `templates/<industry>/<style>/`. Fonts come from `FONT_DIR` (OFL only).
- Media: `node scripts/build-media.js <industry> [images|videos|all]` renders `templates/_media/<industry>/` (soft 3D pictures, looping videos as mp4 + webm + poster).
  Needs Playwright Chromium and ffmpeg. The committed copies in `templates/<industry>/*/assets` are what ship.
- Test: `test/templates.test.js` loops every pack and style (pages, links, no outside loads, fill leaves only `form_endpoint` open, committed output matches the generators).

## Filling
`fillTemplate(files, values)` in `templates/_src/fill.js` replaces `{{tokens}}` (business name, tagline, city, phone, email, address, hours, social links, map link, form address, year founded, years baking, owner name; sanctuary adds `years_open`, `animals_rehomed`, `animals_in_care`, `donate_url`). It escapes HTML, and `{{json:name}}` for the structured data. It returns the names that had no value, so the caller can fall back to the AI builder.
Forms post JSON to `/api/site-forms/:projectId` with kind `order`, `contact` or `booking` (bakery uses `order`, sanctuary `contact`).

## Honest limits
- The pictures are soft 3D-style art drawn by script, not photographs. Every picture is tagged `data-gurost-image` / `data-gurost-image-role` so `bots/premium-images.js` can swap in a real or AI photo.
- The videos are original loops made by script, not stock footage.
- GSAP is not used; motion is plain CSS and a small script (`SITE_JS`, `PLUS_JS`).
- Instrument Serif's licence file was not available in the font folder; add `OFL-InstrumentSerif.txt` to the Minimal template before launch.
- Sanctuary: animal names, numbers and the 6 drawn animals (they repeat inside a category) are examples; real photos come from the live image pipeline. A donation link is the customer's own (`donate_url`).
- Legal text in the templates is a starting point and needs the owner's own policy.

## Plan
1. Extract about 10 layout families from the bakery work.
2. Industry pack format: palette, fonts, wording, content structure, art, video, map block.
3. DONE for animal sanctuary (second industry, same layouts). Next: a video-style site.
4. Picker, then the hook into the live builder; then scale to all 15 industries.
5. Media catalog the swarm bots search (images, loops, icons, map blocks), real photos from Pixabay / Openverse / Unsplash first, the drawn art as fallback.

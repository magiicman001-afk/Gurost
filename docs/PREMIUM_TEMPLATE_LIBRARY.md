# Premium template library

Irfan's idea: ready-made premium sites per industry that the builder fills with the customer's details, instead of asking a model to invent a design.
Rewritten 2026-10-14 after the last industry (tech) was pushed. Earlier versions of this file described 9 templates; ignore them.

## Status (2026-10-14)
- BUILT AND PUSHED: **15 industries, 159 templates**, committed as tokenised output in `templates/<industry>/<style>/`. CI was green after every push.
- NOT BUILT: the template picker, the hook into the live builder, real photographs, the shared media catalog. Until the picker exists, **no customer can use these templates**: they are a library on disk.
- The live builder today still uses the older four single-file templates in `bots/templates-data.js` (served by `/api/templates` and `public/templates.html`).

| Industry (pack id) | Templates | The 5 generic styles | The custom layouts |
|---|---|---|---|
| Bakery (`bakery`) | 13 | atelier, gallery, motion, studio, daylight | minimal, bold, editorial, linen, split, journal, market, hearth |
| Animal sanctuary (`sanctuary`) | 16 | atelier, gallery, motion, studio, daylight | linen, split, journal, market, hearth, kindred, stories, commons, gazette, wildkind, letter |
| Beauty and tanning (`beauty`) | 10 | same five | aura, boudoir, swatch, booker, reel |
| Gym and fitness (`fitness`) | 10 | same five | pulse, timetable, tiers, matcher, interval |
| Restaurant and bistro (`restaurant`) | 10 | same five | cellar, smokehouse, trattoria, cocktail, tasting |
| Trades and home services (`trades`) | 10 | same five | sparks, pipeworks, warmth, quoter, vanline |
| Estate agent and lettings (`realestate`) | 10 | same five | listings, mortgage, skyline, valuer, tour |
| Dental and health clinic (`clinic`) | 10 | same five | smile, checkup, plans, kids, urgent |
| Law firm (`legal`) | 10 | same five | counsel, fees, verdict, plain, bring |
| Garage and MOT (`garage`) | 10 | same five | motcheck, tyrefit, servicing, dash, forecourt |
| Hotel and travel (`hotel`) | 10 | same five | rooms, voyage, packing, lantern, seasons |
| Tutoring and education (`tutor`) | 10 | same five | lessons, chalk, quickfire, progress, countdown |
| Photography and weddings (`photo`) | 10 | same five | packages, shotlist, daycast, grade, prints |
| Fashion and online shop (`fashion`) | 10 | same five | sizer, outfit, bundle, drop, wears |
| Tech agency and SaaS (`tech`) | 10 | same five | estimate, care, stack, status, metrics |

Bakery and sanctuary came first and carry extra layouts (13 and 16). Every other industry has exactly 10: five generic styles plus five with their own layout, fonts and one working tool each.

Examples of the working tools: tutor (lesson picker, chalkboard timetable, quickfire quiz, progress tracker, exam countdown); photo (package builder, shot list, golden-hour timeline, before/after grade slider, print-size preview); fashion (size finder, outfit builder, bundle basket with free-delivery bar, Friday drop countdown, cost-per-wear); tech (project estimator, pricing board, stack picker, status page with uptime calculator, metrics dashboard). The generator file `templates/_src/<layout>.js` is the source of truth for the rest.

## How it is made
- **Generic layouts** (`templates/_src/atelier.js`, `gallery.js`, `motion.js`, `studio.js`, `daylight.js`) hold NO industry wording. An industry **pack** (`templates/_src/packs/<id>.js`, auto-discovered) supplies the words, four categories of four items (with art, hint and photo brief), reviews, FAQ, steps, colours, SEO text, demo values and the media plan.
- **Custom layouts** are one file each in `templates/_src/` (for example `estimate.js`), built with `make(spec)` from `rest-kit.js`. File names must be unique across all industries: a duplicate silently overwrites another industry's layout (this happened once with `plans.js`; the tech one is now `care.js`).
- **Art**: original soft-3D vector motifs in `templates/_src/illustrations-<industry>.js` (six per industry). Nothing is borrowed.
- **3D heroes**: `templates/_src/gl3d.js` is a WebGL2 ray-marcher with 36 models (dumbbell, kettlebell, wine glass, cloche, coupe, pizza, stopwatch, bulb, house, wrench, key, tower, tooth, cross, scales, gavel, wheel, plug, car, bell, globe, suitcase, lantern, grad cap, pencil, books, trophy, camera, ring, frame, bag, shades, hanger, laptop, rocket, chip). The engine is embedded in every `site.js`, so **changing it means rebuilding every industry**.
- **Fonts**: only SIL OFL fonts, each with its licence text, from `FONT_DIR` (default `/mnt/skills/examples/canvas-design/canvas-fonts`).

### Commands
- Build one or all: `node scripts/build-templates.js [--demo <dir>] [industry ...]` writes `templates/<industry>/<style>/` (index.html, menu or equivalent second page, `assets/style.css`, `site.js`, fonts, img, video). With no industry it rebuilds all. `--demo <dir>` also writes a copy filled with sample details, for screenshots.
- Media first: `node scripts/build-media.js <industry> [images|videos|all]` renders `templates/_media/<industry>/` (needs Playwright Chromium and ffmpeg; about 3 minutes per style for videos). `build-templates` fails with ENOENT if the media is missing.
- Test: `node --test test/templates.test.js test/template-photos.test.js` (16 pass). The template test loops every pack and style: pages exist, links work, nothing loads from outside, filling leaves only `form_endpoint` open, and the committed output must match the generators. A new style must be added to `PAGES`, `PLUS` and `NO_VIDEO` in that test.
- Size: `templates/` is about 167 MB, mostly looping videos (mp4, webm, poster) and the `_media` copies. Keep that in mind for clone and deploy time.

## Filling
`fillTemplate(files, values)` in `templates/_src/fill.js` replaces `{{tokens}}` in the HTML files and leaves css, js and fonts alone. It is pure and fast: no model, no network. `{{name}}` is HTML-escaped; `{{json:name}}` is escaped for the JSON in the page head. It returns the names of tokens that had no value, so a caller can fall back to the AI builder.

Common tokens: `business_name`, `tagline`, `city`, `phone`, `phone_href`, `email`, `address_line1`, `address_line2`, `hours_weekdays`, `hours_saturday`, `hours_sunday`, `instagram_url`, `facebook_url`, `maps_url`, `form_endpoint`, `year_founded`, `owner_name`. Some packs add their own (tech: `years_open`, `clients_served`, `team_size`, `booking_url`). The demo values in each pack list exactly what that pack needs.

Forms post JSON to `/api/site-forms/:projectId` with a kind such as `order`, `contact` or `booking`.

## Photos
Every picture frame is tagged `data-gurost-image` (a full photographic brief), `data-gurost-search` and `data-gurost-image-role`. `bots/template-photos.js` (`fillTemplatePhotos`, tested in `test/template-photos.test.js`) swaps them for real photographs in four modes: `stock` (Pixabay, Openverse, Unsplash; the default), `ai` (FLUX via fal.ai, falling back to stock), `mine` (customer uploads) and `art` (keep the drawn art). A slot that cannot be filled keeps its drawn art, so a page never shows a broken picture. **It is not called from the live builder yet.** `scripts/generate-photos.py` can write one-off photographs into `templates/_media/<industry>/photo/`, and the build prefers them over the drawn art of the same name.

## Honest limits
- The pictures are drawn soft-3D art, not photographs, and the videos are scripted loops, not stock footage. A real-photo pass waits for the GPU or stock-photo keys and for Irfan to say which templates matter.
- The templates are not connected to the builder: no picker, no way for a customer to choose one and see it fill with their words.
- Prices, legal text (Privacy and Terms pop-ups), finance figures (mortgage, estimates, fees) and service lists are illustrative and need the owner's own wording. The calculators are demonstrations, not quotes or advice.
- Sanctuary: animal names and numbers are examples; a donation link is the customer's own (`donate_url`).
- GSAP is not used; motion is plain CSS and a small script.
- Instrument Serif has no licence file in the font pack, so it is avoided; the Bakery `minimal` template still needs `OFL-InstrumentSerif.txt` added before launch.
- Headless screenshots of the 3D heroes need `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` and about 6 seconds of waiting.

## Next
1. Template picker and the hook into the live builder (Website Builder first, then the App Builder per the priority rule).
2. Photo pass once keys and balances are topped up and Irfan has chosen which templates matter.
3. Media catalog the swarm bots search (images, loops, icons, map blocks).

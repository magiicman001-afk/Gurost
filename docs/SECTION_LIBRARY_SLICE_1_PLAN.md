# Section library, slice 1: Navbar, Hero, Footer (build plan)

Status: PLAN ONLY (2026-10-09). Nothing here is built. Build starts after security S3a-d lands and Irfan says go.
Parent plans: the approved blueprint (20 sections x 3 variants, 6 palettes, quality gate) and the implementation plan
(plain scoped CSS, server-side templates, one batch AI-fill call, honest slots). This file is the detail for the first 3 sections.

## 0. Shared rules (apply to all three sections)

**One slot schema per section.** A, B and C of a section take the SAME slots, so swapping a variant (a Pulse "use the other navbar",
or the quality gate's fallback) never loses content. A variant ignores a slot it has no room for.

**Files (per section `X`):**
```
lib/sections/X/a.html   lib/sections/X/b.html   lib/sections/X/c.html   (HTML fragments with {{slots}})
lib/sections/X/X.css    (one stylesheet for all three variants)
test/section-X.test.js  (one named test file per section)
```
Plus one entry per section in `lib/sections/manifest.json` (slots, max lengths, aliases, page types, contrast pairs, tones, status).
Foundation (commit 1, before this slice): `render.js`, `base.css`, `palettes.json`, the manifest schema, `test/helpers/section-checks.js`.

**Wrapper element (every variant):** `<header|section|footer class="g-X g-X--a" data-gurost-section="X" data-variant="a" data-tone="light|dark">`.
Pulse edits and swaps find a section by `data-gurost-section`.

**Class naming (BEM, prefix `g-`):** `.g-hero`, `.g-hero--a`, `.g-hero__title`, `.g-hero__cta`. State classes: `.is-open`, `.is-solid`.
No ids, no tag selectors, no `!important`, no Tailwind classes inside sections.

**CSS variables (from the palette, set once on `:root` by the assembler):**
```
colour : --g-bg  --g-surface  --g-text  --g-muted  --g-primary  --g-on-primary  --g-accent  --g-on-accent
         --g-border  --g-dark  --g-on-dark  --g-focus
type   : --g-font-head  --g-font-body  --g-t-12 --g-t-14 --g-t-16 --g-t-20 --g-t-24 --g-t-32 --g-t-48 --g-t-64 (fluid clamp on phones)
space  : --g-s1 8px  --g-s2 16px  --g-s3 24px  --g-s4 32px  --g-s6 48px  --g-s8 64px  --g-s12 96px  (8px grid)
shape  : --g-radius  --g-radius-btn  --g-shadow  --g-max (1200px content width)
```
Rule enforced by test: section CSS contains NO hex or rgb colours except the scrims listed below; colours come from variables only.

**Motion hooks (attributes only, no animation code in slice 1):** `data-g-reveal="up|fade"`, `data-g-stagger`, `data-g-parallax`,
`data-g-nav-solid`. Default state is fully visible. Only when the page script adds `class="g-js"` to `<html>` may a hidden start state apply
(`.g-js [data-g-reveal]`), so a page with scripts blocked, or with `prefers-reduced-motion`, still shows everything.

**Escaping and links (render.js, tested in every section test):**
- Every text slot is HTML-escaped. Truncation at the max length is on a word boundary with an ellipsis.
- `href` allowlist: `https:`, `http:`, `mailto:`, `tel:`, `#anchor`, relative paths. `javascript:`, `data:` and anything else become `#`.
- Image `src` may only be an `IMG_n` token (filled by the existing image step) or an allowlisted https URL.
- An empty optional slot removes its whole element (no empty `<a href="">`, no stray `{{`).

**Honest content:** phone, email, address, hours and socials come ONLY from the company details. If absent: the element is omitted, except
hours, which show the marked placeholder `[Add your opening hours]`. No invented slogans, ratings, years or prices anywhere in these three sections.

**Industry defaults (suggested starting variants; the planner may override):**

| Industry | Navbar | Hero | Footer |
|---|---|---|---|
| Cafe / Bakery | A | A | A |
| Law / Finance | A | C | A |
| Salon / Beauty | B | B | A |
| Trades / Construction | A (phone first) | B | A |
| Health / Clinic | A | A | C |
| Tech / SaaS | C | C | B |

---

## 1. NAVBAR

### 1.0 Slots (shared by A, B, C)

| Slot | Type | Required | Max | Notes |
|---|---|---|---|---|
| `{{brand}}` | text | yes | 32 chars | business name from company details |
| `{{logo}}` | image | no | n/a | only if the owner supplied one; `alt` = brand |
| `{{links}}` | list of {label, href} | yes | 3 to 6 items, label 16 chars | hrefs are `#section-id` anchors of sections present on the page |
| `{{cta_label}}` | text | yes | 20 chars | for example "Book a table" |
| `{{cta_href}}` | link | yes | n/a | anchor or `tel:`/`mailto:` |
| `{{phone}}` | text | no | 20 chars | company details only; shown as a `tel:` link |

Fewer than 3 links: the list simply shows fewer. More than 6: extras are dropped (the model is told the limit).

### 1.1 Variant A: Simple bar
- **Layout:** one row, `display:flex; align-items:center; justify-content:space-between`. Brand (left), links (centre-right), CTA button (right).
  `<header>` is `position:sticky; top:0`, solid `--g-surface`, 1px `--g-border` bottom line.
- **Mobile (375px):** brand left, a 44x44 menu button right; the links and CTA live in a drawer under the bar (full width, stacked, 48px rows).
  CTA is the last item and full width. Desktop (from 880px): the drawer is hidden and everything is inline.
- **Hooks:** none needed (static).

### 1.2 Variant B: Centred brand
- **Layout:** three-column grid on desktop: links split left (first half), brand centred, links right (second half) with the CTA last.
  Brand is larger (`--g-t-24`, heading font). Not sticky by default (a quiet, editorial feel), sticky if the planner sets `sticky:true`.
- **Mobile:** brand centred, menu button left, CTA as a compact icon-less button right (label shortens by CSS to the first word is NOT done;
  the full label wraps or the button moves into the drawer if the label is over 12 characters).
- **Hooks:** none.

### 1.3 Variant C: Transparent over the hero
- **Layout:** `position:absolute; top:0; left:0; right:0` over the hero image. Transparent, light text, same row structure as A.
  Over a photo the text colour is `--g-on-dark` and a top scrim `linear-gradient(rgba(0,0,0,.6), transparent)` sits behind it
  (0.6 is the minimum that keeps white text at 4.5:1 even over a pure white photo; see test).
- **Scroll:** `data-g-nav-solid` is the hook; the page script (later) adds `.is-solid` after 24px of scroll, which switches to the A look.
  Without scripts it simply stays transparent-with-scrim, still readable.
- **Hard rule:** C may only be assembled directly before a hero that has an image or a dark `--g-dark` background (hero B, or hero C in dark tone).
  The assembler/gate swaps to A otherwise.
- **Mobile:** as A; the open drawer has a solid `--g-dark` background so links are readable over any photo.

### 1.4 CSS approach
`lib/sections/navbar/navbar.css`: `.g-navbar` (shared), `.g-navbar--a|b|c`, elements `__inner`, `__brand`, `__logo`, `__links`, `__link`, `__cta`,
`__menu-btn`, `__drawer`, `__skip`. Menu toggle: a `<button class="g-navbar__menu-btn" aria-expanded="false" aria-controls="g-nav-drawer">` and a ~15 line
inline script (open/close, Escape closes and returns focus). No-JS fallback: the drawer is visible stacked under the bar below 880px (never hidden
without JS), so the site still navigates. Variables used: `--g-surface --g-text --g-primary --g-on-primary --g-border --g-dark --g-on-dark --g-focus --g-font-head --g-radius-btn --g-s2 --g-s3`.

### 1.5 Industry variations
- **Cafe:** warm cream surface, "Call {{phone}}" as the CTA when a phone exists (decision 2), rounded CTA (`--g-radius-btn` 999px), brand in the heading font (serif), links in sentence case.
- **Law:** more formal: links UPPERCASE `--g-t-12`, letter-spacing .08em, hairline border, no shadow, square CTA (radius 2px), brand weight 600.
- **Salon:** default variant B, airy: extra vertical padding (`--g-s3`), thin heading weight, pill CTA.
- **Trades:** the phone number is promoted: CTA slot becomes "Call {{phone}}" (`tel:` link) when a phone exists, bold heading font, 4px radius.
- **Health:** soft: 16px radius CTA, a visible "Book" CTA, phone shown as a second small link when present.
- **Tech:** dark tone available (`data-tone="dark"`: `--g-dark` bar, `--g-on-dark` text), backdrop blur on the sticky bar, 8px radius.

### 1.6 Accessibility
- Contrast pairs: `--g-text` on `--g-surface` (links, 4.5:1); `--g-on-primary` on `--g-primary` (CTA, 4.5:1); `--g-primary` link hover/active on `--g-surface`
  (UI colour, 3:1); `--g-focus` ring on `--g-surface` (3:1); C: `--g-on-dark` over the worst-case photo under the 0.6 scrim (4.5:1); drawer `--g-on-dark` on `--g-dark` (4.5:1).
- Landmarks: `<header>`, `<nav aria-label="Main">`. First focusable item is a visually-hidden "Skip to content" link to `#main` (assembler sets `<main id="main">`).
- Menu button: `<button>` (not a div), `aria-expanded` and `aria-controls` kept in sync, `aria-label="Menu"`. Escape closes it and returns focus to it.
- Tap targets at least 44x44px. Visible focus ring (2px `--g-focus`, 2px offset) on every link and button. `alt` for the logo is the brand name; none if no logo.

### 1.7 Test checklist: `test/section-navbar.test.js`
For each variant (A, B, C) x each of the 6 palettes x each fixture (full, minimal, max-length, XSS, unicode/emoji, no-optional-slots):
1. No `{{` left; no empty `href`; optional slots removed cleanly.
2. Slot truncation: a 200-character brand is cut to 32 on a word boundary with an ellipsis; 12 links are cut to 6.
3. XSS: `<img src=x onerror=alert(1)>` and `"><script>` in brand, links and CTA appear only as escaped text; `javascript:alert(1)` as an href becomes `#`.
4. Contrast (computed from the palette tokens, no browser): every pair in 1.6 at 4.5:1 text, 3:1 UI. Variant C's scrim test uses a white background as the worst case.
5. Section CSS has no raw colours and no `!important`; every `var(--g-*)` it uses exists in `base.css`.
6. Structure: one `<nav aria-label>`, the skip link first, the menu button has `aria-expanded` and `aria-controls`, `data-gurost-section="navbar"` and `data-variant` present.
7. Assembler rule: C directly before a non-image, non-dark hero is rejected (falls back to A).
8. Playwright (laptop or CI, `e2e/sections/navbar.spec.js`, not in `npm test`): at 375px `scrollWidth <= innerWidth`, the drawer opens and Escape closes it, menu tap target is at least 44px, no console errors; at 1440px links are inline.

---

## 2. HERO

### 2.0 Slots (shared by A, B, C)

| Slot | Type | Required | Max | Notes |
|---|---|---|---|---|
| `{{eyebrow}}` | text | no | 40 chars | short label above the headline, for example the business type and town |
| `{{headline}}` | text | yes | 70 chars | the page's single `<h1>` |
| `{{subhead}}` | text | yes | 160 chars | plain, specific to this business, no invented claims |
| `{{cta1_label}}` | text | yes | 24 chars | primary button |
| `{{cta1_href}}` | link | yes | n/a | anchor, `tel:` or `mailto:` |
| `{{cta2_label}}` | text | no | 24 chars | secondary (text/outline) button |
| `{{cta2_href}}` | link | no | n/a | |
| `{{image}}` | image (token `IMG_n`) | A, B: yes; C: no | n/a | filled by the existing image step |
| `{{image_brief}}` | text | with image | 200 chars | what the image shows; becomes `data-gurost-image` (role `hero`) |
| `{{image_alt}}` | text | with image | 100 chars | a literal description of the photo |
| `{{trust_line}}` | text | no | 60 chars | ONLY from company details (for example the address town); never invented |

The hero owns the page's only `<h1>`. If the page has no hero, the assembler promotes the first section's heading instead.

### 2.1 Variant A: Split (text left, image right)
- **Layout:** two columns from 880px: CSS grid `grid-template-columns: 1.05fr 1fr; gap: var(--g-s8)`, vertically centred, section padding `--g-s12` top and bottom.
  Eyebrow, headline (`--g-t-48` desktop), subhead (`--g-t-20`, `--g-muted`), button row, trust line. Image has `--g-radius`, `aspect-ratio: 4/3`, `object-fit: cover`.
- **Mobile (375px):** one column, text first then the image (4:3) below; headline `--g-t-32` (fluid), buttons stack full width; padding `--g-s8`.
- **Hooks:** `data-g-reveal="up"` with `data-g-stagger` on eyebrow, headline, subhead, buttons; `data-g-parallax` on the image (subtle).

### 2.2 Variant B: Full-bleed image
- **Layout:** the image is a background `<img>` (`position:absolute; inset:0; object-fit:cover`), min-height `80svh` (with a `80vh` fallback line before it), a scrim
  `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.6))` over it, content in `--g-max`, left-aligned (centred for Salon). Text is `--g-on-dark`.
- **Why 0.55 to 0.6:** white text over a pure white photo under a 0.55 black scrim is about 4.6:1; the test uses that worst case. Never lighter.
- **Mobile:** min-height `70svh`, content at the bottom third, buttons stacked full width. The image crops by `object-position: center` (a `{{image_focus}}` slot is NOT added in slice 1).
- **Hooks:** `data-g-reveal="fade"` on the content block; `data-g-parallax` on the image (off on mobile).
- **Failure behaviour:** if the image fails to fill (no credit, no stock match), the gate swaps this section to C with the same slots.

### 2.3 Variant C: Type-led (no photo)
- **Layout:** a large centred or left-aligned headline (`--g-t-64` desktop, `--g-t-32` to `--g-t-48` fluid on phones), subhead, buttons, on a plain `--g-bg`
  with one decorative shape built from CSS only (a soft `--g-accent` circle or a diagonal band at 12% opacity, `aria-hidden="true"`, `pointer-events:none`).
  Dark tone available: `--g-dark` background, `--g-on-dark` text.
- **Mobile:** same single column, left-aligned, buttons stacked. No overflow from the decorative shape (`overflow:hidden` on the section).
- **Hooks:** `data-g-reveal="up"` on the text.
- **Use:** the default for Law and Tech, and the automatic fallback for B when the image is missing. It needs no image credit at all.

### 2.4 CSS approach
`lib/sections/hero/hero.css`: `.g-hero`, `--a|b|c`, `__inner`, `__eyebrow`, `__title`, `__sub`, `__actions`, `__btn`, `__btn--primary`, `__btn--ghost`, `__media`,
`__img`, `__scrim`, `__trust`, `__shape`. Buttons share `.g-btn` rules defined in `base.css` (not repeated per section). Variables:
`--g-bg --g-surface --g-text --g-muted --g-primary --g-on-primary --g-accent --g-dark --g-on-dark --g-border --g-focus --g-font-head --g-font-body --g-t-* --g-s* --g-radius --g-radius-btn --g-max`.

### 2.5 Industry variations
- **Cafe:** warm cream `--g-bg`, serif headline, A with a rounded image corner (12px), eyebrow shows "Bakery, {town}" only when both come from the details.
- **Law:** C by default: restrained, headline in a serif at weight 500 to 600, square buttons (2px), a thin accent rule above the eyebrow, no decorative circle (a quiet hairline instead), no stock "handshake" image.
- **Salon:** B, centred text, light weight headline, pill buttons, generous whitespace (`--g-s12`), image with soft top-to-bottom scrim.
- **Trades:** B (a real job photo is best), bold condensed heading font, the phone CTA first ("Call {{phone}}" when present), 4px radius, high-contrast `--g-accent` button.
- **Health:** A, calm, 16px image radius, a visible "Book" CTA, reassuring (not medical-claim) subhead rules: the model is told never to state outcomes or credentials.
- **Tech:** C in dark tone, geometric sans headline, gradient accent shape allowed (still CSS only), 8px radius.

### 2.6 Accessibility
- Contrast pairs: `--g-text` on `--g-bg` (headline, 4.5:1; large text 3:1 minimum, but the test holds it to 4.5); `--g-muted` on `--g-bg` (subhead, 4.5:1);
  `--g-on-primary` on `--g-primary` (button, 4.5:1); `--g-primary` outline/ghost button text on `--g-bg` (4.5:1); B: `--g-on-dark` over the worst-case photo under the scrim (4.5:1);
  C dark tone: `--g-on-dark` on `--g-dark` (4.5:1); focus ring `--g-focus` on `--g-bg` and on `--g-dark` (3:1).
- Exactly one `<h1>`. The hero image has `alt` = `{{image_alt}}` (a literal description, never "hero image" or the brand name only). The decorative shape and any scrim are `aria-hidden="true"` and have `alt=""` if images.
- Buttons are real links or buttons with visible text (no icon-only), 44px minimum height, visible focus ring. No text is baked into images. Motion respects `prefers-reduced-motion` (hooks do nothing).

### 2.7 Test checklist: `test/section-hero.test.js`
Variants A, B, C x 6 palettes x fixtures (full, minimal, max-length, XSS, unicode, no-optional-slots, no-image):
1. No `{{` left; optional slots (eyebrow, second button, trust line) removed cleanly; with no image, A and B are refused and C is chosen (the swap rule).
2. Truncation: 300-character headline cut to 70, subhead to 160, labels to 24, on word boundaries.
3. XSS: markup in headline, subhead, labels and alt only appears escaped; bad hrefs become `#`; an `onerror` in the image brief is escaped inside `data-gurost-image`.
4. Contrast (computed): every pair in 2.6, with the B scrim math using a white photo as the worst case and the scrim opacity read from the CSS (must be at least 0.55).
5. Exactly one `<h1>`; the image tag carries `data-gurost-image` and `data-gurost-image-role="hero"`; `alt` present and not empty when there is an image.
6. Section CSS: no raw colours except the two scrim values, no `!important`, only known `--g-*` variables, no fixed pixel width over 375px on containers.
7. Hooks: `data-g-reveal` attributes exist; with no `g-js` class the CSS does not hide anything (a test parses the CSS for `opacity:0` or `visibility:hidden` outside `.g-js`).
8. Playwright (`e2e/sections/hero.spec.js`): 375px no horizontal scroll for A, B, C; headline fully inside the viewport; buttons at least 44px high; B shows the scrim and readable text; 1440px split layout for A; no console errors.

---

## 3. FOOTER

### 3.0 Slots (shared by A, B, C)

| Slot | Type | Required | Max | Notes |
|---|---|---|---|---|
| `{{brand}}` | text | yes | 32 chars | |
| `{{tagline}}` | text | no | 90 chars | from the company details tagline only |
| `{{link_groups}}` | list of {title, links[]} | yes | 1 to 3 groups, title 20 chars, 5 links each, label 20 chars | anchors to sections on the page |
| `{{address}}` | text | no | 120 chars | company details only |
| `{{phone}}` | text | no | 20 chars | `tel:` link |
| `{{email}}` | text | no | 60 chars | `mailto:` link |
| `{{hours}}` | text | no | 80 chars | if absent: the marked placeholder `[Add your opening hours]` (shown, never invented) |
| `{{socials}}` | list of {platform, url} | no | 5 | platform is an enum (instagram, facebook, tiktok, youtube, x); icon is inline SVG; link text for screen readers is the platform name |
| `{{legal}}` | text | yes | 100 chars | "© {current year} {{brand}}"; the current calendar year is today's date, not an invented claim |
| `{{cta_title}}` / `{{cta_label}}` / `{{cta_href}}` | text, text, link | C only | 50 / 24 chars | the closing call to action band |
| `{{show_gurost_credit}}` | flag | no | n/a | the small "Built with Gurost" link, set by the plan setting (`includeBranding`) |

### 3.1 Variant A: Four columns
- **Layout:** dark band (`--g-dark`, `--g-on-dark`). Grid `grid-template-columns: 1.4fr 1fr 1fr 1fr` from 880px: brand and tagline | link group | contact (address, phone, email) | hours and socials.
  A bottom row with the legal text (left) and the Gurost credit and any privacy link (right), separated by a 1px line at 16% opacity of `--g-on-dark`... implemented with `--g-border` mixed via `color-mix`, with a plain `--g-border` fallback.
- **Mobile (375px):** one column in this order: brand and tagline, contact, hours, links, socials, legal. Link lists have 48px rows. Nothing hidden.
- **Hooks:** `data-g-reveal="up"` on each column (stagger).

### 3.2 Variant B: Minimal single row
- **Layout:** `--g-surface` (light) with a top border. One flex row: brand (left), inline links (centre), socials (right). Under it, a centred line with phone, email, address separated by dots, and the legal text.
- **Mobile:** stacked and centred: brand, links wrapping in rows, socials, contact lines, legal. 44px tap targets.
- **Hooks:** none.

### 3.3 Variant C: Call-to-action band plus links
- **Layout:** top band in `--g-primary` with `--g-on-primary` text: `{{cta_title}}` (heading font, `--g-t-32`) and a button (inverted colours: `--g-on-primary` background, `--g-primary` text). Below it the compact A-style columns on `--g-dark`.
- **Mobile:** the band stacks (title, then a full width button), then the single-column links.
- **Hooks:** `data-g-reveal="up"` on the band and on the columns. If the page already ends with a CTA section, the planner chooses A or B instead (no duplicate CTA).

### 3.4 CSS approach
`lib/sections/footer/footer.css`: `.g-footer`, `--a|b|c`, `__inner`, `__brand`, `__tagline`, `__group`, `__group-title`, `__links`, `__link`, `__contact`, `__hours`,
`__socials`, `__social`, `__legal`, `__credit`, `__cta-band`, `__cta-title`, `__cta-btn`. Variables:
`--g-dark --g-on-dark --g-surface --g-text --g-muted --g-primary --g-on-primary --g-border --g-focus --g-font-head --g-font-body --g-t-* --g-s* --g-radius-btn --g-max`.
Social icons are inline SVG paths in `render.js` (no icon fonts, no external requests), `fill: currentColor`.

### 3.5 Industry variations
- **Cafe:** light warm footer (decision 3, not dark), tagline in the heading font, opening hours in the second column (they matter most), the social row is prominent.
- **Law:** very plain: A with no social icons unless provided, address and phone first, a "Regulated by" style line is NOT invented (the owner adds real regulatory text later; the placeholder `[Add regulatory details]` is offered in `legal` only if the owner picks it).
- **Salon:** A or B, booking link first in the links group, the Instagram icon first in socials.
- **Trades:** A (light footer) with the phone number large in the contact column ("Call {{phone}}"), service area as a placeholder `[Add areas you cover]` shown only if the plan includes the line.
- **Health:** C with a "Book an appointment" band; opening hours and address prominent; no claims.
- **Tech:** B in dark tone, links in two groups (Product, Company are labels the planner may rename), social icons for X and GitHub-like platforms only if provided.

### 3.6 Accessibility
- Contrast pairs: `--g-on-dark` on `--g-dark` (body and links, 4.5:1); `--g-muted`-equivalent footer text (`--g-on-dark` at the footer's secondary level, which must still be 4.5:1, so no opacity tricks: a named token `--g-on-dark-muted` is added to the palette and tested);
  B: `--g-text` on `--g-surface` (4.5:1); C band: `--g-on-primary` on `--g-primary` (4.5:1) and the inverted button text `--g-primary` on `--g-on-primary` (4.5:1); focus ring on `--g-dark` and on `--g-primary` (3:1).
- Landmarks: `<footer>` with `<nav aria-label="Footer">`. Social links: each `<a>` has `aria-label="{Platform} (opens in a new tab)"` and `rel="noopener noreferrer" target="_blank"`; the SVG is `aria-hidden="true"`.
- Phone and email are real `tel:` and `mailto:` links with the number or address as the visible text. Tap targets at least 44px. Visible focus rings. The legal line is plain text.

### 3.7 Test checklist: `test/section-footer.test.js`
Variants A, B, C x 6 palettes x fixtures (full, minimal, max-length, XSS, unicode, no-optional-slots, no-socials, no-contact):
1. No `{{` left; groups with no links removed; no empty columns; hours show the marked placeholder when absent; address, phone and email never invented.
2. Truncation: tagline to 90, address to 120, 8 links in a group cut to 5, 5 or more socials cut to 5.
3. XSS: markup in tagline, address, link labels, group titles and legal only appears escaped; `javascript:` hrefs become `#`; a social `url` that is not https is dropped; unknown platforms are dropped.
4. Contrast (computed): every pair in 3.6 including `--g-on-dark-muted`; the C band's two pairs.
5. Legal line: contains the current year computed at render (a test injects a fixed date), never a hard-coded year; the Gurost credit appears only when `show_gurost_credit` is set.
6. Structure: one `<footer>`, one `<nav aria-label="Footer">`, social links have `aria-label`, `rel` and `target`; `data-gurost-section="footer"` and `data-variant` present.
7. Section CSS: no raw colours, no `!important`, known `--g-*` variables only; `color-mix` has a plain fallback line before it.
8. Playwright (`e2e/sections/footer.spec.js`): 375px no horizontal scroll for A, B, C; single column order as in 3.1; all links reachable by Tab; 1440px four columns for A; no console errors.

---

## 4. Shared test helper and fixtures (built once, used by all three)
`test/helpers/section-checks.js` exports: `renderAll(section)` (every variant x palette x fixture), `contrast(fg, bg)` (WCAG relative luminance, returns a ratio),
`assertNoRawColours(css)`, `assertKnownVars(css, baseCss)`, `assertEscaped(html, payloads)`, `assertNoLeftoverSlots(html)`.
Fixtures live in `test/fixtures/sections/`: `full.json`, `minimal.json`, `maxlen.json`, `xss.json`, `unicode.json`, `no-optional.json`. The palette test (commit 1) also checks
every palette's token pairs once, so the per-section tests can trust the palettes and focus on how a section uses them.

## 5. Palettes the slice depends on
Six palettes (Cafe, Law, Salon, Trades, Health, Tech) in `lib/sections/palettes.json`, each with the token set in section 0 plus `--g-on-dark-muted` and a tone flag (`light` or `dark`).
Values are taken from the existing `lib/design-data/colors.csv` rows for the matching industries (Bakery/Cafe is `#92400E` primary on `#FEF3C7`, already verified live) and re-checked
for every pair by the palette test. The earlier contrast check found all pairs at 4.5:1 or better, with the tightest being Cafe accent on background (4.5), Law (4.7) and Trades (4.9);
any palette value that fails in the test is adjusted darker, never lighter. The six hex sets are written down in commit 1, not guessed here.

## 6. Sunday execution order (every commit is shown and approved first, then pushed at once)
1. Foundation: `render.js`, `base.css` (tokens, type scale, spacing, `.g-btn`, skip link), `palettes.json`, manifest schema, test helper and fixtures, palette test. Not wired into the app.
2. Navbar: 3 html + `navbar.css` + manifest entry + `test/section-navbar.test.js` (6 files).
3. Hero: 3 html + `hero.css` + manifest entry + `test/section-hero.test.js` (6 files).
4. Footer: 3 html + `footer.css` + manifest entry + `test/section-footer.test.js` (6 files).
5. Playwright specs for the three (`e2e/sections/*.spec.js`) and a throwaway local gallery page to look at all 27 combinations (3 sections x 3 variants x 3 sample palettes) on a phone-sized screen. Screenshots go to Irfan before any further sections are started.
Each of commits 2 to 4 is six files, inside the standing 12-file OK. Nothing is switched on: `SECTION_LIBRARY` stays off until the assembler commit.
The sandbox can run the Playwright checks here because section CSS is plain CSS with no Tailwind CDN; fonts will fall back to system fonts there, so the real-font look is checked on the laptop or live.

## 7. Decisions by Irfan (2026-10-09, replace the earlier open questions)
1. **"Built with Gurost" credit:** Free plan shows it; paid plans do not (white-label). `show_gurost_credit` is set from the plan (`includeBranding`).
2. **"Call" as the main CTA** (when a phone number exists, `tel:` link): Trades (emergencies), Health (appointments), Cafe/Bakery (orders and reservations). Law, Salon and Tech keep Book/Contact as the main CTA; the phone stays a secondary link.
3. **Footer tone follows the palette, not one rule:** Law and Tech use a dark footer (navy/near-black); Cafe, Salon, Trades and Health use a light footer (cream/warm/white). The footer must close the page naturally, with no jarring jump. The footer wrapper sets `data-tone` per industry; light footers use `--g-surface`/`--g-text` and a `--g-muted` token tested at 4.5:1, dark footers use `--g-dark`/`--g-on-dark`/`--g-on-dark-muted`. This supersedes the "dark footer" wording in 3.5 for Cafe, Salon, Trades and Health (their footer text pairs are tested in light tone).

# Industry palettes spec (locked for the section library build)

Status: LOCKED 2026-10-09 by Irfan (colours, Trades orange #C2410C, and all 6 font pairs confirmed). Part of the section library (see `SECTION_LIBRARY_SLICE_1_PLAN.md`). Every contrast ratio below was computed with the WCAG 2.x relative-luminance formula by a script, not estimated. Thresholds: body text 4.5:1, large text (24px, or 19px bold, and up) 3:1, UI borders and focus rings 3:1.

Token names match the slice-1 plan: `--g-primary --g-on-primary --g-bg --g-text --g-muted --g-accent --g-on-accent --g-border` plus extras `--g-surface --g-dark --g-on-dark --g-on-dark-muted --g-focus`. In this spec, `foreground` = `--g-text` and `background` = `--g-bg`.

Rules: the model never picks colours; the assembler writes these variables. Any pair that fails its threshold fails the build (test file in section 8). Focus rings use `--g-focus` on light surfaces and `--g-on-dark` on dark surfaces (3:1 each, tested). Decorative borders (`--g-border`) are not text and are exempt from 4.5:1, but a border that marks an input must reach 3:1 (the input border uses `--g-muted`, tested below).


## 1. Cafe / Bakery (`cafe`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#92400E` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#FFFBEB` | page background |
| `--g-text` | `#292524` | body text |
| `--g-muted` | `#6B5B4E` | secondary text |
| `--g-accent` | `#B45309` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#FEF3C7` | cards, alternate sections, light footer |
| `--g-border` | `#E7D5B3` | dividers, card edges |
| `--g-dark` | `#451A03` | dark footer / dark bands |
| `--g-on-dark` | `#FEF3C7` | text on dark |
| `--g-on-dark-muted` | `#E7CFA0` | secondary text on dark |
| `--g-focus` | `#92400E` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #292524 | `bg` #FFFBEB | 14.63 | 4.5 | PASS |
| `fg` #292524 | `surface` #FEF3C7 | 13.62 | 4.5 | PASS |
| `muted` #6B5B4E | `bg` #FFFBEB | 6.27 | 4.5 | PASS |
| `muted` #6B5B4E | `surface` #FEF3C7 | 5.84 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #92400E | 7.09 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #B45309 | 5.02 | 4.5 | PASS |
| `primary` #92400E | `bg` #FFFBEB | 6.84 | 4.5 | PASS |
| `primary` #92400E | `surface` #FEF3C7 | 6.37 | 4.5 | PASS |
| `accent` #B45309 | `bg` #FFFBEB | 4.84 | 4.5 | PASS |
| `accent` #B45309 | `surface` #FEF3C7 | 4.51 | 4.5 | PASS |
| `on_dark` #FEF3C7 | `dark` #451A03 | 13.45 | 4.5 | PASS |
| `on_dark_muted` #E7CFA0 | `dark` #451A03 | 9.86 | 4.5 | PASS |
| `focus` #92400E | `bg` #FFFBEB | 6.84 | 3.0 | PASS |
| `on_dark` #FEF3C7 | `dark` #451A03 | 13.45 | 3.0 | PASS |

### Typography

- Heading font: **Playfair Display SC** (Google Fonts), fallback stack: `Georgia, 'Times New Roman', serif`
- Body font: **Karla** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: A warm display serif gives a hand-made, bakery-sign feel; Karla is a friendly, very readable grotesque for menus and opening hours. Both are the pair already verified live in the bakery build.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Warm, welcoming and a little nostalgic, like a bakery window in the morning. Cream and toasted brown make food look appetising and the page feel local, not corporate.

Best hero variant: B (full-bleed food photo with scrim); C when no photo.

### Default sections

- Primary CTA: Call (orders/reservations); secondary: View menu
- Footer: Light (`data-tone="light"`, background `--g-surface`)
- Special sections: Menu (categories, no invented prices), Opening hours, Find us (map link), Instagram strip

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #292524 (`fg`) | #FFFBEB (`bg`) | body | 4.5 | 14.63 (test: ratio >= 4.5 and within 0.01 of 14.63) |
| 2 | #292524 (`fg`) | #FEF3C7 (`surface`) | body | 4.5 | 13.62 (test: ratio >= 4.5 and within 0.01 of 13.62) |
| 3 | #6B5B4E (`muted`) | #FFFBEB (`bg`) | body | 4.5 | 6.27 (test: ratio >= 4.5 and within 0.01 of 6.27) |
| 4 | #FFFFFF (`on_primary`) | #92400E (`primary`) | body | 4.5 | 7.09 (test: ratio >= 4.5 and within 0.01 of 7.09) |
| 5 | #FFFFFF (`on_accent`) | #B45309 (`accent`) | body | 4.5 | 5.02 (test: ratio >= 4.5 and within 0.01 of 5.02) |
| 6 | #92400E (`primary`) | #FFFBEB (`bg`) | large | 3.0 | 6.84 (test: ratio >= 3.0 and within 0.01 of 6.84) |
| 7 | #FEF3C7 (`on_dark`) | #451A03 (`dark`) | body | 4.5 | 13.45 (test: ratio >= 4.5 and within 0.01 of 13.45) |
| 8 | #E7CFA0 (`on_dark_muted`) | #451A03 (`dark`) | body | 4.5 | 9.86 (test: ratio >= 4.5 and within 0.01 of 9.86) |
| 9 | #92400E (`primary`) | #FEF3C7 (`surface`) | body | 4.5 | 6.37 (test: ratio >= 4.5 and within 0.01 of 6.37) |

## 2. Law / Finance (`law`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#1E3A5F` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#FFFFFF` | page background |
| `--g-text` | `#0F172A` | body text |
| `--g-muted` | `#475569` | secondary text |
| `--g-accent` | `#92400E` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#F1F5F9` | cards, alternate sections, light footer |
| `--g-border` | `#CBD5E1` | dividers, card edges |
| `--g-dark` | `#0B1B33` | dark footer / dark bands |
| `--g-on-dark` | `#E2E8F0` | text on dark |
| `--g-on-dark-muted` | `#A9B8CC` | secondary text on dark |
| `--g-focus` | `#1E3A5F` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #0F172A | `bg` #FFFFFF | 17.85 | 4.5 | PASS |
| `fg` #0F172A | `surface` #F1F5F9 | 16.30 | 4.5 | PASS |
| `muted` #475569 | `bg` #FFFFFF | 7.58 | 4.5 | PASS |
| `muted` #475569 | `surface` #F1F5F9 | 6.92 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #1E3A5F | 11.50 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #92400E | 7.09 | 4.5 | PASS |
| `primary` #1E3A5F | `bg` #FFFFFF | 11.50 | 4.5 | PASS |
| `primary` #1E3A5F | `surface` #F1F5F9 | 10.50 | 4.5 | PASS |
| `accent` #92400E | `bg` #FFFFFF | 7.09 | 4.5 | PASS |
| `accent` #92400E | `surface` #F1F5F9 | 6.47 | 4.5 | PASS |
| `on_dark` #E2E8F0 | `dark` #0B1B33 | 13.98 | 4.5 | PASS |
| `on_dark_muted` #A9B8CC | `dark` #0B1B33 | 8.55 | 4.5 | PASS |
| `focus` #1E3A5F | `bg` #FFFFFF | 11.50 | 3.0 | PASS |
| `on_dark` #E2E8F0 | `dark` #0B1B33 | 13.98 | 3.0 | PASS |

### Typography

- Heading font: **Libre Baskerville** (Google Fonts), fallback stack: `Georgia, 'Times New Roman', serif`
- Body font: **Source Sans 3** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: Baskerville is a classic, trusted book serif that reads as established and serious; Source Sans 3 is a neutral, highly legible body face that stays calm next to it.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Calm, authoritative and trustworthy. Navy and restrained bronze say experience and discretion, with no flash.

Best hero variant: C (type-led, no photo needed); A when a real office or team photo exists.

### Default sections

- Primary CTA: Contact (Book a consultation)
- Footer: Dark (`data-tone="dark"`, background `--g-dark`)
- Special sections: Practice areas, Team (real names only), How it works, Contact form, Regulatory line (owner supplies)

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #0F172A (`fg`) | #FFFFFF (`bg`) | body | 4.5 | 17.85 (test: ratio >= 4.5 and within 0.01 of 17.85) |
| 2 | #0F172A (`fg`) | #F1F5F9 (`surface`) | body | 4.5 | 16.30 (test: ratio >= 4.5 and within 0.01 of 16.30) |
| 3 | #475569 (`muted`) | #FFFFFF (`bg`) | body | 4.5 | 7.58 (test: ratio >= 4.5 and within 0.01 of 7.58) |
| 4 | #475569 (`muted`) | #F1F5F9 (`surface`) | body | 4.5 | 6.92 (test: ratio >= 4.5 and within 0.01 of 6.92) |
| 5 | #FFFFFF (`on_primary`) | #1E3A5F (`primary`) | body | 4.5 | 11.50 (test: ratio >= 4.5 and within 0.01 of 11.50) |
| 6 | #FFFFFF (`on_accent`) | #92400E (`accent`) | body | 4.5 | 7.09 (test: ratio >= 4.5 and within 0.01 of 7.09) |
| 7 | #92400E (`accent`) | #FFFFFF (`bg`) | body | 4.5 | 7.09 (test: ratio >= 4.5 and within 0.01 of 7.09) |
| 8 | #E2E8F0 (`on_dark`) | #0B1B33 (`dark`) | body | 4.5 | 13.98 (test: ratio >= 4.5 and within 0.01 of 13.98) |
| 9 | #A9B8CC (`on_dark_muted`) | #0B1B33 (`dark`) | body | 4.5 | 8.55 (test: ratio >= 4.5 and within 0.01 of 8.55) |

## 3. Salon / Beauty (`salon`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#831843` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#FFF8F6` | page background |
| `--g-text` | `#2A1A20` | body text |
| `--g-muted` | `#6B4A57` | secondary text |
| `--g-accent` | `#9D174D` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#FCE7F3` | cards, alternate sections, light footer |
| `--g-border` | `#F3CFE0` | dividers, card edges |
| `--g-dark` | `#3B0A22` | dark footer / dark bands |
| `--g-on-dark` | `#FCE7F3` | text on dark |
| `--g-on-dark-muted` | `#E9B5CE` | secondary text on dark |
| `--g-focus` | `#831843` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #2A1A20 | `bg` #FFF8F6 | 15.79 | 4.5 | PASS |
| `fg` #2A1A20 | `surface` #FCE7F3 | 14.10 | 4.5 | PASS |
| `muted` #6B4A57 | `bg` #FFF8F6 | 7.30 | 4.5 | PASS |
| `muted` #6B4A57 | `surface` #FCE7F3 | 6.51 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #831843 | 9.65 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #9D174D | 7.88 | 4.5 | PASS |
| `primary` #831843 | `bg` #FFF8F6 | 9.19 | 4.5 | PASS |
| `primary` #831843 | `surface` #FCE7F3 | 8.21 | 4.5 | PASS |
| `accent` #9D174D | `bg` #FFF8F6 | 7.51 | 4.5 | PASS |
| `accent` #9D174D | `surface` #FCE7F3 | 6.71 | 4.5 | PASS |
| `on_dark` #FCE7F3 | `dark` #3B0A22 | 14.26 | 4.5 | PASS |
| `on_dark_muted` #E9B5CE | `dark` #3B0A22 | 9.55 | 4.5 | PASS |
| `focus` #831843 | `bg` #FFF8F6 | 9.19 | 3.0 | PASS |
| `on_dark` #FCE7F3 | `dark` #3B0A22 | 14.26 | 3.0 | PASS |

### Typography

- Heading font: **Cormorant Garamond** (Google Fonts), fallback stack: `Georgia, 'Times New Roman', serif`
- Body font: **Jost** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: A light, high-contrast display serif feels elegant and editorial; Jost is a clean geometric sans that keeps services and times easy to scan.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Airy, stylish and personal. Soft blush with a deep berry anchor feels premium without being cold.

Best hero variant: B (full-bleed portrait or interior photo); A with a real photo.

### Default sections

- Primary CTA: Book (Book an appointment)
- Footer: Light (`data-tone="light"`, background `--g-surface`)
- Special sections: Services and price list (owner-supplied prices only), Gallery, Team, Booking link, Instagram feed

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #2A1A20 (`fg`) | #FFF8F6 (`bg`) | body | 4.5 | 15.79 (test: ratio >= 4.5 and within 0.01 of 15.79) |
| 2 | #2A1A20 (`fg`) | #FCE7F3 (`surface`) | body | 4.5 | 14.10 (test: ratio >= 4.5 and within 0.01 of 14.10) |
| 3 | #6B4A57 (`muted`) | #FFF8F6 (`bg`) | body | 4.5 | 7.30 (test: ratio >= 4.5 and within 0.01 of 7.30) |
| 4 | #6B4A57 (`muted`) | #FCE7F3 (`surface`) | body | 4.5 | 6.51 (test: ratio >= 4.5 and within 0.01 of 6.51) |
| 5 | #FFFFFF (`on_primary`) | #831843 (`primary`) | body | 4.5 | 9.65 (test: ratio >= 4.5 and within 0.01 of 9.65) |
| 6 | #FFFFFF (`on_accent`) | #9D174D (`accent`) | body | 4.5 | 7.88 (test: ratio >= 4.5 and within 0.01 of 7.88) |
| 7 | #831843 (`primary`) | #FFF8F6 (`bg`) | large | 3.0 | 9.19 (test: ratio >= 3.0 and within 0.01 of 9.19) |
| 8 | #FCE7F3 (`on_dark`) | #3B0A22 (`dark`) | body | 4.5 | 14.26 (test: ratio >= 4.5 and within 0.01 of 14.26) |
| 9 | #E9B5CE (`on_dark_muted`) | #3B0A22 (`dark`) | body | 4.5 | 9.55 (test: ratio >= 4.5 and within 0.01 of 9.55) |

## 4. Trades / Construction (`trades`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#1F2937` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#FFFFFF` | page background |
| `--g-text` | `#111827` | body text |
| `--g-muted` | `#4B5563` | secondary text |
| `--g-accent` | `#C2410C` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#F3F4F6` | cards, alternate sections, light footer |
| `--g-border` | `#D1D5DB` | dividers, card edges |
| `--g-dark` | `#111827` | dark footer / dark bands |
| `--g-on-dark` | `#F3F4F6` | text on dark |
| `--g-on-dark-muted` | `#B4BCC8` | secondary text on dark |
| `--g-focus` | `#C2410C` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #111827 | `bg` #FFFFFF | 17.74 | 4.5 | PASS |
| `fg` #111827 | `surface` #F3F4F6 | 16.12 | 4.5 | PASS |
| `muted` #4B5563 | `bg` #FFFFFF | 7.56 | 4.5 | PASS |
| `muted` #4B5563 | `surface` #F3F4F6 | 6.87 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #1F2937 | 14.68 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #C2410C | 5.18 | 4.5 | PASS |
| `primary` #1F2937 | `bg` #FFFFFF | 14.68 | 4.5 | PASS |
| `primary` #1F2937 | `surface` #F3F4F6 | 13.34 | 4.5 | PASS |
| `accent` #C2410C | `bg` #FFFFFF | 5.18 | 4.5 | PASS |
| `accent` #C2410C | `surface` #F3F4F6 | 4.71 | 4.5 | PASS |
| `on_dark` #F3F4F6 | `dark` #111827 | 16.12 | 4.5 | PASS |
| `on_dark_muted` #B4BCC8 | `dark` #111827 | 9.27 | 4.5 | PASS |
| `focus` #C2410C | `bg` #FFFFFF | 5.18 | 3.0 | PASS |
| `on_dark` #F3F4F6 | `dark` #111827 | 16.12 | 3.0 | PASS |

### Typography

- Heading font: **Barlow Condensed** (Google Fonts), fallback stack: `'Arial Narrow', Arial, sans-serif`
- Body font: **Barlow** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: A sturdy condensed face reads like site signage: bold, quick to read on a phone. Barlow is its matching body face, so the pair feels like one family.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Solid, dependable and no-nonsense. Charcoal with a safety-orange action colour makes the phone button impossible to miss.

Best hero variant: B (real job photo); A with a real photo; C as fallback.

### Default sections

- Primary CTA: Call (Call {{phone}}); secondary: Get a quote
- Footer: Light (`data-tone="light"`, background `--g-surface`)
- Special sections: Services, Areas covered (owner-supplied), Recent jobs gallery, Emergency strip, Quote form

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #111827 (`fg`) | #FFFFFF (`bg`) | body | 4.5 | 17.74 (test: ratio >= 4.5 and within 0.01 of 17.74) |
| 2 | #111827 (`fg`) | #F3F4F6 (`surface`) | body | 4.5 | 16.12 (test: ratio >= 4.5 and within 0.01 of 16.12) |
| 3 | #4B5563 (`muted`) | #FFFFFF (`bg`) | body | 4.5 | 7.56 (test: ratio >= 4.5 and within 0.01 of 7.56) |
| 4 | #4B5563 (`muted`) | #F3F4F6 (`surface`) | body | 4.5 | 6.87 (test: ratio >= 4.5 and within 0.01 of 6.87) |
| 5 | #FFFFFF (`on_primary`) | #1F2937 (`primary`) | body | 4.5 | 14.68 (test: ratio >= 4.5 and within 0.01 of 14.68) |
| 6 | #FFFFFF (`on_accent`) | #C2410C (`accent`) | body | 4.5 | 5.18 (test: ratio >= 4.5 and within 0.01 of 5.18) |
| 7 | #C2410C (`accent`) | #FFFFFF (`bg`) | large | 3.0 | 5.18 (test: ratio >= 3.0 and within 0.01 of 5.18) |
| 8 | #F3F4F6 (`on_dark`) | #111827 (`dark`) | body | 4.5 | 16.12 (test: ratio >= 4.5 and within 0.01 of 16.12) |
| 9 | #B4BCC8 (`on_dark_muted`) | #111827 (`dark`) | body | 4.5 | 9.27 (test: ratio >= 4.5 and within 0.01 of 9.27) |

## 5. Health / Clinic (`health`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#0F766E` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#F7FFFD` | page background |
| `--g-text` | `#10302D` | body text |
| `--g-muted` | `#40605C` | secondary text |
| `--g-accent` | `#0369A1` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#E6F7F4` | cards, alternate sections, light footer |
| `--g-border` | `#BFE3DD` | dividers, card edges |
| `--g-dark` | `#0B3B37` | dark footer / dark bands |
| `--g-on-dark` | `#E6F7F4` | text on dark |
| `--g-on-dark-muted` | `#A9D3CD` | secondary text on dark |
| `--g-focus` | `#0F766E` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #10302D | `bg` #F7FFFD | 13.95 | 4.5 | PASS |
| `fg` #10302D | `surface` #E6F7F4 | 12.80 | 4.5 | PASS |
| `muted` #40605C | `bg` #F7FFFD | 6.79 | 4.5 | PASS |
| `muted` #40605C | `surface` #E6F7F4 | 6.23 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #0F766E | 5.47 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #0369A1 | 5.93 | 4.5 | PASS |
| `primary` #0F766E | `bg` #F7FFFD | 5.39 | 4.5 | PASS |
| `primary` #0F766E | `surface` #E6F7F4 | 4.95 | 4.5 | PASS |
| `accent` #0369A1 | `bg` #F7FFFD | 5.84 | 4.5 | PASS |
| `accent` #0369A1 | `surface` #E6F7F4 | 5.36 | 4.5 | PASS |
| `on_dark` #E6F7F4 | `dark` #0B3B37 | 11.19 | 4.5 | PASS |
| `on_dark_muted` #A9D3CD | `dark` #0B3B37 | 7.60 | 4.5 | PASS |
| `focus` #0F766E | `bg` #F7FFFD | 5.39 | 3.0 | PASS |
| `on_dark` #E6F7F4 | `dark` #0B3B37 | 11.19 | 3.0 | PASS |

### Typography

- Heading font: **Nunito** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Body font: **Open Sans** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: Nunito has rounded, friendly letterforms that lower anxiety; Open Sans is among the most readable body faces for older and younger readers alike.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Clean, calm and reassuring. Soft teal and clear blue feel clinical enough to trust and gentle enough to relax.

Best hero variant: A (split with a real, friendly photo); C as fallback.

### Default sections

- Primary CTA: Call (appointments); secondary: Book online
- Footer: Light (`data-tone="light"`, background `--g-surface`)
- Special sections: Services, Opening hours, Team (real names only), New patient info, Location and parking. No medical claims.

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #10302D (`fg`) | #F7FFFD (`bg`) | body | 4.5 | 13.95 (test: ratio >= 4.5 and within 0.01 of 13.95) |
| 2 | #10302D (`fg`) | #E6F7F4 (`surface`) | body | 4.5 | 12.80 (test: ratio >= 4.5 and within 0.01 of 12.80) |
| 3 | #40605C (`muted`) | #F7FFFD (`bg`) | body | 4.5 | 6.79 (test: ratio >= 4.5 and within 0.01 of 6.79) |
| 4 | #40605C (`muted`) | #E6F7F4 (`surface`) | body | 4.5 | 6.23 (test: ratio >= 4.5 and within 0.01 of 6.23) |
| 5 | #FFFFFF (`on_primary`) | #0F766E (`primary`) | body | 4.5 | 5.47 (test: ratio >= 4.5 and within 0.01 of 5.47) |
| 6 | #FFFFFF (`on_accent`) | #0369A1 (`accent`) | body | 4.5 | 5.93 (test: ratio >= 4.5 and within 0.01 of 5.93) |
| 7 | #0F766E (`primary`) | #F7FFFD (`bg`) | large | 3.0 | 5.39 (test: ratio >= 3.0 and within 0.01 of 5.39) |
| 8 | #E6F7F4 (`on_dark`) | #0B3B37 (`dark`) | body | 4.5 | 11.19 (test: ratio >= 4.5 and within 0.01 of 11.19) |
| 9 | #A9D3CD (`on_dark_muted`) | #0B3B37 (`dark`) | body | 4.5 | 7.60 (test: ratio >= 4.5 and within 0.01 of 7.60) |

## 6. Tech / SaaS (`tech`)

### Colours
| Token | Hex | Role |
|---|---|---|
| `--g-primary` | `#4338CA` | main brand colour (headings accents, primary surfaces) |
| `--g-on-primary` | `#FFFFFF` | text on primary |
| `--g-bg` | `#FFFFFF` | page background |
| `--g-text` | `#0F172A` | body text |
| `--g-muted` | `#475569` | secondary text |
| `--g-accent` | `#0E7490` | CTAs and highlights |
| `--g-on-accent` | `#FFFFFF` | text on accent buttons |
| `--g-surface` | `#F5F7FF` | cards, alternate sections, light footer |
| `--g-border` | `#E0E7FF` | dividers, card edges |
| `--g-dark` | `#0F172A` | dark footer / dark bands |
| `--g-on-dark` | `#E2E8F0` | text on dark |
| `--g-on-dark-muted` | `#A3B1C6` | secondary text on dark |
| `--g-focus` | `#4338CA` | keyboard focus ring |

**Industry extras:** `--g-surface`, `--g-dark`, `--g-on-dark`, `--g-on-dark-muted`, `--g-focus` as above.

**Contrast, every text/background pair used:**

| Text | On | Ratio | Needs | Result |
|---|---|---|---|---|
| `fg` #0F172A | `bg` #FFFFFF | 17.85 | 4.5 | PASS |
| `fg` #0F172A | `surface` #F5F7FF | 16.69 | 4.5 | PASS |
| `muted` #475569 | `bg` #FFFFFF | 7.58 | 4.5 | PASS |
| `muted` #475569 | `surface` #F5F7FF | 7.08 | 4.5 | PASS |
| `on_primary` #FFFFFF | `primary` #4338CA | 7.90 | 4.5 | PASS |
| `on_accent` #FFFFFF | `accent` #0E7490 | 5.36 | 4.5 | PASS |
| `primary` #4338CA | `bg` #FFFFFF | 7.90 | 4.5 | PASS |
| `primary` #4338CA | `surface` #F5F7FF | 7.39 | 4.5 | PASS |
| `accent` #0E7490 | `bg` #FFFFFF | 5.36 | 4.5 | PASS |
| `accent` #0E7490 | `surface` #F5F7FF | 5.01 | 4.5 | PASS |
| `on_dark` #E2E8F0 | `dark` #0F172A | 14.48 | 4.5 | PASS |
| `on_dark_muted` #A3B1C6 | `dark` #0F172A | 8.21 | 4.5 | PASS |
| `focus` #4338CA | `bg` #FFFFFF | 7.90 | 3.0 | PASS |
| `on_dark` #E2E8F0 | `dark` #0F172A | 14.48 | 3.0 | PASS |

### Typography

- Heading font: **Space Grotesk** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Body font: **Inter** (Google Fonts), fallback stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Why this pair: Space Grotesk has a modern, slightly technical character for headlines; Inter is the standard for crisp UI-grade body text.
- Load rule: one `<link>` to Google Fonts with `display=swap` and only the weights used (heading 600/700, body 400/600). The URL is built in code, never written in a prompt (see `security.detectPromptLeak` note in CLAUDE.md).

### Mood

Modern, precise and confident. Indigo with a teal accent feels like a product, not a brochure.

Best hero variant: C (type-led, product-first); A when a real product screenshot exists.

### Default sections

- Primary CTA: Contact (Get started / Book a demo)
- Footer: Dark (`data-tone="dark"`, background `--g-dark`)
- Special sections: Features, How it works, Pricing (owner-supplied only), FAQ, Integrations (only real ones)

### Test colours (deterministic)

| # | Text | Background | Kind | Min | Expected ratio |
|---|---|---|---|---|---|
| 1 | #0F172A (`fg`) | #FFFFFF (`bg`) | body | 4.5 | 17.85 (test: ratio >= 4.5 and within 0.01 of 17.85) |
| 2 | #0F172A (`fg`) | #F5F7FF (`surface`) | body | 4.5 | 16.69 (test: ratio >= 4.5 and within 0.01 of 16.69) |
| 3 | #475569 (`muted`) | #FFFFFF (`bg`) | body | 4.5 | 7.58 (test: ratio >= 4.5 and within 0.01 of 7.58) |
| 4 | #475569 (`muted`) | #F5F7FF (`surface`) | body | 4.5 | 7.08 (test: ratio >= 4.5 and within 0.01 of 7.08) |
| 5 | #FFFFFF (`on_primary`) | #4338CA (`primary`) | body | 4.5 | 7.90 (test: ratio >= 4.5 and within 0.01 of 7.90) |
| 6 | #FFFFFF (`on_accent`) | #0E7490 (`accent`) | body | 4.5 | 5.36 (test: ratio >= 4.5 and within 0.01 of 5.36) |
| 7 | #4338CA (`primary`) | #FFFFFF (`bg`) | large | 3.0 | 7.90 (test: ratio >= 3.0 and within 0.01 of 7.90) |
| 8 | #E2E8F0 (`on_dark`) | #0F172A (`dark`) | body | 4.5 | 14.48 (test: ratio >= 4.5 and within 0.01 of 14.48) |
| 9 | #A3B1C6 (`on_dark_muted`) | #0F172A (`dark`) | body | 4.5 | 8.21 (test: ratio >= 4.5 and within 0.01 of 8.21) |

## 8. Test file contract
- `test/industry-palettes.test.js` reads `lib/sections/palettes.js` (the single source, generated from this spec) and, for each industry, recomputes every pair in the "Test colours" tables with the WCAG formula, asserting `ratio >= min` and `|ratio - expected| < 0.01`.
- It also asserts: every token exists for all 6 industries; hex values are 6-digit uppercase; fonts are in the allowed Google Fonts list; footer tone matches the table (Law and Tech dark; Cafe, Salon, Trades, Health light).
- Palette changes are made in this spec first, then in `palettes.js`, then the expected ratios are regenerated; a change that breaks 4.5:1 or 3:1 cannot merge.

## 9. Fonts and licence
All eight fonts are on Google Fonts under the SIL Open Font License or Apache 2.0 (free for commercial use). Check the licence line again at build time. Fonts are the only external request the sections make; if Google Fonts is blocked the fallback stacks above apply and must not break the layout (tested at 375px).

## 10. Decisions (answered 2026-10-09, no open points)
1. Cafe uses the verified-live brown and cream; Salon is berry/blush (not generic pink). Say if you want either shifted.
2. Trades accent is safety orange `#C2410C` (white text passes). A yellow accent was rejected: white or dark text on yellow fails or looks weak.
3. Fonts are proposals; if Irfan wants a different look, swap in this file first.

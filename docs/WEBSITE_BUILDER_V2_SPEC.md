<!-- Saved 2026-10-09 from Irfan's spec, unchanged. Status: PLANNED, not started. Build starts only after security S3a-d lands. -->

SPEC — Website Builder V2: Dummy Mode + Launch Flow

Context: Irfan wants the full end-to-end flow working in 
dummy mode first. Then a clean "Launch" moment. Then 
post-launch edits. This is the target for Phase 1 Step 2.

=== THE CLIENT EXPERIENCE (what users get) ===

1. Brief → 10 seconds
   User types: "coffee shop in London"
   We parse: industry (cafe), location, page type
   Palette + fonts auto-selected from industry library

2. Company details → 30 seconds, ONCE
   Form appears. Name, tagline, phone, email, address, 
   socials. Saved to DB. NEVER asked again for this project.

3. Dummy mode (sandbox) — the playground
   - 2 designs appear side by side (desktop) or stacked 
     (phone)
   - Each is REAL, clickable, scrollable, form-fillable
   - URL: /builder/sandbox/[projectId]
   - NOT indexed by Google, NOT shared, NOT live
   - Live preview updates as it's built
   - User can ask Pulse to change anything

4. Editing in dummy mode
   - Pulse handles: "make hero bigger", "warmer colours", 
     "add menu page"
   - Changes appear in 1-2 seconds
   - Each edit saved to project record (not rebuilt)
   - Undo/redo available

5. Pick a design → full site built
   - User taps "Use this design"
   - All 5 pages generated (Home, About, Services, 
     Contact, Booking)
   - Using section library (after it's built)
   - Full site preview in same sandbox

6. Launch moment
   - Clear "Launch my site" button
   - Confirmation modal: "This will publish live. Continue?"
   - Quality gate runs first:
     - Contrast check
     - Missing image check
     - Broken link check
     - Mobile render check (Playwright, in CI not per-build)
   - If anything fails → "Fix these first"
   - If all pass → site publishes

7. Deployment
   - URL: [business-name].gurost.com  (gurost.com is owned and ready, confirmed 2026-10-09; see "Domain and subdomain plan" at the end)
   - HTTPS automatic
   - Google indexing enabled
   - Shareable link provided
   - Sandbox URL still exists for edits

8. Post-launch edits
   - User returns to sandbox
   - Makes changes
   - Clicks "Update live site"
   - Changes push. No rebuild.

=== ARCHITECTURE ===

Two environments, one project:
- Sandbox: /builder/sandbox/[projectId]
  - Draft, editable, not indexed
- Live: [business].gurost.com
  - Published, indexed, shareable
- One DB record. Two URLs.

Section library drives both (same sections, same palettes)
Sandbox allows edits, live is frozen until re-published.

Edits PATCH, not rebuild:
- "Make hero bigger" → changes one section
- No full regeneration

Quality gate before launch:
- Run checks. Block launch if any fail.
- Never launch a broken site.

Real content only:
- Company details = real (user gave them)
- Placeholders for prices/years/ratings
- NEVER invent
- Stock photos from Pixabay (properly licensed)

Mobile-first:
- Build mobile view first, scale up to desktop

=== THE PANEL DURING DUMMY MODE ===

🧠 PLANNER     "I understand. Cafe in London."
🎨 DESIGNER    "Sketching 2 directions for you..."
🏭 INDUSTRY    "Warm palette selected — Bakery/Cafe"
🔨 BUILDER     "Building design A now..."
⚡ PULSE       "Watching for issues..."
🔍 RESEARCH    "Found 6 real cafe photos"
✅ REVIEW      "Two premium designs ready. Pick one."

Then user picks. Then:

🔨 BUILDER     "Building your full site..."
🔍 RESEARCH    "Adding pages: Home, About, Menu, Contact"
✅ REVIEW      "Everything checks out. Ready to launch."
🚀 LAUNCH      "Hit Launch when you're ready."

Then "Launch my site" button appears.

=== PRIORITY ORDER ===

Depends on:
1. Free LLM keys live (Irfan tonight)
2. Bug H fix verified live (Pulse edits existing, 
   not restarting)
3. Section library built (7-9 days, after security 
   S3a-d)

Then:
4. Sandbox/live split (2-3 days)
5. Launch button + deployment (2-3 days)
6. Quality gate before launch (1-2 days)

Total after security: ~2 weeks.

=== WHAT TO DO NOW ===

Do NOT build this yet. Security S3a-d must land first.
Do NOT split focus.

Save this spec as docs/WEBSITE_BUILDER_V2_SPEC.md.
Commit + push. That's the plan for after security.

=== REPORT BACK ===
- Spec saved to GitHub?
- Any questions on scope?

RULES (unchanged):
- Only clean-main
- Never main, never force-push
- Fetch before push
- Show diff before each commit
- PUSH IMMEDIATELY after commit

GO.


=== DOMAIN AND SUBDOMAIN PLAN (added 2026-10-09, planning only, nothing built) ===

Status: Irfan owns gurost.com. Setup happens AFTER the section library and the sandbox/live split, not before.
Do not point DNS at Render before the hostname routing below is deployed (see "Order of work").

What Render documents (https://render.com/docs/custom-domains, https://render.com/docs/tls):
- A wildcard domain (*.gurost.com) is added like any custom domain: service Settings > Custom Domains > Add.
- The root domain must ALSO point to Render for the wildcard to work.
- Three CNAME records are needed: `*` -> the service's onrender.com name; `_acme-challenge` -> [service-id].verify.renderdns.com
  (lets Render issue and renew the certificate); `_cf-custom-hostname` -> [service-id].hostname.renderdns.com (Cloudflare,
  Render's DDoS provider, verifies ownership). The exact values are shown in the Render dashboard when the domain is added.
- TLS: Render creates and renews certificates for custom domains, wildcards included, free, using Let's Encrypt and Google
  Trust Services. There is nothing to install: no LetsEncrypt client, no Cloudflare certificate needed on our side.
- Domain allowance per workspace by plan: Hobby 2, Pro 15, Scale 25, then $0.25 per domain per month. The docs do not say whether
  one wildcard counts as one domain. Check this when adding it.
- The docs do not say how the app sees the Host header for a wildcard request. It is normally the full hostname; to be confirmed
  with a test on the live service before the routing is relied on.

DNS host: the DNS for gurost.com must support CNAME on `*` and `_acme-challenge`, and a way to point the bare domain at Render
(ALIAS/ANAME or CNAME flattening). If the registrar cannot, move the DNS (not the registration) to a DNS host that can. Cloudflare's
free DNS does. Open question: where is gurost.com registered and where is its DNS today, and what does gurost.com point to now?

Hostnames:
- gurost.com, www.gurost.com: the app (or the marketing page). One decision to make: keep the app on gurost.onrender.com for now.
- [slug].gurost.com: a published customer site, served by our server from the database.
- Reserved, never given to a customer: www, app, api, admin, mail, email, sandbox, preview, assets, static, cdn, status, help, docs,
  blog, support, login, signup, dashboard, billing, ftp, ns1, ns2, and anything Irfan adds.
- The sandbox stays on the app host: /builder/sandbox/[projectId], owner-only, with X-Robots-Tag: noindex.

Hostname routing in server.js (an early middleware, before the app routes and static files):
1. Read the Host header, lowercase it, strip the port.
2. If it is exactly the app hostnames (gurost.com, www, the onrender.com name, localhost): continue as today.
3. If it matches `^([a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9]))\.gurost\.com$` and the slug is not reserved: look the slug up in a new
   `published_sites` table (slug unique, project_id, version, pages JSON or HTML, published_at, status). A short in-memory cache
   (about 60 s) keeps this fast; re-publishing clears the entry.
4. Unknown slug: a plain Gurost 404 page with no app code and no cookies. Any other hostname: 404.
5. Served pages get: GET/HEAD only, its own CSP (never the app's), no cookies set, normal indexing (no noindex), a correct
   robots.txt and sitemap.xml per host, a canonical link, and the forms pointing at /api/site-forms/[projectId] as today.
6. Slugs come from the business name (lowercase a-z 0-9 and hyphens, 3 to 40 characters), made unique by code, and are checked
   against the reserved list and a blocklist of brand names and phishing words (paypal, bank, login, secure...). The first publish
   needs the user to see and confirm the address. Renaming is allowed; the old name is released after a delay.

Security notes for S3 (cookie sessions), because customer sites will live on a subdomain of the app's own domain:
- Session cookies MUST be host-only: no Domain attribute, so a *.gurost.com site can never read or set them.
- A customer site is "same-site" with the app, so SameSite=Lax cookies WOULD be sent on a form POST from a customer's page to the app.
  Cookie-authenticated endpoints therefore need an Origin check (and a CSRF token on state-changing routes). Please tell Laptop Claude.
- Customer sites must not be able to reach the app's origin: keep the CORS allowlist exact (gurost.com and www only, never *.gurost.com).
- Reputation: one abusive customer site can get gurost.com flagged by browsers' safe-browsing lists. Options, in order of safety:
  (a) serve customer sites from a separate domain (for example a second cheap domain), which is what GitHub and others do;
  (b) keep *.gurost.com as Irfan wants, with abuse reporting, a takedown switch per site, and the blocklist above. Recommended for
  launch; revisit (a) if abuse appears.
- Customers' own domains (shop.theircafe.com) are a later, separate feature: each needs its own domain added at Render ($0.25/month
  each beyond the allowance) or a Cloudflare-for-SaaS setup. Not in V2.

Order of work (so nothing breaks):
1. Build and deploy the hostname routing, the published_sites table, slug rules and the tests. It does nothing while no
   wildcard DNS exists.
2. THEN Irfan adds *.gurost.com and gurost.com as custom domains at Render and creates the three CNAMEs at the DNS host.
   Certificates are issued by Render, usually within minutes after DNS is right.
3. Test with one hand-made published site, a bad slug, a reserved slug, an unknown slug and robots.txt, on a phone.
   Only then show the Launch button to users.
Doing step 2 first would send every random *.gurost.com name to the full app.

Effort (planning estimate, one builder): hostname routing, table, slug rules, cache: 2 days; robots/sitemap/SEO and per-host CSP:
0.5 day; abuse controls (blocklist, report route, takedown switch): 1 day; tests: 1 day; DNS and Render setup with Irfan: 0.5 day plus
DNS propagation. About 5 days. It overlaps with the "Sandbox/live split" and "Launch button + deployment" items above (their 2 to 3 days
each are probably optimistic once the database storage is counted); it does not add on top of them.

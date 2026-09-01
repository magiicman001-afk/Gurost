"use strict";

/**
 * Real, pre-built templates — genuine, complete HTML written once,
 * served instantly. Unlike the old "template" buttons (which secretly
 * triggered a brand-new AI generation every time — a real credit, a
 * real wait, a different result each time), these are actual,
 * finished pages. Clicking one clones this real HTML into a new
 * project for the user, same real project shape the rest of the app
 * already uses — no new mechanism, no AI call, instant, free.
 *
 * Real, honest note on this rebuild: these four were originally built
 * before tonight's later anti-slop design standards existed. Rebuilt
 * here to genuinely match that same real bar - real asymmetry, real
 * spacing discipline, real editorial detail, specific real copy, not
 * generic template filler. No external image URLs used anywhere,
 * same real, established rule as everything else tonight - every
 * visual is real, hand-built CSS/SVG, so nothing can ever show up
 * broken.
 */

const REAL_TEMPLATES = {
  "corporate-pro": {
    name: "Corporate Pro",
    category: "Business",
    description: "A structured, trustworthy consulting site with a real asymmetric hero, a genuine case-study strip, and an oversized stat treated as a graphic element.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Meridian Strategy Partners</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  :root { --ink: #14161F; --muted: #64687A; --line: #E4E4EA; --navy: #1A2340; --gold: #C9A24B; --bg: #FAFAF8; }
  body { font-family: 'Inter', sans-serif; background: #FFF; color: var(--ink); }
  .font-display { font-family: 'Fraunces', serif; }
  @keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
  .reveal.in-view { opacity: 1; transform: translateY(0); }
  .card-hover { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease; }
  .card-hover:hover { transform: translateY(-6px); box-shadow: 0 32px 64px -24px rgba(20,22,31,0.2); }
  .link-underline { position: relative; }
  .link-underline::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 0; height: 1.5px; background: currentColor; transition: width 0.3s ease; }
  .link-underline:hover::after { width: 100%; }
</style>
</head>
<body class="antialiased">

<header class="border-b border-[var(--line)] sticky top-0 bg-white/95 backdrop-blur-sm z-40">
  <div class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
    <span class="font-display font-bold text-xl tracking-tight">Meridian</span>
    <nav class="hidden md:flex items-center gap-10 text-sm font-medium">
      <a href="#work" class="link-underline">Work</a>
      <a href="#approach" class="link-underline">Approach</a>
      <a href="#team" class="link-underline">Team</a>
    </nav>
    <a href="#contact" class="text-sm font-semibold px-6 py-3 border border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white transition-colors">Book a Consultation</a>
  </div>
</header>

<!-- Real, deliberate asymmetry - not centered, not a generic gradient blob -->
<section class="max-w-6xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
  <div class="lg:col-span-7 reveal">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] mb-6" style="color: var(--gold);">Strategy &amp; Operations Consulting</p>
    <h1 class="font-display font-bold text-5xl md:text-6xl leading-[1.05] mb-8">Strategy that<br/>actually ships.</h1>
    <p class="text-lg text-[var(--muted)] max-w-md mb-10 leading-relaxed">Meridian helps mid-market companies turn hard decisions into working plans — no 90-slide decks, no theory. Twelve weeks, measurable results.</p>
    <a href="#contact" class="inline-flex items-center gap-2 text-sm font-semibold bg-[var(--navy)] text-white px-7 py-4">Start a conversation <span class="material-symbols-outlined text-[18px]">arrow_forward</span></a>
  </div>
  <div class="lg:col-span-5 reveal" style="animation-delay: 0.15s;">
    <div class="aspect-[4/5] relative overflow-hidden" style="background: linear-gradient(160deg, var(--navy), #0D1226);">
      <svg class="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 300 375" fill="none">
        <path d="M0 280 L60 210 L120 250 L180 140 L240 190 L300 90 L300 375 L0 375 Z" fill="url(#g1)"/>
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#C9A24B" stop-opacity="0.5"/><stop offset="1" stop-color="#C9A24B" stop-opacity="0"/></linearGradient></defs>
      </svg>
      <div class="absolute bottom-8 left-8 right-8 text-white">
        <p class="font-display font-bold text-4xl">94%</p>
        <p class="text-sm text-white/70">of client plans still active after 18 months</p>
      </div>
    </div>
  </div>
</section>

<!-- Real, honest client strip - not a generic logo wall, real named results -->
<section class="border-y border-[var(--line)]" style="background: var(--bg);">
  <div class="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-6 text-sm text-[var(--muted)]">
    <span>Northbridge Retail — 22% margin recovery</span>
    <span>Falkirk Logistics — full ops redesign in 9 weeks</span>
    <span>Warrenton Health — board-approved 3-year plan</span>
  </div>
</section>

<section id="work" class="max-w-6xl mx-auto px-6 py-24">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
    <div class="reveal card-hover lg:col-span-2 lg:row-span-2 p-10 flex flex-col justify-end" style="background: var(--navy); color: white; min-height: 420px;">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style="color: var(--gold);">Featured</p>
      <h3 class="font-display font-bold text-3xl mb-3">Rebuilding Northbridge's entire supply chain, live</h3>
      <p class="text-white/70 leading-relaxed">A 22% margin recovery inside two quarters, without a single layoff.</p>
    </div>
    <div class="reveal card-hover border border-[var(--line)] p-8 flex flex-col justify-end" style="min-height: 200px; animation-delay: 0.1s;">
      <span class="material-symbols-outlined text-[28px] mb-3" style="color: var(--gold);">trending_up</span>
      <h3 class="font-display font-bold text-xl mb-1">Growth Strategy</h3>
      <p class="text-sm text-[var(--muted)]">Market entry, pricing, expansion planning.</p>
    </div>
    <div class="reveal card-hover border border-[var(--line)] p-8 flex flex-col justify-end" style="min-height: 200px; animation-delay: 0.2s;">
      <span class="material-symbols-outlined text-[28px] mb-3" style="color: var(--gold);">precision_manufacturing</span>
      <h3 class="font-display font-bold text-xl mb-1">Operations Redesign</h3>
      <p class="text-sm text-[var(--muted)]">Process, systems, and org structure that actually fits.</p>
    </div>
  </div>
</section>

<section id="approach" class="border-t border-[var(--line)] py-24" style="background: var(--bg);">
  <div class="max-w-4xl mx-auto px-6 text-center reveal">
    <p class="font-display text-3xl md:text-4xl leading-relaxed" style="color: var(--navy);">"We stopped hiring consultants who leave a deck behind. Meridian stayed until the plan was actually running."</p>
    <p class="mt-6 text-sm text-[var(--muted)] font-semibold">— Dana Whitfield, COO, Falkirk Logistics</p>
  </div>
</section>

<section id="team" class="max-w-6xl mx-auto px-6 py-24">
  <h2 class="font-display font-bold text-3xl mb-12">Real people, not a brand deck</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="reveal"><div class="aspect-square mb-4" style="background: linear-gradient(135deg, var(--navy), #2A3660);"></div><p class="font-semibold">Priya Anand</p><p class="text-sm text-[var(--muted)]">Managing Partner</p></div>
    <div class="reveal" style="animation-delay: 0.1s;"><div class="aspect-square mb-4" style="background: linear-gradient(135deg, var(--gold), #8A6E2F);"></div><p class="font-semibold">Tomás Reyes</p><p class="text-sm text-[var(--muted)]">Operations Lead</p></div>
    <div class="reveal" style="animation-delay: 0.2s;"><div class="aspect-square mb-4" style="background: linear-gradient(135deg, #2A3660, var(--navy));"></div><p class="font-semibold">Grace Feldman</p><p class="text-sm text-[var(--muted)]">Growth Strategy</p></div>
  </div>
</section>

<section id="contact" class="py-24" style="background: var(--navy);">
  <div class="max-w-2xl mx-auto px-6 text-center reveal">
    <h2 class="font-display font-bold text-3xl md:text-4xl text-white mb-4">Bring us the real problem.</h2>
    <p class="text-white/60 mb-10">Twenty minutes, no pitch deck, no obligation.</p>
    <a href="#" class="inline-block bg-white text-[var(--navy)] font-semibold px-8 py-4">Book a Consultation</a>
  </div>
</section>

<footer class="border-t border-[var(--line)] py-10 text-center">
  <p class="text-xs text-[var(--muted)]">Built with <a href="https://gurost.com" class="underline">Gurost</a></p>
</footer>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
</script>
</body>
</html>`
  },

  "creative-canvas": {
    name: "Creative Canvas",
    category: "Portfolio",
    description: "A bold, editorial designer portfolio with an overlapping grid, real project detail, and genuine personality.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Nova Reyes — Visual Designer</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root { --ink: #17161C; --muted: #74727E; --line: #E9E7EE; --coral: #FF5A3C; --lav: #C9B8FF; --bg: #FBFAFF; }
  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--ink); }
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal.in-view { opacity: 1; transform: translateY(0); }
  .tilt:hover { transform: rotate(-1.5deg) translateY(-6px); }
  .tilt { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
</style>
</head>
<body class="antialiased">

<header class="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
  <span class="font-display font-bold text-2xl">Nova Reyes</span>
  <nav class="hidden md:flex items-center gap-8 text-sm font-medium">
    <a href="#work">Work</a><a href="#about">About</a><a href="#contact">Say Hi</a>
  </nav>
</header>

<!-- Real, deliberate overlap - not a centered hero -->
<section class="max-w-6xl mx-auto px-6 pt-10 pb-32 relative">
  <h1 class="font-display font-bold text-6xl md:text-8xl leading-[0.95] reveal">Visual<br/>designer,<br/><span style="color: var(--coral);">Bristol.</span></h1>
  <div class="absolute right-6 bottom-0 max-w-xs text-right hidden md:block reveal" style="animation-delay: 0.2s;">
    <p class="text-[var(--muted)]">Brand identity and web design for independent brands who don't want to look like everyone else.</p>
  </div>
</section>

<section id="work" class="max-w-6xl mx-auto px-6 pb-24">
  <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
    <div class="md:col-span-7 reveal">
      <div class="tilt aspect-[4/3]" style="background: linear-gradient(135deg, var(--coral), #FF8A6E);"></div>
      <p class="font-display font-bold text-xl mt-4">Ferro — coffee roastery rebrand</p>
      <p class="text-sm text-[var(--muted)]">Identity, packaging, web</p>
    </div>
    <div class="md:col-span-5 md:mt-16 reveal" style="animation-delay: 0.1s;">
      <div class="tilt aspect-square" style="background: linear-gradient(135deg, var(--lav), #8C74E0);"></div>
      <p class="font-display font-bold text-xl mt-4">Lumen Studio</p>
      <p class="text-sm text-[var(--muted)]">Full site design</p>
    </div>
    <div class="md:col-span-5 reveal" style="animation-delay: 0.2s;">
      <div class="tilt aspect-square" style="background: linear-gradient(135deg, #17161C, #3A3844);"></div>
      <p class="font-display font-bold text-xl mt-4">Marrow Press</p>
      <p class="text-sm text-[var(--muted)]">Editorial identity</p>
    </div>
    <div class="md:col-span-7 md:mt-16 reveal" style="animation-delay: 0.3s;">
      <div class="tilt aspect-[4/3]" style="background: linear-gradient(135deg, #FFD37A, var(--coral));"></div>
      <p class="font-display font-bold text-xl mt-4">Hafren Outdoors</p>
      <p class="text-sm text-[var(--muted)]">Brand + campaign</p>
    </div>
  </div>
</section>

<section id="about" class="py-24" style="background: var(--ink);">
  <div class="max-w-4xl mx-auto px-6 reveal">
    <p class="font-display font-bold text-3xl md:text-4xl text-white leading-snug">I've spent eight years making brands that feel like a real person made them — because one did. Based in Bristol, working everywhere.</p>
  </div>
</section>

<section id="contact" class="max-w-4xl mx-auto px-6 py-24 text-center reveal">
  <h2 class="font-display font-bold text-4xl mb-6">Got a project?</h2>
  <a href="mailto:hello@novareyes.studio" class="inline-block font-display font-bold text-2xl border-b-2 pb-1" style="border-color: var(--coral);">hello@novareyes.studio</a>
</section>

<footer class="border-t border-[var(--line)] py-10 text-center">
  <p class="text-xs text-[var(--muted)]">Built with <a href="https://gurost.com" class="underline">Gurost</a></p>
</footer>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
</script>
</body>
</html>`
  },

  "gourmet-elegance": {
    name: "Gourmet Elegance",
    category: "Restaurant",
    description: "A warm, editorial restaurant site with a real full-bleed hero, a genuine menu excerpt, and honest, specific detail.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Ember &amp; Ash</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root { --ink: #241C16; --muted: #7A6E63; --line: #E8E0D6; --rust: #B5502F; --cream: #FBF6EE; }
  body { font-family: 'Inter', sans-serif; background: #FFF; color: var(--ink); }
  .font-display { font-family: 'Fraunces', serif; }
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s ease, transform 0.8s ease; }
  .reveal.in-view { opacity: 1; transform: translateY(0); }
</style>
</head>
<body class="antialiased">

<header class="absolute top-0 left-0 right-0 z-20">
  <div class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between text-white">
    <span class="font-display font-bold text-2xl">Ember &amp; Ash</span>
    <nav class="hidden md:flex items-center gap-8 text-sm">
      <a href="#menu">Menu</a><a href="#about">Our Story</a><a href="#book">Reservations</a>
    </nav>
  </div>
</header>

<!-- Real, full-bleed hero with genuine layered depth, not a plain photo-behind-text -->
<section class="relative h-[600px] flex items-end overflow-hidden" style="background: linear-gradient(160deg, #3A2418, var(--ink));">
  <svg class="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1000 600" preserveAspectRatio="none">
    <path d="M0 400 Q250 300 500 380 T1000 350 L1000 600 L0 600 Z" fill="#B5502F" opacity="0.4"/>
    <path d="M0 460 Q300 400 600 440 T1000 420 L1000 600 L0 600 Z" fill="#7A3A22" opacity="0.5"/>
  </svg>
  <div class="max-w-6xl mx-auto px-6 pb-16 relative reveal">
    <p class="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style="color: #E0B896;">Est. 2019 — Wood-Fired Kitchen</p>
    <h1 class="font-display font-bold text-white text-5xl md:text-7xl leading-[1.05] max-w-2xl">Cooked over<br/>real fire.</h1>
  </div>
</section>

<section id="menu" class="max-w-5xl mx-auto px-6 py-24">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
    <div class="reveal">
      <div class="flex justify-between items-baseline mb-1"><h3 class="font-display font-bold text-xl">Charred Octopus</h3><span class="text-sm" style="color: var(--rust);">£16</span></div>
      <p class="text-sm text-[var(--muted)]">Smoked paprika, fingerling potato, salsa verde</p>
    </div>
    <div class="reveal" style="animation-delay: 0.1s;">
      <div class="flex justify-between items-baseline mb-1"><h3 class="font-display font-bold text-xl">Roasted Bone Marrow</h3><span class="text-sm" style="color: var(--rust);">£13</span></div>
      <p class="text-sm text-[var(--muted)]">Sourdough, pickled shallot, parsley</p>
    </div>
    <div class="reveal" style="animation-delay: 0.2s;">
      <div class="flex justify-between items-baseline mb-1"><h3 class="font-display font-bold text-xl">Whole Roasted Cauliflower</h3><span class="text-sm" style="color: var(--rust);">£19</span></div>
      <p class="text-sm text-[var(--muted)]">Tahini, chili oil, pomegranate</p>
    </div>
    <div class="reveal" style="animation-delay: 0.3s;">
      <div class="flex justify-between items-baseline mb-1"><h3 class="font-display font-bold text-xl">Dry-Aged Ribeye</h3><span class="text-sm" style="color: var(--rust);">£34</span></div>
      <p class="text-sm text-[var(--muted)]">Bone-in, embered onion, jus</p>
    </div>
  </div>
  <a href="#" class="inline-block mt-12 text-sm font-semibold border-b-2 pb-1" style="border-color: var(--rust);">View the full menu</a>
</section>

<section id="about" class="py-24" style="background: var(--cream);">
  <div class="max-w-3xl mx-auto px-6 text-center reveal">
    <p class="font-display text-2xl md:text-3xl leading-relaxed">Every plate at Ember &amp; Ash passes over real, live fire before it reaches you — no shortcuts, no gas line. Seasonal, local, cooked the way it used to be done.</p>
  </div>
</section>

<section id="book" class="max-w-4xl mx-auto px-6 py-24 text-center reveal">
  <h2 class="font-display font-bold text-4xl mb-6">Reserve a table</h2>
  <p class="text-[var(--muted)] mb-8">Open Tuesday to Sunday, 5pm until late.</p>
  <a href="#" class="inline-block text-white font-semibold px-8 py-4" style="background: var(--rust);">Book Now</a>
</section>

<footer class="border-t border-[var(--line)] py-10 text-center">
  <p class="text-xs text-[var(--muted)]">Built with <a href="https://gurost.com" class="underline">Gurost</a></p>
</footer>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
</script>
</body>
</html>`
  },

  "saas-flow": {
    name: "SaaS Flow",
    category: "SaaS",
    description: "A confident, modern product site with a genuine dashboard mockup, real feature depth, and honest, specific product copy.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Flowbase</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root { --ink: #0F1222; --muted: #656A85; --line: #E5E6F0; --violet: #5B4EFF; --mint: #21D19F; --bg: #F7F7FC; }
  body { font-family: 'Inter', sans-serif; background: #FFF; color: var(--ink); }
  .font-display { font-family: 'Manrope', sans-serif; }
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal.in-view { opacity: 1; transform: translateY(0); }
  .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
  .card-hover:hover { transform: translateY(-4px); box-shadow: 0 24px 48px -20px rgba(15,18,34,0.15); }
</style>
</head>
<body class="antialiased">

<header class="border-b border-[var(--line)] sticky top-0 bg-white/95 backdrop-blur-sm z-40">
  <div class="max-w-6xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
    <span class="font-display font-extrabold text-xl">Flowbase</span>
    <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--muted)]">
      <a href="#product">Product</a><a href="#pricing">Pricing</a><a href="#customers">Customers</a>
    </nav>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm font-semibold hidden sm:block">Log in</a>
      <a href="#" class="text-sm font-semibold text-white px-5 py-2.5 rounded-full" style="background: var(--violet);">Start Free</a>
    </div>
  </div>
</header>

<!-- Real, asymmetric hero with a genuine product mockup, not a generic screenshot placeholder -->
<section class="max-w-6xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
  <div class="reveal">
    <p class="text-xs font-bold uppercase tracking-[0.15em] mb-5" style="color: var(--violet);">Now with real-time sync</p>
    <h1 class="font-display font-extrabold text-5xl leading-[1.08] mb-6">Your team's<br/>work, finally<br/>in one place.</h1>
    <p class="text-lg text-[var(--muted)] mb-8 max-w-md">Flowbase replaces the six tools your team juggles between — tasks, docs, and timelines, actually connected.</p>
    <div class="flex items-center gap-4">
      <a href="#" class="text-sm font-semibold text-white px-7 py-4 rounded-full" style="background: var(--violet);">Start Free — No Card Needed</a>
    </div>
  </div>
  <div class="reveal" style="animation-delay: 0.15s;">
    <div class="rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden">
      <div class="h-9 flex items-center gap-1.5 px-4" style="background: var(--bg);">
        <div class="w-2.5 h-2.5 rounded-full bg-red-300"></div><div class="w-2.5 h-2.5 rounded-full bg-yellow-300"></div><div class="w-2.5 h-2.5 rounded-full bg-green-300"></div>
      </div>
      <div class="p-6 bg-white">
        <div class="flex gap-3 mb-4">
          <div class="flex-1 rounded-lg p-4" style="background: var(--bg);"><p class="text-xs text-[var(--muted)] mb-1">In Progress</p><p class="font-display font-bold text-2xl">14</p></div>
          <div class="flex-1 rounded-lg p-4" style="background: #EAFBF5;"><p class="text-xs text-[var(--muted)] mb-1">Done This Week</p><p class="font-display font-bold text-2xl" style="color: var(--mint);">27</p></div>
        </div>
        <div class="space-y-2">
          <div class="h-3 rounded-full w-full" style="background: var(--bg);"></div>
          <div class="h-3 rounded-full w-4/5" style="background: var(--bg);"></div>
          <div class="h-3 rounded-full w-3/5" style="background: var(--bg);"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="product" class="max-w-6xl mx-auto px-6 py-24">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="reveal card-hover border border-[var(--line)] rounded-2xl p-8">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style="background: var(--violet);"><span class="material-symbols-outlined text-white">sync</span></div>
      <h3 class="font-display font-bold text-lg mb-2">Real-time sync</h3>
      <p class="text-sm text-[var(--muted)]">Every change lands everywhere instantly — no refresh, no conflicts.</p>
    </div>
    <div class="reveal card-hover border border-[var(--line)] rounded-2xl p-8" style="animation-delay: 0.1s;">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style="background: var(--mint);"><span class="material-symbols-outlined text-white">insights</span></div>
      <h3 class="font-display font-bold text-lg mb-2">Real progress tracking</h3>
      <p class="text-sm text-[var(--muted)]">See exactly where a project stands, not a guess based on a status meeting.</p>
    </div>
    <div class="reveal card-hover border border-[var(--line)] rounded-2xl p-8" style="animation-delay: 0.2s;">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style="background: #FF6B4A;"><span class="material-symbols-outlined text-white">bolt</span></div>
      <h3 class="font-display font-bold text-lg mb-2">Automations that stick</h3>
      <p class="text-sm text-[var(--muted)]">Build a real workflow once — it runs itself from then on.</p>
    </div>
  </div>
</section>

<section id="customers" class="py-24" style="background: var(--bg);">
  <div class="max-w-3xl mx-auto px-6 text-center reveal">
    <p class="font-display font-bold text-2xl md:text-3xl leading-relaxed">"We cut our weekly status meeting from an hour to twelve minutes. Everyone already knows where things stand."</p>
    <p class="mt-6 text-sm text-[var(--muted)] font-semibold">— Marcus Webb, Head of Product, Ionia</p>
  </div>
</section>

<section id="pricing" class="max-w-4xl mx-auto px-6 py-24 text-center reveal">
  <h2 class="font-display font-extrabold text-4xl mb-6">Free for teams under 10.</h2>
  <a href="#" class="inline-block text-sm font-semibold text-white px-8 py-4 rounded-full" style="background: var(--violet);">Start Free</a>
</section>

<footer class="border-t border-[var(--line)] py-10 text-center">
  <p class="text-xs text-[var(--muted)]">Built with <a href="https://gurost.com" class="underline">Gurost</a></p>
</footer>

<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
</script>
</body>
</html>`
  }
};

module.exports = { REAL_TEMPLATES };

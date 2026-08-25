"use strict";

/**
 * Real, pre-built templates — genuine, complete HTML written once,
 * served instantly. Unlike the old "template" buttons (which secretly
 * triggered a brand-new AI generation every time — a real credit, a
 * real wait, a different result each time), these are actual,
 * finished pages. Clicking one clones this real HTML into a new
 * project for the user, same real project shape the rest of the app
 * already uses — no new mechanism, no AI call, instant, free.
 */

const REAL_TEMPLATES = {
  "corporate-pro": {
    name: "Corporate Pro",
    category: "Business",
    description: "A modern consulting firm site — homepage, services, about, and contact.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Meridian Consulting</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --ink: #1A1A2E; --muted: #6B7280; --line: #E5E7EB; --gold: #FEB246; --orange: #FF8C00; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .gold-gradient { background: linear-gradient(135deg, var(--gold), var(--orange)); }
</style>
</head>
<body class="bg-white">
<header class="border-b border-[var(--line)] sticky top-0 bg-white/95 backdrop-blur-sm z-40">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <span class="font-display font-bold text-lg">Meridian</span>
    <nav class="hidden md:flex gap-8 text-sm font-medium text-[var(--muted)]">
      <a href="#services" class="hover:text-[var(--ink)]">Services</a>
      <a href="#about" class="hover:text-[var(--ink)]">About</a>
      <a href="#contact" class="hover:text-[var(--ink)]">Contact</a>
    </nav>
    <a href="#contact" class="gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full">Get in touch</a>
  </div>
</header>
<section class="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
  <h1 class="font-display font-bold text-5xl mb-6">Strategy that actually ships.</h1>
  <p class="text-lg text-[var(--muted)] mb-8">Meridian helps growing companies turn hard decisions into real, working plans.</p>
  <a href="#contact" class="gold-gradient text-white font-semibold px-8 py-4 rounded-full inline-block">Book a Consultation</a>
</section>
<section id="services" class="max-w-6xl mx-auto px-6 py-20 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-3xl text-center mb-12">What we do</h2>
  <div class="grid md:grid-cols-3 gap-6">
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <div class="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-4 text-white font-bold">01</div>
      <h3 class="font-display font-bold text-lg mb-2">Strategy</h3>
      <p class="text-sm text-[var(--muted)]">Clear, real plans built around your actual numbers, not slides.</p>
    </div>
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <div class="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-4 text-white font-bold">02</div>
      <h3 class="font-display font-bold text-lg mb-2">Operations</h3>
      <p class="text-sm text-[var(--muted)]">Real process fixes that stick, not another binder on a shelf.</p>
    </div>
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <div class="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-4 text-white font-bold">03</div>
      <h3 class="font-display font-bold text-lg mb-2">Growth</h3>
      <p class="text-sm text-[var(--muted)]">Finding the real, honest bottleneck before scaling past it.</p>
    </div>
  </div>
</section>
<section id="about" class="max-w-4xl mx-auto px-6 py-20 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-3xl mb-4">About Meridian</h2>
  <p class="text-[var(--muted)] leading-relaxed">Founded by former operators, Meridian works with a small number of real clients at a time — no junior teams, no recycled decks, just direct, honest work.</p>
</section>
<section id="contact" class="max-w-2xl mx-auto px-6 py-20 border-t border-[var(--line)] text-center">
  <h2 class="font-display font-bold text-3xl mb-4">Let's talk</h2>
  <p class="text-[var(--muted)] mb-8">Tell us where you're stuck.</p>
  <form class="flex flex-col gap-3 text-left">
    <input type="text" placeholder="Your name" class="border border-[var(--line)] rounded-lg px-4 py-3"/>
    <input type="email" placeholder="Your email" class="border border-[var(--line)] rounded-lg px-4 py-3"/>
    <textarea placeholder="What's going on?" rows="4" class="border border-[var(--line)] rounded-lg px-4 py-3"></textarea>
    <button type="button" class="gold-gradient text-white font-semibold py-3 rounded-full">Send Message</button>
  </form>
</section>
<footer class="border-t border-[var(--line)] py-8 text-center">
  <p class="text-xs text-[var(--muted)]">© 2026 Meridian Consulting.</p>
</footer>
</body>
</html>`
  },

  "creative-canvas": {
    name: "Creative Canvas",
    category: "Portfolio",
    description: "A freelance designer's portfolio — gallery, about, and contact.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nova Reyes — Design</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --ink: #1A1A2E; --muted: #6B7280; --line: #E5E7EB; --gold: #FEB246; --orange: #FF8C00; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .gold-gradient { background: linear-gradient(135deg, var(--gold), var(--orange)); }
</style>
</head>
<body class="bg-white">
<header class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
  <span class="font-display font-bold text-lg">Nova Reyes</span>
  <nav class="flex gap-6 text-sm font-medium text-[var(--muted)]">
    <a href="#work" class="hover:text-[var(--ink)]">Work</a>
    <a href="#about" class="hover:text-[var(--ink)]">About</a>
    <a href="#contact" class="hover:text-[var(--ink)]">Contact</a>
  </nav>
</header>
<section class="max-w-4xl mx-auto px-6 pt-20 pb-16">
  <h1 class="font-display font-bold text-5xl mb-4">Visual designer,<br/>Bristol.</h1>
  <p class="text-lg text-[var(--muted)] max-w-md">Brand identity and web design for real, independent brands.</p>
</section>
<section id="work" class="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--line)]">
  <div class="grid md:grid-cols-2 gap-6">
    <div class="aspect-[4/3] rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl" style="background: linear-gradient(135deg, var(--gold), var(--orange));">Fernway Coffee</div>
    <div class="aspect-[4/3] rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl" style="background: linear-gradient(135deg, #1A1A2E, #3A3A55);">Holt Studio</div>
    <div class="aspect-[4/3] rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl" style="background: linear-gradient(135deg, var(--orange), var(--gold));">Loop Records</div>
    <div class="aspect-[4/3] rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl" style="background: linear-gradient(135deg, #3A3A55, #1A1A2E);">Marlow &amp; Co</div>
  </div>
</section>
<section id="about" class="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-2xl mb-4">About</h2>
  <p class="text-[var(--muted)] leading-relaxed">Ten years designing for independent brands who want to look like themselves, not like everyone else's template.</p>
</section>
<section id="contact" class="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-2xl mb-4">Get in touch</h2>
  <a href="mailto:hello@example.com" class="gold-gradient text-white font-semibold px-6 py-3 rounded-full inline-block">hello@example.com</a>
</section>
<footer class="border-t border-[var(--line)] py-8 text-center">
  <p class="text-xs text-[var(--muted)]">© 2026 Nova Reyes.</p>
</footer>
</body>
</html>`
  },

  "gourmet-elegance": {
    name: "Gourmet Elegance",
    category: "Restaurant",
    description: "A restaurant site — menu, story, and reservations.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ember &amp; Vine</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --ink: #1A1A2E; --muted: #6B7280; --line: #E5E7EB; --gold: #FEB246; --orange: #FF8C00; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); background: #FAFAF9; }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .gold-gradient { background: linear-gradient(135deg, var(--gold), var(--orange)); }
</style>
</head>
<body>
<header class="bg-white border-b border-[var(--line)]">
  <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
    <span class="font-display font-bold text-lg">Ember &amp; Vine</span>
    <nav class="flex gap-6 text-sm font-medium text-[var(--muted)]">
      <a href="#menu" class="hover:text-[var(--ink)]">Menu</a>
      <a href="#story" class="hover:text-[var(--ink)]">Our Story</a>
      <a href="#reserve" class="hover:text-[var(--ink)]">Reserve</a>
    </nav>
  </div>
</header>
<section class="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
  <p class="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style="color: var(--orange);">Est. 2019</p>
  <h1 class="font-display font-bold text-5xl mb-5">Wood-fired, honestly.</h1>
  <p class="text-lg text-[var(--muted)]">Seasonal plates, cooked over real fire, in the heart of the city.</p>
</section>
<section id="menu" class="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-2xl text-center mb-10">A few favorites</h2>
  <div class="space-y-6">
    <div class="flex justify-between border-b border-[var(--line)] pb-4">
      <div><h3 class="font-semibold">Charred Octopus</h3><p class="text-sm text-[var(--muted)]">Smoked paprika, white beans</p></div>
      <p class="font-display font-bold">£16</p>
    </div>
    <div class="flex justify-between border-b border-[var(--line)] pb-4">
      <div><h3 class="font-semibold">Ember Ribeye</h3><p class="text-sm text-[var(--muted)]">32-day aged, bone marrow butter</p></div>
      <p class="font-display font-bold">£34</p>
    </div>
    <div class="flex justify-between">
      <div><h3 class="font-semibold">Roasted Squash</h3><p class="text-sm text-[var(--muted)]">Whipped feta, chili honey</p></div>
      <p class="font-display font-bold">£13</p>
    </div>
  </div>
</section>
<section id="story" class="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-2xl mb-4">Our story</h2>
  <p class="text-[var(--muted)] leading-relaxed">Started by two friends and one wood-fired oven, Ember & Vine still cooks the same honest way it did on day one.</p>
</section>
<section id="reserve" class="max-w-2xl mx-auto px-6 py-16 border-t border-[var(--line)] text-center">
  <h2 class="font-display font-bold text-2xl mb-6">Reserve a table</h2>
  <form class="flex flex-col gap-3 text-left">
    <input type="text" placeholder="Name" class="border border-[var(--line)] rounded-lg px-4 py-3 bg-white"/>
    <div class="grid grid-cols-2 gap-3">
      <input type="date" class="border border-[var(--line)] rounded-lg px-4 py-3 bg-white"/>
      <input type="text" placeholder="Party size" class="border border-[var(--line)] rounded-lg px-4 py-3 bg-white"/>
    </div>
    <button type="button" class="gold-gradient text-white font-semibold py-3 rounded-full">Request Reservation</button>
  </form>
</section>
<footer class="bg-white border-t border-[var(--line)] py-8 text-center">
  <p class="text-xs text-[var(--muted)]">© 2026 Ember &amp; Vine.</p>
</footer>
</body>
</html>`
  },

  "saas-flow": {
    name: "SaaS Flow",
    category: "SaaS",
    description: "A SaaS landing page — hero, features, pricing, and signup.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Flowbase</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --ink: #1A1A2E; --muted: #6B7280; --line: #E5E7EB; --gold: #FEB246; --orange: #FF8C00; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .gold-gradient { background: linear-gradient(135deg, var(--gold), var(--orange)); }
</style>
</head>
<body class="bg-white">
<header class="border-b border-[var(--line)]">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <span class="font-display font-bold text-lg">Flowbase</span>
    <nav class="hidden md:flex gap-8 text-sm font-medium text-[var(--muted)]">
      <a href="#features" class="hover:text-[var(--ink)]">Features</a>
      <a href="#pricing" class="hover:text-[var(--ink)]">Pricing</a>
    </nav>
    <a href="#signup" class="gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full">Start Free</a>
  </div>
</header>
<section class="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
  <h1 class="font-display font-bold text-5xl mb-6">Your team's work,<br/>finally in one place.</h1>
  <p class="text-lg text-[var(--muted)] mb-8">Flowbase brings tasks, docs, and chat together — real, simple, fast.</p>
  <a href="#signup" class="gold-gradient text-white font-semibold px-8 py-4 rounded-full inline-block">Start Free — No Card Needed</a>
</section>
<section id="features" class="max-w-6xl mx-auto px-6 py-20 border-t border-[var(--line)]">
  <div class="grid md:grid-cols-3 gap-6">
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <h3 class="font-display font-bold text-lg mb-2">Real-time sync</h3>
      <p class="text-sm text-[var(--muted)]">Every change, everywhere, instantly — genuinely no refresh needed.</p>
    </div>
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <h3 class="font-display font-bold text-lg mb-2">One inbox</h3>
      <p class="text-sm text-[var(--muted)]">Every real update in one place, not five different apps.</p>
    </div>
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <h3 class="font-display font-bold text-lg mb-2">Real automations</h3>
      <p class="text-sm text-[var(--muted)]">Genuine, working rules that remove the busywork.</p>
    </div>
  </div>
</section>
<section id="pricing" class="max-w-4xl mx-auto px-6 py-20 border-t border-[var(--line)]">
  <h2 class="font-display font-bold text-3xl text-center mb-10">Simple pricing</h2>
  <div class="grid md:grid-cols-2 gap-6">
    <div class="border border-[var(--line)] rounded-2xl p-7">
      <h3 class="font-display font-bold mb-1">Starter</h3>
      <p class="text-3xl font-bold mb-4">$0<span class="text-sm font-normal text-[var(--muted)]">/mo</span></p>
      <p class="text-sm text-[var(--muted)]">For small, real teams getting started.</p>
    </div>
    <div class="border-2 rounded-2xl p-7" style="border-color: var(--orange);">
      <h3 class="font-display font-bold mb-1">Team</h3>
      <p class="text-3xl font-bold mb-4">$24<span class="text-sm font-normal text-[var(--muted)]">/mo</span></p>
      <p class="text-sm text-[var(--muted)]">For real, growing teams that need more.</p>
    </div>
  </div>
</section>
<section id="signup" class="max-w-2xl mx-auto px-6 py-20 border-t border-[var(--line)] text-center">
  <h2 class="font-display font-bold text-3xl mb-6">Start free today</h2>
  <div class="flex gap-2 max-w-sm mx-auto">
    <input type="email" placeholder="Work email" class="flex-1 border border-[var(--line)] rounded-full px-4 py-3"/>
    <button type="button" class="gold-gradient text-white font-semibold px-6 py-3 rounded-full">Start</button>
  </div>
</section>
<footer class="border-t border-[var(--line)] py-8 text-center">
  <p class="text-xs text-[var(--muted)]">© 2026 Flowbase.</p>
</footer>
</body>
</html>`
  }
};

module.exports = { REAL_TEMPLATES };

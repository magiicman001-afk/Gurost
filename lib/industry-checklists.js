/**
 * Industry checklists for the company research: what a business of each kind
 * is expected to show on its website, and a plain test for each item.
 *
 * Pure functions, no network, no AI. runChecklist() takes the text and HTML of
 * the pages that were fetched and says, per item, "pass" or "fail". A "fail"
 * means the item was not found in what was read; it is a signal to check, not
 * a verdict, so every item carries a `fix` in plain words that the Fix-it
 * flow can hand to Amend Website. When no page text was read at all, every
 * item comes back "unchecked": the checklist never claims something is
 * missing from a page it did not see.
 *
 * Item shape: { id, label, why, impact (1-5), area ("website"|"content"|"social"),
 *               quickWin (fixable in about a day), fix, test(h) -> { pass, evidence } }
 * where h = { text (lowercased page text), html (lowercased HTML) }.
 */

const has = (h, re) => {
  const m = re.exec(h.text);
  return m ? m[0].replace(/\s+/g, " ").trim().slice(0, 80) : null;
};
const inHtml = (h, re) => {
  const m = re.exec(h.html);
  return m ? m[0].replace(/\s+/g, " ").trim().slice(0, 80) : null;
};
const found = (evidence) => ({ pass: Boolean(evidence), evidence: evidence || "" });

// A real price, or the marked placeholder Gurost writes until the owner adds
// theirs (prices are never invented) - either way the menu shows prices.
const PRICE = /[£$€]\s?\d+(?:[.,]\d{1,2})?|\[add your price\]/i;
const PRICE_PLACEHOLDERS = "Use clearly marked placeholders such as \"[Add your price]\" for the owner to fill in - never a made-up price.";

// ---- Items shared by several industries --------------------------------

const HOURS = {
  id: "opening_hours", label: "Opening hours are easy to find", impact: 5, area: "website", quickWin: true,
  why: "Visitors who cannot see when you are open often go elsewhere.",
  fix: "Add a clear opening hours section (each day, with times, and any holiday closures) to the home page and the footer.",
  test: (h) => found(has(h, /opening hours|opening times|we(?:'re| are) open|open (?:daily|every day|mon|tue|wed|thu|fri|sat|sun)|(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[:\-–]?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|to)\s*\d{1,2}/))
};

const MAP = {
  id: "map_location", label: "A map and address are shown", impact: 4, area: "website", quickWin: true,
  why: "Local customers need to see where you are and how to get there.",
  fix: "Add your full address and an embedded Google Map with a Get directions link to the contact area of the page.",
  test: (h) => found(inHtml(h, /google\.[a-z.]*\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|<iframe[^>]*maps/) || has(h, /get directions|find us|our address|visit us at/))
};

const CONTACT = {
  id: "contact_details", label: "Phone or email is easy to find", impact: 5, area: "website", quickWin: true,
  why: "If people cannot reach you quickly they will not.",
  fix: "Show your phone number and email address in the header or hero and again in the footer, as tap-to-call and tap-to-email links.",
  test: (h) => found(inHtml(h, /href=["'](?:tel:|mailto:)[^"']+/) || has(h, /\b(?:\+?\d[\d\s()-]{8,}\d)\b/) || has(h, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/))
};

const PROOF = {
  id: "social_proof", label: "Reviews or testimonials are shown", impact: 4, area: "content", quickWin: false,
  why: "New customers trust other customers more than they trust your own words.",
  fix: "Add a testimonials section with three real customer quotes (name and photo if they agree) and a link to your Google or Trustpilot reviews.",
  test: (h) => found(has(h, /testimonials?|reviews?\b|what (?:our )?(?:customers|clients) say|trustpilot|★|5 stars?|rated\b/))
};

const CTA = {
  id: "clear_call_to_action", label: "A clear next step is offered", impact: 4, area: "website", quickWin: true,
  why: "A visitor should know in a few seconds what to do next.",
  fix: "Put one clear button in the hero (for example Get a quote, Book now or Call us) and repeat it at the bottom of the page.",
  test: (h) => found(has(h, /get a quote|request a quote|book (?:now|online|a)|contact us|call us|get started|buy now|order (?:now|online)|sign up|enquire|free (?:quote|consultation|estimate)/))
};

const INSTAGRAM = {
  id: "instagram_link", label: "Instagram is linked or shown", impact: 3, area: "social", quickWin: true,
  why: "For food and visual businesses, Instagram is often the shop window.",
  fix: "Add an Instagram link in the header or footer and a strip of your latest posts on the home page.",
  test: (h) => found(inHtml(h, /instagram\.com\/[^"'\s>]+|cdn\.lightwidget|elfsight|snapwidget/))
};

// ---- Industry specific -------------------------------------------------

const RESTAURANT = [
  {
    id: "menu_with_prices", label: "A menu with prices is on the site", impact: 5, area: "content", quickWin: true,
    why: "The menu is the first thing people look for, and prices help them decide to come.",
    fix: `Add a menu section listing dishes with short descriptions and prices (as text, not only a photo or PDF). ${PRICE_PLACEHOLDERS}`,
    test: (h) => {
      const menu = has(h, /\bmenu\b|starters|mains|desserts|appetisers|appetizers/);
      const price = has(h, PRICE);
      return { pass: Boolean(menu && price), evidence: menu && price ? `${menu} / ${price}` : menu ? "menu found, no prices" : "" };
    }
  },
  MAP,
  {
    id: "online_ordering", label: "Online ordering or booking is offered", impact: 4, area: "website", quickWin: false,
    why: "Customers expect to order or book without phoning.",
    fix: "Add an Order online button (your own order form or a link to your delivery partner) and a Book a table button.",
    test: (h) => found(has(h, /order (?:online|now|ahead)|online ordering|takeaway|take-away|delivery|deliveroo|uber ?eats|just ?eat|doordash|book a table|reserve a table|reservations?/))
  },
  HOURS
];

const BAKERY_CAFE = [
  {
    id: "daily_menu", label: "A daily or current menu is shown", impact: 5, area: "content", quickWin: true,
    why: "People want to know what is fresh today before they make the trip.",
    fix: `Add a What's fresh today section with the current bakes, drinks and prices, and a note of when it was last updated. ${PRICE_PLACEHOLDERS}`,
    test: (h) => found(has(h, /today(?:'s| we)|daily (?:menu|specials?|bakes?)|fresh (?:daily|today|from the oven)|our menu|\bmenu\b|specials?\b/))
  },
  INSTAGRAM,
  {
    id: "order_ahead", label: "Order-ahead or pre-order is offered", impact: 4, area: "website", quickWin: false,
    why: "Pre-orders (cakes, boxes, click and collect) bring in sales before the doors open.",
    fix: "Add an Order ahead button with a simple form: what they want, the collection day and time, and their phone number.",
    test: (h) => found(has(h, /order ahead|pre-?order|click (?:and|&) collect|order online|collection|custom cakes?|cake orders?/))
  },
  HOURS,
  MAP
];

const LEGALESE = /hereinafter|notwithstanding|pursuant to|aforementioned|whereas|thereof|herein\b|hereby|inter alia|heretofore/g;
const LAW_FIRM = [
  {
    id: "team_bios", label: "Team bios show credentials", impact: 5, area: "content", quickWin: false,
    why: "Clients are choosing a person; they want to see who is qualified to help them.",
    fix: "Add a Meet the team section: a photo, name, role, qualifications (for example LLB, year admitted) and a two-line bio for each lawyer.",
    test: (h) => {
      const team = has(h, /our team|meet (?:the|our) (?:team|lawyers|solicitors|attorneys|partners)|our (?:lawyers|solicitors|attorneys|partners)/);
      const cred = has(h, /\bllb\b|\bll\.b\b|\bllm\b|admitted|called to the bar|\bsra\b|bar association|years of experience|accredited|member of the law society|qualified (?:in|as)/);
      return { pass: Boolean(team && cred), evidence: team && cred ? `${team} / ${cred}` : team ? "team found, no credentials" : "" };
    }
  },
  {
    id: "case_studies", label: "Case studies or results are shown", impact: 4, area: "content", quickWin: false,
    why: "Real outcomes show what you can do better than a list of practice areas.",
    fix: "Add a Results section with three short anonymised case studies: the problem, what you did, and the outcome.",
    test: (h) => found(has(h, /case stud(?:y|ies)|success stor(?:y|ies)|recent (?:cases|results)|client outcomes|results we(?:'ve| have)|cases we(?:'ve| have)/))
  },
  {
    id: "consultation_booking", label: "Consultation can be booked", impact: 5, area: "website", quickWin: true,
    why: "The goal of the site is a first conversation; make it one click.",
    fix: "Add a Book a consultation button in the hero and footer that opens a short form or a booking calendar.",
    test: (h) => found(has(h, /(?:free |initial )?consultation|book (?:an? )?(?:appointment|call|meeting)|schedule a (?:call|meeting)|calendly/))
  },
  {
    id: "plain_language", label: "Pages use plain language, not legal jargon", impact: 3, area: "content", quickWin: false,
    why: "Visitors are not lawyers. Jargon makes them feel the firm is not for them.",
    fix: "Rewrite the main service pages in plain words: short sentences, no Latin or legalese, and say who each service is for.",
    test: (h) => {
      const hits = (h.text.match(LEGALESE) || []).length;
      return { pass: hits < 3, evidence: hits >= 3 ? `${hits} legal jargon words found` : "" };
    }
  },
  CONTACT
];

const ECOMMERCE = [
  {
    id: "shipping_policy", label: "Shipping policy is clear", impact: 5, area: "content", quickWin: true,
    why: "Unclear delivery is a top reason shoppers abandon a purchase.",
    fix: "Add a Shipping page and a short summary on every product page: cost, delivery time, countries, and the free-shipping threshold.",
    test: (h) => found(has(h, /shipping (?:policy|information|costs?|rates?|options?|times?)|delivery (?:information|costs?|times?|options?)|dispatch(?:ed)? (?:within|in)|free (?:shipping|delivery)/))
  },
  {
    id: "reviews", label: "Reviews or testimonials are shown", impact: 5, area: "content", quickWin: false,
    why: "Shoppers cannot touch the product, so they rely on other buyers.",
    fix: "Show star ratings and a few customer reviews on product pages and the home page, and ask buyers for a review by email after delivery.",
    test: PROOF.test
  },
  {
    id: "easy_returns", label: "Returns are easy and clearly explained", impact: 5, area: "content", quickWin: true,
    why: "A visible returns promise lowers the risk of buying.",
    fix: "Add a Returns page in plain words (how long, who pays, how to start a return) and link it from the footer and product pages.",
    test: (h) => found(has(h, /returns?(?: policy| and refunds?)?\b|refunds?\b|money[- ]back|exchanges?\b|30[- ]day/))
  },
  {
    id: "costs_up_front", label: "Delivery costs are shown before checkout", impact: 4, area: "website", quickWin: true,
    why: "Costs that only appear at checkout feel like a trick and cause abandoned baskets.",
    fix: "Show the delivery cost (or a free-delivery threshold) next to the price and in the basket, so the total never surprises people.",
    test: (h) => {
      const m = has(h, /free (?:shipping|delivery)|(?:shipping|delivery)[^.]{0,30}[£$€]\s?\d|[£$€]\s?\d[^.]{0,20}(?:shipping|delivery)|(?:shipping|delivery) (?:from|is|costs?)/);
      return found(m);
    }
  },
  CONTACT
];

const LOCAL_SERVICES = [HOURS, MAP, CONTACT, PROOF, CTA];
const GENERAL = [CONTACT, PROOF, CTA];

const CHECKLISTS = {
  restaurant: { label: "Restaurant", commonProblem: "No opening hours on the site.", items: RESTAURANT },
  bakery_cafe: { label: "Bakery / Cafe", commonProblem: "No clear opening hours.", items: BAKERY_CAFE },
  law_firm: { label: "Law firm", commonProblem: "Too much legal jargon.", items: LAW_FIRM },
  ecommerce: { label: "Ecommerce", commonProblem: "Hidden costs at checkout.", items: ECOMMERCE },
  retail: { label: "Retail", commonProblem: "Visitors cannot tell if you are open.", items: LOCAL_SERVICES },
  health_wellness: { label: "Health and wellness", commonProblem: "No easy way to book.", items: LOCAL_SERVICES },
  beauty: { label: "Beauty / salon", commonProblem: "No easy way to book.", items: [...LOCAL_SERVICES, INSTAGRAM] },
  fitness: { label: "Fitness / gym", commonProblem: "Prices and class times are hidden.", items: LOCAL_SERVICES },
  trades: { label: "Trades / construction", commonProblem: "No proof of past work.", items: LOCAL_SERVICES },
  real_estate: { label: "Real estate", commonProblem: "Hard to contact an agent quickly.", items: GENERAL },
  education: { label: "Education / training", commonProblem: "Unclear what to do to enrol.", items: GENERAL },
  tech_saas: { label: "Technology / software", commonProblem: "Unclear what the product does.", items: GENERAL },
  agency: { label: "Agency / consulting", commonProblem: "No proof of results.", items: GENERAL },
  other: { label: "Other", commonProblem: "No clear next step.", items: GENERAL }
};

// Unique items for an industry (an item shared with another list appears once).
function checklistFor(industry) {
  const def = CHECKLISTS[industry] || CHECKLISTS.other;
  const seen = new Set();
  const items = def.items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  return { industry: CHECKLISTS[industry] ? industry : "other", label: def.label, commonProblem: def.commonProblem, items };
}

/**
 * Runs the checklist over what was fetched: { text, html } (either may be
 * empty). Returns { industry, label, commonProblem, checked, items:
 * [{ id, label, why, impact, area, quickWin, fix, status, evidence }] } with
 * status "pass" | "fail" | "unchecked". Failing items come first, biggest
 * impact first.
 */
function runChecklist(industry, page = {}) {
  const def = checklistFor(industry);
  const text = String(page.text || "").toLowerCase();
  const html = String(page.html || "").toLowerCase();
  const checked = Boolean(text.trim() || html.trim());
  const h = { text: text || html.replace(/<[^>]*>/g, " "), html };
  const rank = { fail: 0, unchecked: 1, pass: 2 };
  const items = def.items.map((i) => {
    let status = "unchecked", evidence = "";
    if (checked) {
      const r = i.test(h);
      status = r.pass ? "pass" : "fail";
      evidence = r.evidence || "";
    }
    return { id: i.id, label: i.label, why: i.why, impact: i.impact, area: i.area, quickWin: i.quickWin, fix: i.fix, status, evidence };
  });
  items.sort((a, b) => rank[a.status] - rank[b.status] || b.impact - a.impact);
  return { industry: def.industry, label: def.label, commonProblem: def.commonProblem, checked, items };
}

module.exports = { CHECKLISTS, checklistFor, runChecklist };

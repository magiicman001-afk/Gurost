// Run: node --test test/industry-checklists.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { runChecklist, checklistFor, CHECKLISTS } = require("../lib/industry-checklists");
const { INDUSTRIES } = require("../lib/company-profile");

const status = (r, id) => r.items.find((i) => i.id === id).status;

test("every industry the form offers has a checklist with real, complete items", () => {
  for (const { id } of INDUSTRIES) {
    assert.ok(CHECKLISTS[id], `${id} has a checklist`);
    const { items } = checklistFor(id);
    assert.ok(items.length >= 3, id);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length, `${id} items are unique`);
    for (const i of items) {
      assert.ok(i.label && i.why && i.fix && typeof i.test === "function", `${id}/${i.id}`);
      assert.ok(i.impact >= 1 && i.impact <= 5 && ["website", "content", "social"].includes(i.area), `${id}/${i.id}`);
    }
  }
  assert.equal(checklistFor("nonsense").industry, "other");
});

test("the four industries in the brief carry the benchmarks it lists", () => {
  const ids = (k) => checklistFor(k).items.map((i) => i.id);
  assert.deepEqual(["menu_with_prices", "map_location", "online_ordering", "opening_hours"].filter((x) => !ids("restaurant").includes(x)), []);
  assert.deepEqual(["team_bios", "case_studies", "consultation_booking", "plain_language"].filter((x) => !ids("law_firm").includes(x)), []);
  assert.deepEqual(["shipping_policy", "reviews", "easy_returns", "costs_up_front"].filter((x) => !ids("ecommerce").includes(x)), []);
  assert.deepEqual(["daily_menu", "instagram_link", "order_ahead", "opening_hours"].filter((x) => !ids("bakery_cafe").includes(x)), []);
  assert.match(checklistFor("restaurant").commonProblem, /hours/i);
  assert.match(checklistFor("law_firm").commonProblem, /jargon/i);
  assert.match(checklistFor("ecommerce").commonProblem, /checkout/i);
});

test("restaurant: finds a menu with prices, map, ordering and hours; flags what is missing", () => {
  const good = runChecklist("restaurant", {
    text: "Our Menu: Margherita £9.50. Order online or book a table. Opening hours: Mon-Fri 12:00 - 22:00",
    html: '<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>'
  });
  for (const id of ["menu_with_prices", "map_location", "online_ordering", "opening_hours"]) assert.equal(status(good, id), "pass", id);
  const bad = runChecklist("restaurant", { text: "Welcome to Luigi's. We love food.", html: "<p>Welcome</p>" });
  for (const id of ["menu_with_prices", "map_location", "online_ordering", "opening_hours"]) assert.equal(status(bad, id), "fail", id);
  assert.equal(bad.items[0].status, "fail");
});

test("a menu without prices does not pass", () => {
  const r = runChecklist("restaurant", { text: "See our menu for starters and mains" });
  assert.equal(status(r, "menu_with_prices"), "fail");
  assert.match(r.items.find((i) => i.id === "menu_with_prices").evidence, /no prices/);
});

test("bakery: instagram link, order ahead, daily menu", () => {
  const r = runChecklist("bakery_cafe", { text: "Fresh from the oven today. Pre-order your cake. Open daily 8am - 4pm", html: '<a href="https://instagram.com/crumbco">ig</a>' });
  for (const id of ["daily_menu", "instagram_link", "order_ahead", "opening_hours"]) assert.equal(status(r, id), "pass", id);
  assert.equal(status(runChecklist("bakery_cafe", { text: "Hello", html: "<p>Hello</p>" }), "instagram_link"), "fail");
});

test("law firm: bios need credentials, jargon is detected, consultation is found", () => {
  const r = runChecklist("law_firm", {
    text: "Meet the team. Jane Doe LLB, admitted 2012. Book a free consultation. Whereas the party hereinafter named, notwithstanding the aforementioned, shall pursuant to this."
  });
  assert.equal(status(r, "team_bios"), "pass");
  assert.equal(status(r, "consultation_booking"), "pass");
  assert.equal(status(r, "plain_language"), "fail");
  assert.equal(status(r, "case_studies"), "fail");
  assert.equal(status(runChecklist("law_firm", { text: "We help families with wills and house moves." }), "plain_language"), "pass");
  assert.equal(status(runChecklist("law_firm", { text: "Our team is friendly." }), "team_bios"), "fail");
});

test("ecommerce: shipping, returns, reviews, costs up front", () => {
  const r = runChecklist("ecommerce", { text: "Free delivery over £40. Returns policy: 30-day money back. Customer reviews 4.8 stars" });
  for (const id of ["shipping_policy", "easy_returns", "reviews", "costs_up_front"]) assert.equal(status(r, id), "pass", id);
  const bad = runChecklist("ecommerce", { text: "Buy our lovely mugs." });
  for (const id of ["shipping_policy", "easy_returns", "reviews", "costs_up_front"]) assert.equal(status(bad, id), "fail", id);
});

test("nothing fetched -> every item is unchecked, never claimed missing", () => {
  for (const page of [undefined, {}, { text: "", html: "" }, { text: "   " }]) {
    const r = runChecklist("restaurant", page);
    assert.equal(r.checked, false);
    assert.ok(r.items.every((i) => i.status === "unchecked"));
  }
});

test("only html given: text is taken from it; results sort fails first, biggest impact first", () => {
  const r = runChecklist("ecommerce", { html: "<p>Free delivery over £40</p>" });
  assert.equal(r.checked, true);
  const order = r.items.map((i) => i.status);
  assert.deepEqual(order, [...order].sort((a, b) => ({ fail: 0, unchecked: 1, pass: 2 }[a] - { fail: 0, unchecked: 1, pass: 2 }[b])));
  const fails = r.items.filter((i) => i.status === "fail");
  for (let k = 1; k < fails.length; k++) assert.ok(fails[k - 1].impact >= fails[k].impact);
});

test("evidence is short plain text", () => {
  const r = runChecklist("restaurant", { text: "x".repeat(500) + " opening hours " + "y".repeat(500) });
  const ev = r.items.find((i) => i.id === "opening_hours").evidence;
  assert.ok(ev.length <= 80 && /opening hours/.test(ev));
});

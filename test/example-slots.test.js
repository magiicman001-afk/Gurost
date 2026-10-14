// Run: node --test test/example-slots.test.js
// Track 2b/2c, Irfan's honest-content rule: a customer's site never shows the example business's details, prices, reviews or
// claims. Every example text is a slot (templates/_src/examples.js): the picker's preview shows it, a customer's site leaves a marker.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../templates/_src/examples");
const { fillTemplate } = require("../templates/_src/fill");
const T = require("../lib/template-site");
const C = require("../lib/template-chooser");

const ROOT = path.join(__dirname, "..", "templates");
const PACKS = fs.readdirSync(path.join(ROOT, "_src", "packs")).filter((f) => f.endsWith(".js")).map((f) => require(`../templates/_src/packs/${f}`));
const GENERIC = T.GENERIC;
const pages = (pack, style) => fs.readdirSync(path.join(ROOT, pack, style)).filter((f) => f.endsWith(".html"));

test("the lint: no example claim, price or number is left in the words of any ready layout", () => {
  let checked = 0;
  for (const pack of PACKS) {
    for (const style of GENERIC) {
      for (const f of pages(pack.id, style)) {
        const left = E.leftovers(fs.readFileSync(path.join(ROOT, pack.id, style, f), "utf8"), pack.demo);
        assert.deepEqual(left, [], `${pack.id}/${style}/${f} still has example claims`);
        checked++;
      }
    }
  }
  assert.ok(checked >= 15 * 5 * 2);
});

test("the claim rule catches what it should and leaves page words alone", () => {
  for (const s of ["from &pound;85", "Gas Safe and NICEIC registered engineers.", "12 month guarantee", "Free first call", "24 hour emergencies", "Twenty years in the trade", "Nothing artificial, ever.", "Fixed price", "100%"]) assert.ok(E.isClaim(s), s);
  for (const s of ["Home", "Menu", "Pre-order", "Our services", "Find us", "Your name", "Send my pre-order", "Tell us what you need"]) assert.ok(!E.isClaim(s), s);
  assert.ok(E.isPrice("from &pound;85") && E.isPrice("£4.00") && !E.isPrice("Free quote"));
});

test("the picker's preview looks the way it did: filling with the example text restores every page, with no token left", () => {
  for (const pack of PACKS) {
    const table = JSON.parse(fs.readFileSync(path.join(ROOT, "_examples", pack.id + ".json"), "utf8"));
    assert.ok(Object.keys(table).length > 20, pack.id);
    for (const style of pack.styles) {
      for (const f of pages(pack.id, style)) {
        const demo = T.respondDemo(pack.id, style, "/" + f);
        assert.equal(demo.status, 200);
        assert.ok(!/\{\{/.test(demo.body.replace(/\{\{form_endpoint\}\}/g, "")), `${pack.id}/${style}/${f}`);
      }
    }
  }
  const home = T.respondDemo("trades", "atelier", "/").body;
  assert.ok(home.includes("Gas Safe") && home.includes("Maple") === false);
  assert.ok(T.respondDemo("bakery", "atelier", "/menu.html").body.includes("&pound;"), "the preview still shows prices");
});

test("a customer's site: the example business and its claims never appear, on any ready layout", () => {
  const fixedNames = (pack) => [pack.demo.business_name, pack.demo.owner_name, pack.demo.phone, pack.demo.email, pack.demo.address_line1, pack.demo.address_line2, pack.demo.hours_weekdays].filter((x) => x && x.length > 4);
  for (const pack of PACKS) {
    for (const style of GENERIC) {
      const site = T.makeSite(pack.id, style, { business_name: "Acme Ltd" });
      for (const f of pages(pack.id, style)) {
        const r = T.respond(site, "/" + f, { formEndpoint: "https://x.test/api/site-forms/1" });
        assert.equal(r.status, 200);
        const text = r.body.replace(/<(script|style|svg|dialog)[\s\S]*?<\/\1>/g, " ");
        assert.ok(!/\{\{/.test(r.body), `${pack.id}/${style}/${f} left a token`);
        for (const x of fixedNames(pack)) assert.ok(!r.body.includes(x), `${pack.id}/${style}/${f} shows "${x}"`);
        assert.ok(!/&pound;\s?\d|£\s?\d/.test(text), `${pack.id}/${style}/${f} shows a price`);
        assert.ok(!/Sample review/i.test(text), `${pack.id}/${style}/${f} shows a sample review`);
        assert.deepEqual(E.leftovers(r.body.replace(/\[Add [^\]]*\]/g, "").replace(/Acme Ltd/g, ""), pack.demo).filter((x) => !/^(Fresh|Acme)/.test(x)).slice(0, 3), [], `${pack.id}/${style}/${f}`);
      }
    }
  }
});

test("a customer's site shows what the customer gave, and an 'Add ... here' marker for everything else", () => {
  const site = T.makeSite("bakery", "atelier", { business_name: "Luvky Bakes", phone: "0113 496 0000", address_line1: "12 High Street", city: "Leeds" });
  const home = T.respond(site, "/", { formEndpoint: "x" }).body;
  assert.ok(home.includes("Luvky Bakes") && home.includes("0113 496 0000") && home.includes("12 High Street"));
  assert.ok(home.includes('href="tel:+441134960000"'));
  for (const marker of ["[Add email address here]", "[Add opening hours, Monday to Friday here]", "[Add your own text here]"]) assert.ok(home.includes(marker), marker);
  const menu = T.respond(site, "/menu.html", {}).body;
  assert.ok(menu.includes("[Add price here]") && menu.includes("[Add item name here]") && menu.includes("[Add description here]"));
  assert.ok(!/&pound;/.test(menu.replace(/<(script|style)[\s\S]*?<\/\1>/g, "")));
});

test("links with nothing to point at are hidden, and no link is left empty or half-made", () => {
  const home = T.respond(T.makeSite("bakery", "atelier", { business_name: "Luvky Bakes" }), "/", {}).body;
  assert.ok(!/href="(tel:|mailto:)?"/.test(home), "no empty link");
  assert.ok(home.includes('a[href="#gx-empty"]{display:none!important}body{overflow-wrap:anywhere}'));
  assert.ok(!/href="mailto:\[/.test(home) && !/href="tel:\[/.test(home), "no marker inside a link");
  const withInsta = T.respond(T.makeSite("bakery", "atelier", { business_name: "L", instagram_url: "https://www.instagram.com/luvky" }), "/", {}).body;
  assert.ok(withInsta.includes('href="https://www.instagram.com/luvky"'));
});

test("the customer's own text is still escaped, and example markers cannot be turned into markup", () => {
  const home = T.respond(T.makeSite("trades", "daylight", { business_name: "<img src=x onerror=alert(1)>", tagline: "\"><script>alert(1)</script>" }), "/", {}).body;
  assert.ok(!/<img src=x/.test(home) && !/<script>alert\(1\)/.test(home));
  assert.ok(home.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

test("layouts with their own working tool are preview only: not chosen, not accepted", () => {
  const cat = T.catalog();
  for (const i of cat.industries) {
    for (const s of i.styles) assert.equal(s.ready, GENERIC.includes(s.id), `${i.id}/${s.id}`);
    assert.equal(i.styles.filter((s) => s.ready).length, 5, i.id);
  }
  assert.equal(T.isHonest("pipeworks"), false);
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /templateSite\.isHonest\(style\)/);
});

test("details from the form fill the template's own fields and nothing is guessed", () => {
  const v = C.valuesFrom("bakery", "a bakery in Leeds", { name: "Luvky Bakes", tagline: "Bread, daily", phone: "0113 496 0000", email: "hi@luvky.example", address: "12 High Street, Leeds LS1 4AB", instagram: "https://www.instagram.com/luvky", facebook: "" });
  assert.deepEqual(v.values, { business_name: "Luvky Bakes", tagline: "Bread, daily", city: "Leeds", phone: "0113 496 0000", email: "hi@luvky.example", address_line1: "12 High Street", address_line2: "Leeds LS1 4AB", instagram_url: "https://www.instagram.com/luvky" });
  assert.deepEqual(C.valuesFrom("bakery", "a bakery", {}).values, {});
  assert.deepEqual(C.valuesFrom("legal", "law in York", { name: "Hart", email: "bad", phone: "call me" }).values, { business_name: "Hart", city: "York" });
  assert.equal(C.splitAddress("12 High Street").address_line2, "");
  assert.equal(C.cityFrom("a bakery"), "");
});

test("the example table is sorted and has no customer data", () => {
  for (const pack of PACKS) {
    const raw = fs.readFileSync(path.join(ROOT, "_examples", pack.id + ".json"), "utf8");
    const keys = Object.keys(JSON.parse(raw));
    assert.deepEqual(keys, [...keys].sort(), pack.id);
    for (const e of Object.values(JSON.parse(raw))) assert.ok(["price", "name", "desc", "text", "attr"].includes(e.r) && typeof e.h === "string");
  }
  assert.equal(fillTemplate({ "a.html": "<p>{{html:ex_1}}</p>" }, { ex_1: "x {{city}}", city: "Leeds" }).files["a.html"], "<p>x Leeds</p>");
});

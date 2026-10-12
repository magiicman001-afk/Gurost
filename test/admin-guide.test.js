"use strict";
// Run: node --test test/admin-guide.test.js
// The Help and Guide content (docs/ADMIN_GUIDE_SPEC.md): coverage, length, role filtering, glossary, plain English.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const G = require("../lib/admin-guide");
const A = require("../lib/admin-access");

const page = fs.readFileSync(path.join(__dirname, "..", "public", "admin-dashboard.html"), "utf8");

test("every tab in the admin page has a help text, and the section map matches the page", () => {
  const tabs = [...page.matchAll(/\{ id: '(\w+)', label: '([^']+)', section: '(\w+)' \}/g)].map((m) => ({ id: m[1], label: m[2], section: m[3] }));
  assert.ok(tabs.length >= 18, "found the tabs in the page");
  for (const t of tabs) {
    assert.ok(G.HELP[t.id], `${t.id} has no help text`);
    assert.equal(G.TAB_SECTIONS[t.id], t.section, `${t.id}: access section differs from the page`);
    assert.equal(G.TAB_LABELS[t.id], t.label, `${t.id}: label differs from the page`);
  }
  assert.deepEqual(Object.keys(G.HELP).sort(), tabs.map((t) => t.id).sort(), "help for a tab that does not exist");
});

test("each help text is 200 to 400 words and has all four parts", () => {
  for (const [id, e] of Object.entries(G.HELP)) {
    const n = G.wordCount(e);
    assert.ok(n >= 200 && n <= 400, `${id}: ${n} words`);
    assert.ok(e.shows.length && e.numbers.length && e.wrong.length && e.dont.length, `${id}: missing a part`);
    for (const [label, meaning] of e.numbers) assert.ok(label && meaning, `${id}: a number row is empty`);
  }
});

test("the 13 guide sections exist: twelve steps plus the glossary", () => {
  assert.deepEqual(G.SECTIONS.map((s) => s.letter).join(""), "abcdefghijkl");
  assert.equal(new Set(G.SECTIONS.map((s) => s.id)).size, G.SECTIONS.length);
  for (const s of G.SECTIONS) {
    assert.ok(s.title && s.roles.length && s.blocks.length, s.id);
    for (const b of s.blocks) assert.equal(Object.keys(b).length, 1, `${s.id}: a block has one kind`), assert.ok(["h", "p", "ol", "ul", "warn"].includes(Object.keys(b)[0]));
    for (const r of s.roles) assert.ok(A.ROLES.includes(r), `${s.id}: unknown role ${r}`);
  }
});

test("role filtering: tabs follow the access table, owner-only text never reaches lesser roles", () => {
  for (const role of A.ROLES) {
    const g = G.guideFor(role);
    for (const tab of Object.keys(g.tabs)) assert.ok(A.sectionsFor(role).includes(G.TAB_SECTIONS[tab]), `${role} got help for ${tab}`);
    for (const [tab, section] of Object.entries(G.TAB_SECTIONS)) if (A.sectionsFor(role).includes(section)) assert.ok(g.tabs[tab], `${role} lacks help for ${tab}`);
  }
  const ids = (role) => G.guideFor(role).sections.map((s) => s.id);
  assert.ok(ids("owner").includes("rotate"));
  for (const r of ["admin", "team_lead", "engineer", "viewer"]) assert.ok(!ids(r).includes("rotate"), `${r} must not get the key-rotation steps`);
  assert.ok(!ids("viewer").includes("addmember") && !ids("viewer").includes("access") && !ids("viewer").includes("alert"));
  assert.ok(!Object.keys(G.guideFor("viewer").tabs).some((t) => ["ops", "team", "security", "payments", "users"].includes(t)));
  const viewerText = JSON.stringify(G.guideFor("viewer"));
  assert.ok(!/Rotate a key\b.*Create the NEW key/.test(viewerText));
});

test("the glossary covers the terms the spec names and has no duplicates", () => {
  const terms = G.GLOSSARY.map(([t]) => t);
  assert.equal(new Set(terms.map((t) => t.toLowerCase())).size, terms.length, "duplicate term");
  const need = ["Deploy", "Commit", "Escalation", "Quality gate", "Rotate a key", "Redeploy", "Revoke", "Block", "Token", "Cache", "Premium Pipeline", "Switch", "Secret", "Role", "Error rate", "Uptime", "Render", "GitHub", "Supabase", "Stripe", "Vercel", "GDPR", "XSS", "Design memory", "Section library", "Pulse", "Senior engineer (bot)"];
  for (const n of need) assert.ok(terms.includes(n), `glossary lacks ${n}`);
  for (const [t, m] of G.GLOSSARY) {
    assert.ok(m.length > 20 && m.split(/\s+/).length <= 45, `${t}: definition length`);
    assert.ok(/[.]$/.test(m), `${t}: should end with a full stop`);
  }
  const d = Object.fromEntries(G.GLOSSARY);
  assert.match(d.Deploy, /new code on the live site/i);
  assert.match(d.Commit, /saved change/i);
  assert.match(d.Escalation, /more senior bot/i);
  assert.match(d["Quality gate"], /checks a page must pass/i);
});

test("plain English: heavy jargon words never appear in help or guide text", () => {
  const text = JSON.stringify([G.HELP, G.SECTIONS]).toLowerCase();
  for (const word of ["middleware", "webhook", "endpoint", "payload", "cors", "jwt", "rls", "iframe", "regex", "sql injection", "csrf", "oauth", "kubernetes", "latency", "throughput"]) {
    assert.ok(!text.includes(word), `jargon: ${word}`);
  }
});

test("content is plain text: no markup and no secrets", () => {
  const all = JSON.stringify([G.HELP, G.SECTIONS, G.GLOSSARY]);
  assert.ok(!/<[a-z\/]/i.test(all.replace(/\\"/g, "")), "markup in the content");
  assert.ok(!/sk-[A-Za-z0-9]{10,}|sb_secret|AIza|eyJ[A-Za-z0-9]{10,}/.test(all));
});

test("it never claims what is not built", () => {
  const text = JSON.stringify(G.guideFor("owner"));
  assert.match(text, /not built yet/i);
  assert.match(text, /Publishing it to a public web address is not built yet/);
  assert.match(text, /automatic alert system[^"]*is planned[^"]*not built yet/i);
});

test("the tour has five steps and names only this role's tabs", () => {
  for (const role of A.ROLES) assert.equal(G.tourFor(role).length, 5);
  const viewerStep = G.tourFor("viewer")[1].body;
  assert.ok(viewerStep.includes("Dashboard") && viewerStep.includes("Software"));
  assert.ok(!viewerStep.includes("Ops") && !viewerStep.includes("Team"));
  assert.ok(G.tourFor("owner")[1].body.includes("Ops"));
});

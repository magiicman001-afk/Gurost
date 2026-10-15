#!/usr/bin/env node
"use strict";
// Try Company Scout's page reading on a REAL public site, from a machine with internet. No AI, no search, no database, no cost.
//   node scripts/scout-try.js https://example.com bakery_cafe
// Prints the pages read (robots.txt obeyed, private addresses refused) and the rule-based checklist result with evidence.
const S = require("../lib/company-scout");
const { assertSafeUrl } = require("../security");
const { runChecklist } = require("../lib/industry-checklists");

(async () => {
  const url = process.argv[2]; const industry = process.argv[3] || "other";
  if (!url) { console.error("Usage: node scripts/scout-try.js <https://site> [industry id]"); process.exit(1); }
  const f = S.createFetcher({ assertSafe: assertSafeUrl });
  const home = await f.get(url);
  let robots = ""; try { robots = (await f.get(new URL("/robots.txt", home.url).toString(), { html: false })).body; } catch (e) { /* none */ }
  console.log("robots.txt allows the home page:", S.robotsAllows(robots, new URL(home.url).pathname || "/"));
  const pages = [home];
  for (const link of S.pickLinks(home.body, home.url)) { try { pages.push(await f.get(link)); } catch (e) { console.log("skipped", link, e.message); } }
  console.log("pages read:", pages.map((p) => p.url));
  const r = runChecklist(industry, { text: pages.map((p) => S.htmlToText(p.body)).join("\n\n"), html: pages.map((p) => p.body).join("\n") });
  for (const i of r.items) console.log(`${i.status.padEnd(9)} ${i.label}${i.evidence ? "  [" + i.evidence + "]" : ""}`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });

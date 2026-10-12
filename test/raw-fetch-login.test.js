// Run: node --test test/raw-fetch-login.test.js
// S3d: pages that need the raw Response (voice audio, uploads, CSV, history)
// go through GurostAPI.fetch, so a lapsed 15-minute login cookie is refreshed
// silently instead of the call failing. No page builds auth headers itself.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const pub = path.join(__dirname, "..", "public");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(e.name)) files.push(p);
  }
})(pub);
const rel = (p) => path.relative(pub, p).split(path.sep).join("/");

test("only the API client attaches login headers (the admin area has its own login)", () => {
  const offenders = files
    .filter((p) => !["shared/api-client.js", "admin-dashboard.html"].includes(rel(p)))
    .filter((p) => /GurostAPI\??\.authHeaders\(\)/.test(fs.readFileSync(p, "utf8")))
    .map(rel);
  assert.deepEqual(offenders, []);
});

test("voice, image, history, download, upload, avatar and CSV calls use GurostAPI.fetch", () => {
  const uses = { "shared/pulse-voice.js": 2, "shared/pulse-widget.js": 7, "profile.html": 1, "submissions.html": 1 };
  for (const [file, n] of Object.entries(uses)) {
    const src = fs.readFileSync(path.join(pub, file), "utf8");
    const count = (src.match(/GurostAPI\??\.fetch\b/g) || []).length;
    assert.equal(count, n, file);
  }
});

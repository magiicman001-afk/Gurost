// Run: node --test test/pulse-buttons.test.js
// Bug E: Pulse buttons that said "okay" and did nothing. One check per fix; the browser runs are in the commit messages.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const widget = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.css"), "utf8");

test("Image: a failure replaces 'Generating…' with a plain message, and a spent image credit is said honestly", () => {
  const at = widget.indexOf("pulseImageGenerate').addEventListener");
  const block = widget.slice(at, widget.indexOf("actHistory').addEventListener"));
  assert.match(block, /catch \(err\)/);
  assert.match(block, /showImageError\(friendly\)/);
  assert.match(block, /the image service has no credit left/);
  assert.match(block, /if \(!data\.base64\)/, "an empty answer is an error, not a blank panel");
  assert.match(css, /\.pulse-image-error/);
});

test("Upload: the uploaded file is shown with its link, only https links are used, and the card offers 'Use it on my site'", () => {
  assert.match(widget, /id="pulseUploadResult"/);
  assert.match(widget, /showUploadResult\(data\)/);
  const fn = widget.slice(widget.indexOf("function showUploadResult"), widget.indexOf("// Real, shared wrapper for every action button"));
  assert.match(fn, /\^https:/, "only an https link is used");
  assert.match(fn, /Use it on my site/);
  assert.match(fn, /textContent = `Uploaded:/, "the file name is written as text, never as markup");
  assert.ok(!/innerHTML/.test(fn), "no markup is built from the file name or link");
  assert.match(css, /#pulseUploadResult\.visible/);
});

test("Share: a template site's share link opens the site (pages and files), as a folder so relative links work", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const at = src.indexOf('app.get(/^\\/shared\\/');
  assert.ok(at > 0, "the shared route takes an optional path after the token");
  const block = src.slice(at, src.indexOf("\n});", at));
  assert.match(block, /project\?\.templateSite/);
  assert.match(block, /res\.redirect\(301, `\/shared\/\$\{token\}\/`\)/, "/shared/<token> goes to /shared/<token>/");
  assert.match(block, /templateSite\.respond\(project\.templateSite, rel/);
  assert.match(block, /sandboxSharedPage\(res\)/, "still runs in the sandbox");
  assert.match(block, /rel !== "\/"\) return res\.status\(404\)/, "an ordinary site still has exactly one address");
});

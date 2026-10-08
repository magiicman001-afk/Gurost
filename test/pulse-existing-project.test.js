// Run: node --test test/pulse-existing-project.test.js
// Phone test 2026-10-08 (Bug H): with designs on screen but none picked, every Pulse message was
// treated as a NEW build - the company-details form came back and the designs on screen were wiped.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

function widgetRoute() {
  const noop = () => {};
  const ctx = vm.createContext({
    window: { addEventListener: noop }, console,
    document: { readyState: "loading", addEventListener: noop },
    setInterval: noop, setTimeout: noop, clearTimeout: noop, location: { pathname: "/builder.html" }
  });
  vm.runInContext(read("public/shared/pulse-widget.js"), ctx);
  return ctx.window.GurostPulseRoute;
}
const { decide } = widgetRoute();
const handsfree = require("../public/shared/pulse-handsfree.js");

test("no project yet -> a new build; a design in use -> an edit", () => {
  assert.equal(decide("a bakery site", "none", true).action, "build");
  assert.equal(decide("make the header blue", "ready", true).action, "edit");
});

test("a project with designs on screen but none picked -> 'Pick a design first', never a new build", () => {
  for (const text of ["Change the design and layout please", "make the header blue", "a bakery site"]) {
    const r = decide(text, "choosing", true);
    assert.equal(r.action, "reply");
    assert.equal(r.kind, "pickdesign");
    assert.match(r.say, /^Pick a design first/);
  }
});

test("designs still on their way -> says so, never a second build", () => {
  const r = decide("change the layout", "building", true);
  assert.equal(r.action, "reply");
  assert.match(r.say, /still being built/);
});

test("'make another page' / 'add a page' -> the honest answer, in every state, no build, no form", () => {
  for (const state of ["none", "building", "choosing", "ready"]) {
    for (const text of ["make another page", "Add a page", "add a pricing page", "Create a new page for the menu", "can you build me an about page", "generate two more pages"]) {
      const r = decide(text, state, true);
      assert.equal(r.kind, "unsupported", `${state}: ${text}`);
      assert.equal(r.say, "Adding new pages isn't ready yet. I can redesign your site or change the text and content. Want me to do that?");
    }
  }
});

test("ordinary edits that merely mention a page are still edits", () => {
  for (const text of ["make this page darker", "add a button to the page", "add a link to page two", "change the heading on the about page", "make the page load faster", "add a section to the home page"]) {
    assert.equal(decide(text, "ready", true).action, "edit", text);
  }
});

test("'add a page' is only unsupported on the Website Builder (the App Builder can add screens)", () => {
  assert.equal(decide("add a settings page", "ready", false).action, "edit");
});

test("hands-free voice speaks the same answer", () => {
  const say = "Pick a design first - tap the one you like on the left, then I can change it.";
  assert.equal(handsfree.spokenReply({ ok: false, kind: "pickdesign", say }), say);
  assert.equal(handsfree.spokenReply({ ok: false, kind: "unsupported", say: "x" }), "x");
  assert.equal(handsfree.spokenReply({ ok: false, kind: "edit" }), "That didn't work. Shall we try again?", "other failures unchanged");
});

test("builder page: reports none/building/choosing/ready; Pulse asks it before deciding", () => {
  const html = read("public/builder.html");
  assert.match(html, /projectState: \(\) => \(!projectId \? 'none' : currentHtml \? 'ready' : pickerVariants\.size > 0 \? 'choosing' : buildWatch \? 'building' : 'none'\)/);
  const widget = read("public/shared/pulse-widget.js");
  assert.match(widget, /gb\.projectState \? gb\.projectState\(\)/);
  assert.match(widget, /if \(route\.action === 'build'\) \{/);
});

test("closing the old socket for a new build no longer wipes the new socket's reference", () => {
  const html = read("public/builder.html");
  assert.match(html, /const thisSocket = generationSocket;/);
  assert.match(html, /if \(generationSocket === thisSocket\) generationSocket = null;/);
  assert.doesNotMatch(html, /addEventListener\('close', \(\) => \{\n    generationSocket = null;/);
});

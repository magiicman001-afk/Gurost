"use strict";
// Bug A: every page with a header gets the same "Dashboard" button (public pages when signed in,
// signed-in pages always), identical in size and colour because the script sets it inline.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");
const src = read("shared/back-to-dashboard.js");

const PUBLIC_PAGES = ["index", "pricing", "blog", "about", "showcase", "templates", "status", "privacy", "terms", "help", "careers", "contact", "docs"];
const APP_PAGES = ["amend_website", "app-builder", "assistant", "builder", "profile", "resources", "settings", "analytics"];

test("every public page and every signed-in page loads the script", () => {
  for (const f of [...PUBLIC_PAGES, ...APP_PAGES]) {
    assert.match(read(f + ".html"), /<script src="shared\/back-to-dashboard\.js"><\/script>/, `${f}.html includes it`);
  }
});

test("every page the script is on has a header, and the public ones have the Log in / Start Building links it swaps", () => {
  for (const f of [...PUBLIC_PAGES, ...APP_PAGES]) assert.match(read(f + ".html"), /<header/, `${f} has a header`);
  for (const f of PUBLIC_PAGES) {
    assert.match(read(f + ".html"), /href="login\.html"/, `${f} has a Log in link`);
    assert.match(read(f + ".html"), /href="signup\.html"/, `${f} has a Start Building link`);
  }
  for (const f of APP_PAGES) assert.match(read(f + ".html"), /<header[\s\S]*?href="dashboard\.html"[\s\S]*?<\/header>/, `${f} has a Dashboard link in its header`);
});

test("one fixed look: size, colour and wording are set inline; text is set safely", () => {
  assert.match(src, /\\u2190 Dashboard/);
  assert.match(src, /fontSize = '13px'/);
  assert.match(src, /padding = '9px 14px'/);
  assert.match(src, /FEB246[\s\S]*FF8C00/);
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(src), "no HTML injection");
  assert.match(src, /gurost_li=1/, "works without the API client");
});

function makeDom({ loggedIn, publicPage }) {
  const made = [];
  const mk = () => { const el = { attrs: {}, style: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { this.attrs[k] = undefined; }, replaced: null, removed: false, remove() { this.removed = true; }, replaceWith(n) { this.replaced = n; } }; return el; };
  const login = mk(), start = mk(), existing = mk();
  const header = {
    lastElementChild: { appendChild() {} },
    querySelector(sel) {
      if (sel === "[data-back-to-dashboard]") return made.length ? made[0] : (existing.attrs["data-back-to-dashboard"] !== undefined ? existing : null);
      if (publicPage && sel === 'a[href="login.html"]') return login;
      if (publicPage && sel === 'a[href="signup.html"]') return start;
      if (!publicPage && sel === 'a[href="dashboard.html"]') return existing;
      return null;
    },
  };
  const document = { readyState: "complete", cookie: "", querySelector: (s) => (s === "header" ? header : null), createElement: () => { const el = mk(); made.push(el); return el; } };
  const window = { GurostAPI: { isLoggedIn: () => loggedIn } };
  new Function("window", "document", src)(window, document);
  return { login, start, existing, made };
}

test("public page: signed in swaps the two links for the button; signed out changes nothing", () => {
  const on = makeDom({ loggedIn: true, publicPage: true });
  assert.strictEqual(on.login.removed, true);
  assert.strictEqual(on.start.replaced, on.made[0]);
  assert.strictEqual(on.made[0].textContent, "← Dashboard");
  assert.strictEqual(on.made[0].href, "dashboard.html");
  assert.strictEqual(on.made[0].style.fontSize, "13px");
  const off = makeDom({ loggedIn: false, publicPage: true });
  assert.strictEqual(off.login.removed, false);
  assert.strictEqual(off.start.replaced, null);
  assert.strictEqual(off.made.length, 0);
});

test("signed-in page: the existing Dashboard link gets the same button look, whatever it had before", () => {
  const d = makeDom({ loggedIn: false, publicPage: false });
  assert.strictEqual(d.made.length, 0, "no new element; the page's own link is restyled");
  assert.strictEqual(d.existing.textContent, "← Dashboard");
  assert.strictEqual(d.existing.style.fontSize, "13px");
  assert.strictEqual(d.existing.style.padding, "9px 14px");
  assert.strictEqual(d.existing.style.border, "0", "no leftover border that would change the size");
  assert.strictEqual(d.existing.attrs.class, undefined, "page classes (rounded-none, border...) removed");
});

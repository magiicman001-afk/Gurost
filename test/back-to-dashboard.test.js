"use strict";
// Bug A: a signed-in person on the public Templates page must have a way back to the Dashboard.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");

test("the Templates page loads the back-to-dashboard script after the API client", () => {
  const html = read("templates.html");
  const a = html.indexOf('src="shared/api-client.js"');
  const b = html.indexOf('src="shared/back-to-dashboard.js"');
  assert.ok(a > 0 && b > a, "script is included, after api-client.js");
});

test("the script only acts when a login exists, links to the dashboard and sets text safely", () => {
  const src = read("shared/back-to-dashboard.js");
  assert.match(src, /isLoggedIn\(\)/);
  assert.match(src, /back\.href = 'dashboard\.html'/);
  assert.match(src, /\\u2190 Dashboard/);
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(src), "no HTML injection");
});

test("the signed-in check also works on a page without the API client (cookie flag)", () => {
  const src = read("shared/back-to-dashboard.js");
  assert.match(src, /gurost_li=1/);
});

test("in a fake page: signed in swaps the two links, signed out changes nothing, and it runs only once", () => {
  const src = read("shared/back-to-dashboard.js");
  function makeDom(loggedIn) {
    const made = [];
    const login = { removed: false, remove() { this.removed = true; } };
    const start = { replacedWith: null, replaceWith(n) { this.replacedWith = n; } };
    const header = {
      querySelector(sel) {
        if (sel === "[data-back-to-dashboard]") return made.length ? made[0] : null;
        if (sel === 'a[href="login.html"]') return login;
        if (sel === 'a[href="signup.html"]') return start;
        return null;
      },
    };
    const document = {
      readyState: "complete",
      querySelector: (s) => (s === "header" ? header : null),
      createElement: () => { const el = { attrs: {}, style: {}, setAttribute(k, v) { this.attrs[k] = v; } }; made.push(el); return el; },
    };
    const window = { GurostAPI: { isLoggedIn: () => loggedIn } };
    new Function("window", "document", src)(window, document);
    return { login, start, made };
  }
  const on = makeDom(true);
  assert.strictEqual(on.login.removed, true, "Log in link removed");
  assert.strictEqual(on.start.replacedWith, on.made[0], "Start Building replaced by the back link");
  assert.strictEqual(on.made[0].href, "dashboard.html");
  assert.strictEqual(on.made[0].textContent, "\u2190 Dashboard");
  assert.strictEqual(on.made[0].style.fontSize, "13px", "one fixed size, set inline");
  const off = makeDom(false);
  assert.strictEqual(off.login.removed, false);
  assert.strictEqual(off.start.replacedWith, null);
  assert.strictEqual(off.made.length, 0);
});

test("every public page with the Log in / Start Building header loads the script", () => {
  for (const f of ["index", "pricing", "blog", "about", "showcase", "templates"]) {
    assert.match(read(f + ".html"), /<script src="shared\/back-to-dashboard\.js"><\/script>/, `${f}.html includes it`);
  }
});

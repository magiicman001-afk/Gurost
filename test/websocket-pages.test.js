// Run: node --test test/websocket-pages.test.js
// The three pages on /ws/guide: the login goes in the first message (never the
// URL), it is read fresh on every connect (a reconnect sends the current one),
// and the server's "log in again" / "not allowed" closes stop the reconnecting
// instead of retrying for ever.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");
const PAGES = { "app-builder.html": read("app-builder.html"), "builder.html": read("builder.html"), "shared/pulse-voice.js": read("shared/pulse-voice.js") };

// The body of the function that opens the socket, up to the next top-level function.
function connectBody(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} found`);
  const next = src.indexOf("\nfunction ", start + 10);
  return src.slice(start, next < 0 ? undefined : next);
}

for (const [file, src] of Object.entries(PAGES)) {
  test(`${file}: no user id or token in the socket URL`, () => {
    const urls = src.match(/new WebSocket\([^)]*\)/g) || [];
    assert.ok(urls.length >= 1);
    for (const u of urls) assert.doesNotMatch(u, /userId|token|apiKey|jwt/i, u);
  });

  test(`${file}: sends the API client's login message on open, built at that moment`, () => {
    assert.match(src, /addEventListener\(["']open["'],\s*\(\)\s*=>\s*\{?\s*(socket|socketForLogin)\.send\((window\.GurostAPI\?\.socketAuthMessage \? window\.)?GurostAPI\.socketAuthMessage\(\)/);
  });

  test(`${file}: a 4401 close hands over to the API client (one refresh, else the login page)`, () => {
    assert.match(src, /event\.code === 4401\)\s*(return socketLoginExpired\(id\)|window\.GurostAPI\?\.socketLoginExpired\?\.\(\))/);
    assert.doesNotMatch(src, /localStorage\.(get|set|remove)Item\(['"]gurost_jwt/, "no page reads or clears the token itself");
  });
}

for (const [file, fn] of [["app-builder.html", "connectGenerationSocket"], ["builder.html", "connectGenerationSocket"]]) {
  test(`${file}: the login is read inside ${fn}, so every reconnect sends a fresh one`, () => {
    assert.match(connectBody(PAGES[file], fn), /GurostAPI\.socketAuthMessage\(\)/);
  });

  test(`${file}: 4401 / 4403 / 1008 return before scheduleReconnect`, () => {
    const body = connectBody(PAGES[file], fn);
    const close = body.slice(body.indexOf("addEventListener('close'"));
    const stop401 = close.indexOf("event.code === 4401");
    const stop403 = close.indexOf("event.code === 4403 || event.code === 1008) return");
    const retry = close.indexOf("scheduleReconnect(id)");
    assert.ok(stop401 >= 0 && stop403 >= 0 && retry > stop401 && retry > stop403, "auth closes are handled before the retry");
  });
}

test("app-builder.html: back-off resets when the server lets the socket in, not on open", () => {
  const body = connectBody(PAGES["app-builder.html"], "connectGenerationSocket");
  assert.match(body, /addEventListener\('message', \(\) => \{ if \(buildWatch\) buildWatch\.attempts = 0; \}, \{ once: true \}\)/);
  assert.doesNotMatch(body, /addEventListener\('open', \(\) => \{ if \(buildWatch\) buildWatch\.attempts = 0/);
});

for (const file of ["app-builder.html", "builder.html"]) {
  test(`${file}: after a refresh the socket reconnects; if the session is over the page stops waiting`, () => {
    assert.match(PAGES[file], /GurostAPI\.socketLoginExpired\(\)\.then\(\(again\) => \(again \? scheduleReconnect\(id\) : stopWatchingBuild\(\)\)\)/);
  });
}

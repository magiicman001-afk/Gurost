"use strict";
// Run: node --test test/xss-scan.test.js
// The static XSS scanner (lib/xss-scan.js) and the rule it enforces on every page script in public/.
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../lib/xss-scan");

if (!S.hasParser()) {
  test("xss scanner (needs acorn installed)", { skip: "acorn not installed here" }, () => {});
  return;
}
const scan = (code) => S.scanSource(code, "t.js");

test("flags a raw value in an html template", () => {
  const f = scan("el.innerHTML = `<p>${user.name}</p>`;");
  assert.equal(f.length, 1);
  assert.match(f[0].why, /not escaped/);
});

test("flags string concatenation that builds html", () => {
  assert.equal(scan("el.innerHTML = '<b>' + name + '</b>';").length, 1);
});

test("flags a raw value in an attribute and an error message", () => {
  assert.equal(scan("x = `<a href=\"${url}\" title=\"${err.message}\">go</a>`;").length, 2);
});

test("accepts escaped values, numbers and literals", () => {
  assert.deepEqual(scan("x = `<p>${escapeHtml(a)} ${Number(b)} ${list.length} ${a ? 'x' : 'y'} ${n.toFixed(2)}</p>`;"), []);
});

test("accepts a .map().join() of safe html and rejects an unsafe one", () => {
  assert.deepEqual(scan("x = `<ul>${rows.map((r) => `<li>${escapeHtml(r.name)}</li>`).join('')}</ul>`;"), []);
  assert.equal(scan("x = `<ul>${rows.map((r) => `<li>${r.name}</li>`).join('')}</ul>`;").length, 1);
});

test("a const built from safe parts is safe; a parameter never is", () => {
  assert.deepEqual(scan("const pct = Math.round(a / b * 100); x = `<i style=\"width:${pct}%\"></i>`;"), []);
  assert.equal(scan("function f(v) { return `<i>${v}</i>`; }").length, 1);
});

test("a reviewed exception needs an xss-ok comment, on the line or the line above", () => {
  assert.deepEqual(scan("// xss-ok: constant\nx = `<p>${NAME}</p>`;"), []);
  assert.deepEqual(scan("x = `<p>${NAME}</p>`; // xss-ok: constant"), []);
  assert.equal(scan("x = `<p>${NAME}</p>`;").length, 1);
});

test("text that is not html is left alone", () => {
  assert.deepEqual(scan("x = `Hello ${name}, you have ${n} items`;"), []);
});

test("every page script in public/ escapes what it puts in html (no holes)", () => {
  const { scanAll } = require("../scripts/xss-scan");
  const found = scanAll();
  assert.deepEqual(found, [], "unescaped values:\n" + found.map((f) => `${f.file}:${f.line} ${f.why}  ${f.expr}`).join("\n"));
});

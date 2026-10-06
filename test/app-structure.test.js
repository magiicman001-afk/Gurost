// Run: node --test test/app-structure.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const { frontendSystemFor, BACKEND_SYSTEM } = require("../bots/app-bot")._internal;

test("frontend prompt asks for a real project structure", () => {
  const p = frontendSystemFor("A pre-order app for my bakery");
  for (const path of ["index.html", "src/App.jsx", "src/components/", "src/pages/", "src/styles/main.css", "src/api/client.js", "package.json"]) {
    assert.ok(p.includes(path), `missing ${path}`);
  }
  assert.match(p, /relative paths/);
});

test("backend prompt asks for entry, per-entity routes and endpoint docs", () => {
  for (const bit of ["package.json", "server.js", "routes/", "README.md"]) assert.ok(BACKEND_SYSTEM.includes(bit), `missing ${bit}`);
  assert.match(BACKEND_SYSTEM, /process\.env\.PORT/);
});

test("frontend prompt forbids external packages and keeps the preview-safe rules", () => {
  const p = frontendSystemFor("A pre-order app for my bakery");
  assert.match(p, /NO EXTERNAL PACKAGES/);
  assert.match(p, /react-router-dom/); // named only to forbid it
  assert.doesNotMatch(p, /use Radix UI primitives|@radix-ui\/react-\*/);
  assert.match(p, /location\.hash/);
  assert.match(p, /try\/catch/); // localStorage throws in the sandboxed preview
});

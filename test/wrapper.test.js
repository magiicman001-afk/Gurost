// Run: node --test test/wrapper.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { entriesFor, extractImages, safePath, packageProject } = require("../wrapper");

const APP = {
  type: "app",
  prompt: "A pre-order app for my bakery",
  appFiles: {
    frontend: [
      { path: "index.html", content: "<div id=root></div>" },
      { path: "src/App.jsx", content: "export default function App(){ return null; }" },
      { path: "src/styles/main.css", content: "body{margin:0}" }
    ],
    backend: [
      { path: "package.json", content: '{"main":"server.js","scripts":{"start":"node server.js"}}' },
      { path: "server.js", content: "const k = process.env.STRIPE_SECRET_KEY; app.listen(process.env.PORT || 3000);" },
      { path: "routes/orders.js", content: "module.exports = {};" }
    ],
    database: { engine: "postgres", schema: "CREATE TABLE orders (id serial);", rationale: "x" }
  }
};
const names = (es) => es.map((e) => e.name);

test("app files keep their paths and real content (the '0' and '1' bug)", () => {
  const es = entriesFor(APP);
  assert.deepEqual(names(es).filter((n) => !/^(README|\.env)/.test(n)).sort(), [
    "backend/package.json", "backend/routes/orders.js", "backend/server.js", "database/schema.sql",
    "frontend/index.html", "frontend/preview.html", "frontend/src/App.jsx", "frontend/src/styles/main.css"]);
  assert.equal(es.find((e) => e.name === "frontend/src/App.jsx").content, "export default function App(){ return null; }");
  assert.ok(!es.some((e) => /^(frontend|backend)\/\d+$/.test(e.name)));
  assert.ok(!es.some((e) => String(e.content).includes("[object Object]")));
  assert.equal(es.find((e) => e.name === "database/schema.sql").content, "CREATE TABLE orders (id serial);\n");
});

test("preview.html is a real standalone page containing the app's files", () => {
  const html = entriesFor(APP).find((e) => e.name === "frontend/preview.html").content;
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /src\/App\.jsx/);
  assert.match(html, /interface only/);
});

test(".env.example lists the keys the backend reads; README says how to run it", () => {
  const es = entriesFor(APP);
  assert.equal(es.find((e) => e.name === ".env.example").content, "STRIPE_SECRET_KEY=your_stripe_secret_key_here\n");
  const readme = es.find((e) => e.name === "README.md").content;
  assert.match(readme, /preview\.html/);
  assert.match(readme, /cd backend\nnpm install\nnpm start/);
  assert.match(readme, /- STRIPE_SECRET_KEY/);
});

test("older saved apps (a path-to-text map, schema at the top) still package", () => {
  const es = entriesFor({ type: "app", prompt: "x", appFiles: { frontend: { "src/App.jsx": "a" }, backend: { "server.js": "b" }, schema: "CREATE TABLE t();" } });
  assert.ok(names(es).includes("frontend/src/App.jsx") && names(es).includes("backend/server.js") && names(es).includes("database/schema.sql"));
});

test("paths from the model cannot climb out of the folder", () => {
  assert.equal(safePath("../../etc/passwd"), "etc/passwd");
  assert.equal(safePath("/abs/x.js"), "abs/x.js");
  assert.equal(safePath("a\\b\\c.js"), "a/b/c.js");
  const es = entriesFor({ type: "app", prompt: "x", appFiles: { frontend: [{ path: "../../evil.js", content: "x" }], backend: [], database: {} } });
  assert.ok(names(es).includes("frontend/evil.js"));
});

test("website: base64 images become real files, duplicates once, tiny ones stay inline", () => {
  const big = Buffer.alloc(900, 7).toString("base64"); // 1200 chars
  const tiny = "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const html = `<html><body><img src="data:image/png;base64,${big}"><img src="data:image/png;base64,${big}"><img src="data:image/gif;base64,${tiny}"></body></html>`;
  const { html: out, images } = extractImages(html);
  assert.equal(images.length, 1);
  assert.equal(images[0].name, "images/image-1.png");
  assert.deepEqual(images[0].content, Buffer.alloc(900, 7));
  assert.equal((out.match(/src="images\/image-1\.png"/g) || []).length, 2);
  assert.match(out, /data:image\/gif;base64,R0lGOD/);
});

test("website zip: index.html, images, README, env", () => {
  const big = Buffer.alloc(900, 9).toString("base64");
  const es = entriesFor({ type: "website", prompt: "Crumb & Co bakery", currentHtml: `<html><body><img src="data:image/jpeg;base64,${big}"><form></form><script>fetch("https://gurost.onrender.com/api/site-forms/abc")</script></body></html>` });
  assert.deepEqual(names(es), ["index.html", "images/image-1.jpg", ".env.example", "README.md"]);
  const readme = es.find((e) => e.name === "README.md").content;
  assert.match(readme, /^# crumb-co-bakery/);
  assert.match(readme, /Double-click `index\.html`/);
  assert.match(readme, /Submissions page/);
});

test("nothing built: throws before any zip is written", async () => {
  assert.throws(() => entriesFor({ type: "website", prompt: "x" }), /nothing built yet/);
  assert.throws(() => entriesFor({ type: "app", prompt: "x", appFiles: { frontend: [], backend: [] } }), /nothing built yet/);
  await assert.rejects(packageProject({ type: "website" }, fs.createWriteStream(path.join(os.tmpdir(), "never.zip"))), /nothing built yet/);
});

test("a real zip extracts to readable files", { skip: (() => { try { execFileSync("python3", ["--version"]); return false; } catch { return "python3 not available"; } })() }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wrap-"));
  const zip = path.join(dir, "out.zip");
  await packageProject(APP, fs.createWriteStream(zip));
  const out = path.join(dir, "x");
  execFileSync("python3", ["-c", "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", zip, out]);
  assert.equal(fs.readFileSync(path.join(out, "frontend/src/App.jsx"), "utf8"), "export default function App(){ return null; }");
  assert.equal(fs.readFileSync(path.join(out, "backend/routes/orders.js"), "utf8"), "module.exports = {};");
  assert.ok(fs.existsSync(path.join(out, "frontend/preview.html")));
  fs.rmSync(dir, { recursive: true, force: true });
});

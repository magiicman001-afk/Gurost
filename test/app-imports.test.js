// Run: node --test test/app-imports.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { externalImports, cleanPackageJson, repairExternalImports } = require("../lib/app-imports");
const { parseFileBlocks, isPlaceholderContent, completedFilePaths } = require("../lib/file-blocks");

const f = (path, content) => ({ path, content });
const block = (path, content) => `<<<FILE ${path}>>>\n${content}\n<<<END FILE>>>`;

test("externalImports finds packages the preview cannot load and ignores React and relative files", () => {
  const files = [
    f("src/App.jsx", `import React, { useState } from 'react';\nimport { Link } from "react-router-dom";\nimport Home from './pages/Home';\nimport * as Dialog from '@radix-ui/react-dialog';\nimport 'normalize.css';`),
    f("src/api/client.js", `const axios = require('axios');\nconst lazy = () => import("framer-motion");`),
    f("src/main.jsx", `import { createRoot } from 'react-dom/client';\nimport { jsx } from 'react/jsx-runtime';`),
    f("src/styles/main.css", `@import 'x';`)
  ];
  const got = externalImports(files).map((x) => `${x.path}:${x.spec}`).sort();
  assert.deepEqual(got, ["src/App.jsx:@radix-ui/react-dialog", "src/App.jsx:normalize.css", "src/App.jsx:react-router-dom", "src/api/client.js:axios", "src/api/client.js:framer-motion"]);
  assert.deepEqual(externalImports([f("a.jsx", "import x from './x'; import y from '../y'")]), []);
  assert.deepEqual(externalImports(null), []);
});

test("repair rewrites only the offending files, then package.json lists only React", async () => {
  const files = [
    f("src/App.jsx", `import { Link } from "react-router-dom";\nexport default function App(){ return <Link to="/">x</Link>; }`),
    f("src/pages/Home.jsx", `export default function Home(){ return <p>hi</p>; }`),
    f("package.json", JSON.stringify({ name: "a", dependencies: { react: "^18", "react-dom": "^18", "react-router-dom": "^6" } }))
  ];
  let seen = "";
  const out = await repairExternalImports(files, async (system, user) => {
    seen = user;
    return `<<<META>>>\n{"summary":"x"}\n<<<END META>>>\n${block("src/App.jsx", "export default function App(){ return <a href=\"#/\">x</a>; }")}`;
  });
  assert.equal(out.repaired, 1);
  assert.deepEqual(out.remaining, []);
  assert.ok(/react-router-dom/.test(seen) && !/Home\.jsx/.test(seen), "only the offending file is sent");
  assert.ok(!/react-router/.test(out.files[0].content));
  assert.equal(out.files[1], files[1], "other files untouched");
  assert.deepEqual(Object.keys(JSON.parse(out.files[2].content).dependencies), ["react", "react-dom"]);
});

test("a repair that fails or still imports a package never breaks the build", async () => {
  const files = [f("src/App.jsx", `import axios from "axios";`)];
  const failed = await repairExternalImports(files, async () => { throw new Error("boom"); });
  assert.equal(failed.files[0].content, files[0].content);
  assert.equal(failed.remaining.length, 1);
  const stillBad = await repairExternalImports(files, async () => block("src/App.jsx", `import axios from "axios";`));
  assert.equal(stillBad.remaining.length, 1);
  const clean = await repairExternalImports([f("a.jsx", "export default 1")], async () => { throw new Error("must not be called"); });
  assert.equal(clean.repaired, 0);
});

test("cleanPackageJson leaves the backend's package.json and broken JSON alone", () => {
  const be = f("backend/package.json", JSON.stringify({ dependencies: { express: "^4" } }));
  assert.equal(cleanPackageJson([be])[0], be);
  const bad = f("package.json", "{nope");
  assert.equal(cleanPackageJson([bad])[0], bad);
});

test("empty and 'line N' filler files are never accepted", () => {
  assert.equal(isPlaceholderContent(""), true);
  assert.equal(isPlaceholderContent("  \n \n"), true);
  assert.equal(isPlaceholderContent("line 0\nline 1\nline 2: \n..."), true);
  assert.equal(isPlaceholderContent("…"), true);
  assert.equal(isPlaceholderContent("const line = 0;\n// line 3"), false);
  assert.equal(isPlaceholderContent("line 1 of the poem is here"), false);
  const text = [block("src/App.jsx", "export default function App(){return null}"), block("src/pages/Ghost.jsx", "line 0\nline 1\nline 2"), block("src/Empty.jsx", "")].join("\n");
  assert.deepEqual(parseFileBlocks(text).files.map((x) => x.path), ["src/App.jsx"]);
  assert.deepEqual(completedFilePaths(text), ["src/App.jsx"], "progress never lists a filler file");
  assert.throws(() => parseFileBlocks(block("a.js", "line 0\nline 1")), /No usable files/);
});

/**
 * Wrapper - project packaging. Never puts a real API key value into the
 * zip; reuses api-key-detector.js's detectRequiredKeys() to know WHICH keys
 * the generated code needs, and writes only their names as placeholders into
 * .env.example. Real key values stay in Supabase (api-key-vault.js).
 *
 * What a project holds:
 *   website: project.currentHtml (one HTML document)
 *   app:     project.appFiles = { frontend: [{path, content}], backend: [{path, content}],
 *            database: { engine, schema, rationale } }
 * entriesFor(project) turns either into the files of the zip; packageProject
 * streams them out. Kept apart so the file list can be checked without a zip.
 */

const crypto = require("crypto");
const archiver = require("archiver");
const { detectRequiredKeys } = require("./api-key-detector");
const { buildPreviewDocument } = require("./public/shared/app-preview-doc");

// A path from model output, made safe for a zip: forward slashes, no leading
// slash, no "." or ".." parts (a zip with "../x" can write outside the folder
// it is extracted to).
function safePath(p) {
  const parts = String(p || "").replace(/\\/g, "/").split("/").filter((s) => s && s !== "." && s !== "..");
  return parts.join("/");
}

function asFileList(files) {
  if (Array.isArray(files)) return files.filter((f) => f && typeof f.path === "string" && typeof f.content === "string");
  if (files && typeof files === "object") return Object.entries(files).filter(([, c]) => typeof c === "string").map(([path, content]) => ({ path, content })); // older saved projects
  return [];
}

const IMAGE_EXT = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp", gif: "gif", "svg+xml": "svg" };

// Generated sites carry their images as base64 inside the HTML. Pull each one
// out to images/ and point the page at the file: the page stays readable and
// the images are real files the owner can reuse. Tiny placeholders stay inline.
function extractImages(html) {
  const images = [];
  const byHash = new Map();
  const out = html.replace(/data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=]{1000,})/gi, (whole, type, b64) => {
    const hash = crypto.createHash("sha1").update(b64).digest("hex");
    if (!byHash.has(hash)) {
      const name = `images/image-${byHash.size + 1}.${IMAGE_EXT[type.toLowerCase()] || "png"}`;
      byHash.set(hash, name);
      images.push({ name, content: Buffer.from(b64, "base64") });
    }
    return byHash.get(hash);
  });
  return { html: out, images };
}

function siteReadme(name, imageCount, formEndpoint) {
  return `# ${name}

A website made with Gurost.

## How to open it

1. Unzip this folder.
2. Double-click \`index.html\`. It opens in your browser; nothing to install.

## What's inside

- \`index.html\` - the whole site.
${imageCount ? `- \`images/\` - the ${imageCount} image${imageCount === 1 ? "" : "s"} used on the site.\n` : ""}- \`.env.example\` - not needed for a website.

## Good to know

- Photos linked from the internet (stock photos) need an internet connection to show.
- Fonts and styling load from the internet too, so the site looks best online.
${formEndpoint ? "- The contact and order forms send their messages to your Gurost account, where you can read them on the Submissions page. They keep working wherever you put the site.\n" : ""}
## Putting it online

Upload the folder to any static host (Netlify, Vercel, GitHub Pages, or your own web hosting). No server is needed.
`;
}

function appReadme(name, { requiredKeyNames, backendStart, hasBackend, hasSchema, engine }) {
  return `# ${name}

An app made with Gurost.

## What's inside

- \`frontend/\` - the React app (\`src/App.jsx\`, \`src/pages/\`, \`src/components/\`, \`src/styles/\`).
- \`frontend/preview.html\` - **double-click this to see the app's screens** in your browser. It needs an internet connection (it loads React from the web) and shows the interface only.
${hasBackend ? "- `backend/` - the server and its API. Its own README lists every endpoint.\n" : ""}${hasSchema ? `- \`database/schema.sql\` - the database tables (${engine || "SQL"}).\n` : ""}- \`.env.example\` - the settings the backend needs.

## Run the backend

\`\`\`
cd backend
npm install
${backendStart}
\`\`\`

Copy \`.env.example\` to \`.env\` and fill in your values first. Your real keys are not in this download; you can see them in your Gurost dashboard under Settings, API Keys.
${requiredKeyNames.length ? requiredKeyNames.map((k) => `- ${k}`).join("\n") : "(This app does not need any external API keys.)"}

## The frontend

The frontend is React source code. To run it as a full website, put it in a React build tool such as Vite (\`npm create vite@latest\`, then copy \`frontend/src\` into the new project), and point its API calls at your backend. \`preview.html\` is the quick way to look at it without any tools.
`;
}

function backendStartCommand(files) {
  const pkg = files.find((f) => safePath(f.path) === "package.json");
  if (pkg) {
    try {
      const j = JSON.parse(pkg.content);
      if (j.scripts?.start) return "npm start";
      if (j.main) return `node ${j.main}`;
    } catch { /* fall through */ }
  }
  const entry = files.find((f) => /^(server|index|app)\.js$/.test(safePath(f.path)));
  return `node ${entry ? safePath(entry.path) : "server.js"}`;
}

/**
 * The files of the zip: [{ name, content (string | Buffer) }].
 * Throws when there is nothing built to package.
 */
function entriesFor(project) {
  const projectName = (project.prompt || "gurost-project").slice(0, 40).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "gurost-project";
  const entries = [];
  const used = new Set();
  const add = (name, content) => {
    const n = safePath(name);
    if (!n || used.has(n)) return;
    used.add(n);
    entries.push({ name: n, content });
  };
  let requiredKeyNames = [];
  let readme;

  if (project.type === "app" && project.appFiles) {
    const frontend = asFileList(project.appFiles.frontend);
    const backend = asFileList(project.appFiles.backend);
    if (!frontend.length && !backend.length) throw new Error("This project has nothing built yet to wrap.");
    requiredKeyNames = detectRequiredKeys(backend).map((k) => k.varName);

    for (const f of frontend) add(`frontend/${f.path}`, f.content);
    if (frontend.length) add("frontend/preview.html", buildPreviewDocument(frontend.map((f) => ({ ...f, path: safePath(f.path) })), { standalone: true }));
    for (const f of backend) add(`backend/${f.path}`, f.content);
    const schema = project.appFiles.database?.schema ?? project.appFiles.schema; // .schema: older saved projects
    if (typeof schema === "string" && schema.trim()) add("database/schema.sql", schema.endsWith("\n") ? schema : `${schema}\n`);
    readme = appReadme(projectName, {
      requiredKeyNames,
      backendStart: backendStartCommand(backend),
      hasBackend: backend.length > 0,
      hasSchema: used.has("database/schema.sql"),
      engine: project.appFiles.database?.engine
    });
  } else if (project.currentHtml) {
    const { html, images } = extractImages(project.currentHtml);
    add("index.html", html);
    for (const img of images) add(img.name, img.content);
    readme = siteReadme(projectName, images.length, /\/api\/site-forms\//.test(html));
  } else {
    throw new Error("This project has nothing built yet to wrap.");
  }

  add(".env.example", requiredKeyNames.length
    ? requiredKeyNames.map((name) => `${name}=your_${name.toLowerCase()}_here`).join("\n") + "\n"
    : "# This project doesn't require any external API keys.\n");
  add("README.md", readme);
  return entries;
}

/**
 * Streams a zip archive to the given writable stream (an Express response).
 * Resolves when archiving finishes, rejects on an archiver error. The caller
 * sets the response headers first.
 */
async function packageProject(project, outputStream) {
  const entries = entriesFor(project); // throws before any bytes go out when there is nothing to pack
  const archive = archiver("zip", { zlib: { level: 9 } });

  const donePromise = new Promise((resolve, reject) => {
    archive.on("error", reject);
    outputStream.on("close", resolve);
    outputStream.on("finish", resolve);
  });

  archive.pipe(outputStream);
  for (const e of entries) archive.append(e.content, { name: e.name });
  await archive.finalize();
  return donePromise;
}

module.exports = { packageProject, entriesFor, extractImages, safePath };

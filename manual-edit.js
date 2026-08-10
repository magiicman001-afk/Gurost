/**
 * Manual Code Editing — real, and genuinely simple: get a file from a
 * real project, let the user edit its content directly, validate
 * before saving so a typo doesn't silently break the project.
 *
 * Validation is real but honestly scoped: a JS syntax check (the same
 * `node --check` mechanism self-healing.js and the require-path audit
 * already use) for .js files, and a basic well-formedness check for
 * .html — this catches a broken edit before it's saved, not a full
 * linter or type-checker.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

function getFile(project, filePath) {
  if (project.type === "website") {
    if (filePath !== "index.html") throw new Error("Website projects only have one editable file: index.html.");
    return { path: "index.html", content: project.currentHtml };
  }
  if (project.type === "app" && project.appFiles) {
    const all = [...project.appFiles.backend, ...project.appFiles.frontend];
    const file = all.find((f) => f.path === filePath);
    if (!file) throw new Error(`File "${filePath}" not found in this project.`);
    return file;
  }
  throw new Error("This project has no editable files yet.");
}

function listFiles(project) {
  if (project.type === "website") return project.currentHtml ? ["index.html"] : [];
  if (project.type === "app" && project.appFiles) {
    return [...project.appFiles.backend, ...project.appFiles.frontend].map((f) => f.path);
  }
  return [];
}

// Real HTML void elements — needed for the stack-based check below to
// correctly know which tags never need a closing pair.
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

async function validateEdit(filePath, content) {
  if (filePath.endsWith(".js")) {
    const tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gurost-edit-")), path.basename(filePath));
    try {
      fs.writeFileSync(tempFile, content, "utf-8");
      await execFileAsync("node", ["--check", tempFile], { timeout: 5000 });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: `Syntax error: ${err.stderr || err.message}` };
    } finally {
      fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
    }
  }
  if (filePath.endsWith(".html")) {
    // Real stack-based tag matching, not a raw open/close count — an
    // earlier version of this counted tags and allowed a tolerance
    // gap, which testing showed let a genuinely broken document (a
    // missing closing tag) through as "valid" because the count
    // difference fell inside the tolerance. This version actually
    // tracks nesting and catches that real case.
    const cleaned = content
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");

    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
    const stack = [];
    let match;
    while ((match = tagPattern.exec(cleaned)) !== null) {
      const full = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = full.startsWith("</");
      const isSelfClosing = full.endsWith("/>") || VOID_ELEMENTS.has(tagName);

      if (isClosing) {
        if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
          return { valid: false, error: `Found a closing </${tagName}> that doesn't match the currently open tag (expected ${stack[stack.length - 1] || "nothing"}).` };
        }
        stack.pop();
      } else if (!isSelfClosing) {
        stack.push(tagName);
      }
    }

    if (stack.length > 0) {
      return { valid: false, error: `${stack.length} unclosed tag(s): <${stack.join(">, <")}>` };
    }
    return { valid: true };
  }
  return { valid: true }; // other file types (CSS, JSON, etc.) — no specific check built, saved as-is
}

async function saveEdit(project, filePath, newContent, userId) {
  if (project.userId !== userId) throw new Error("You can only edit your own projects.");

  const validation = await validateEdit(filePath, newContent);
  if (!validation.valid) throw new Error(validation.error);

  if (project.type === "website") {
    project.currentHtml = newContent;
    return { saved: true, filePath };
  }

  const targetArray = project.appFiles.backend.find((f) => f.path === filePath)
    ? project.appFiles.backend
    : project.appFiles.frontend;
  const file = targetArray.find((f) => f.path === filePath);
  if (!file) throw new Error(`File "${filePath}" not found.`);
  file.content = newContent;

  return { saved: true, filePath };
}

module.exports = { getFile, listFiles, validateEdit, saveEdit };

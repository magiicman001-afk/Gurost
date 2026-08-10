/**
 * Runs app-bot's generated backend in an E2B sandbox before it's shown
 * to the user or deployed. Package is `e2b` (the base SDK, not the
 * deprecated `@e2b/sdk` or the `@e2b/code-interpreter` package — that
 * one's for single-snippet REPL execution like a Python cell, not
 * installing and running a multi-file npm project, which is what this
 * needs). `sandbox.files.write()`/`sandbox.commands.run()` match E2B's
 * current documented shape as of writing — verify against
 * https://e2b.dev/docs before relying on it in production, same caveat
 * as every other unverified-against-a-live-account integration in this
 * repo.
 *
 * Scope: Node/Express backends only. app-bot.js defaults to Express and
 * only picks FastAPI when it judges that a better fit, so this covers
 * the common case, not every possible output — a Python backend will
 * report skipped: true rather than silently pass.
 *
 * This does NOT cover the frontend. Testing generated React code by
 * actually running it belongs in the browser — that's what WebContainers
 * (StackBlitz) is for, and it's inherently client-side; there's nothing
 * for this Node backend to wire in server-side for that half. Point your
 * frontend preview UI at WebContainers directly when you build it.
 */

const { Sandbox } = require("e2b");

function detectRuntime(files) {
  if (files.some((f) => f.path.endsWith("package.json"))) return "node";
  if (files.some((f) => f.path.endsWith("requirements.txt"))) return "python";
  return "unknown";
}

function guessEntryFile(files) {
  const pkgFile = files.find((f) => f.path.endsWith("package.json"));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      if (pkg.main) return pkg.main;
    } catch {
      /* fall through to filename guessing */
    }
  }
  const candidates = ["index.js", "server.js", "app.js"];
  const found = files.find((f) => candidates.includes(f.path.split("/").pop()));
  return found ? found.path : "index.js";
}

const CRASH_SIGNS = /Error:|Cannot find module|EADDRINUSE|SyntaxError|UnhandledPromiseRejection|TypeError:/i;

async function runSandboxTest(files, { timeoutMs = 20000 } = {}) {
  const runtime = detectRuntime(files);
  if (runtime !== "node") {
    return {
      pass: null,
      skipped: true,
      reason: `Sandbox testing in this version only covers Node/Express backends — detected runtime: ${runtime}.`
    };
  }

  if (!process.env.E2B_API_KEY) {
    return { pass: null, skipped: true, reason: "E2B_API_KEY not configured — sandbox step skipped, not failed." };
  }

  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  const logs = [];

  try {
    for (const file of files) {
      await sandbox.files.write(file.path, file.content);
    }

    const install = await sandbox.commands.run("npm install", { timeoutMs: 120000 });
    logs.push({ step: "npm install", exitCode: install.exitCode, stderr: install.stderr?.slice(0, 1000) });
    if (install.exitCode !== 0) {
      return { pass: false, logs, errors: [`npm install failed:\n${install.stderr?.slice(0, 1500)}`] };
    }

    const entry = guessEntryFile(files);
    // Servers don't exit 0 on success — they keep running. Start it in
    // the background, wait a few seconds, then check the log for crash
    // signatures rather than expecting a clean exit code.
    const run = await sandbox.commands.run(
      `(node ${entry} > /tmp/gurost_server.log 2>&1 &) ; sleep 4 ; cat /tmp/gurost_server.log`,
      { timeoutMs }
    );
    logs.push({ step: "start server", output: run.stdout?.slice(0, 1500) });

    const crashed = CRASH_SIGNS.test(run.stdout || "");
    return {
      pass: !crashed,
      skipped: false,
      logs,
      errors: crashed ? [run.stdout.slice(0, 2000)] : []
    };
  } catch (err) {
    return { pass: false, skipped: false, logs, errors: [err.message] };
  } finally {
    await sandbox.kill().catch(() => {});
  }
}

module.exports = { runSandboxTest };

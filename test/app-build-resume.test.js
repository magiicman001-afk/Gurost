// Run: node --test test/app-build-resume.test.js
// Live failure 2026-10-08 13:44 UTC: Kimi K2.6 hit the 6000-token backend limit, the next model
// answered with only the summary block, the parser said "No files in the reply" and the build
// died with that raw text on screen. These tests cover the fix: a bigger budget with reasoning
// off, one retry on the next model, a [code-call] log line, plain error words, and a Retry that
// carries on from the stage that failed.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

// ---- app-bot with a scripted callClaude ------------------------------------------------------
const claudePath = require.resolve("../lib/claude-client");
const realClaude = require("../lib/claude-client");
let script = null; // (opts) => result | throws
const calls = [];
require.cache[claudePath].exports = { ...realClaude, callClaude: async (opts) => { calls.push(opts); return script(opts); } };
const appBot = require("../bots/app-bot");
require.cache[claudePath].exports = realClaude; // restore for the other tests in this file
const { callClaude, _parseJsonResponse } = realClaude;
const { callOpenRouter, _resetRateLimitRest } = require("../lib/openrouter-client");
const { parseFileBlocks } = require("../lib/file-blocks");
const b = require("../lib/app-build-state");

const SCHEMA_REPLY = { parsed: { engine: "postgres", schema: "CREATE TABLE pets (id int);", rationale: "r" }, usage: null };
const files = (...names) => names.map((n) => ({ path: n, content: `// ${n}\nconsole.log(1);` }));
const kindOf = (opts) => (/database architect|schema/i.test(opts.system.slice(0, 200)) && !opts.parse ? "schema" : /backend engineer/i.test(opts.system) ? "backend" : "frontend");

test.beforeEach(() => { calls.length = 0; _resetRateLimitRest(); });

// ---- 1. budget, reasoning, stage on the error ------------------------------------------------
test("the backend stage gets 12000 tokens and asks for no reasoning; every file stage logs and can retry", async () => {
  assert.equal(appBot._internal.BACKEND_MAX_TOKENS, 12000);
  script = (opts) => {
    const k = kindOf(opts);
    if (k === "schema") return SCHEMA_REPLY;
    return { parsed: { files: files(k === "backend" ? "server.js" : "src/App.jsx"), summary: "s", imageRequests: [] }, usage: null };
  };
  await appBot.buildAppStaged("p1", "a pet app", { plan: "pro" });
  const backend = calls.find((c) => kindOf(c) === "backend");
  const frontend = calls.find((c) => kindOf(c) === "frontend");
  assert.equal(backend.maxTokens, 12000);
  for (const c of [backend, frontend]) {
    assert.equal(c.reasoningOff, true);
    assert.equal(c.logLabel, `app-${kindOf(c)}`);
    assert.match(c.retryHint, /returned no files/);
    assert.equal(typeof c.newStopWhen, "function");
  }
});

test("a stage that fails puts its name on the error (schema / backend / frontend)", async () => {
  for (const failing of ["schema", "backend", "frontend"]) {
    script = (opts) => {
      const k = kindOf(opts);
      if (k === failing) throw new Error('No files in the reply (expected <<<FILE path>>> blocks). Start: <<<META>>>');
      return k === "schema" ? SCHEMA_REPLY : { parsed: { files: files("a.js"), summary: "", imageRequests: [] }, usage: null };
    };
    await assert.rejects(appBot.buildAppStaged("p", "x", { plan: "pro" }), (e) => e.stage === failing);
  }
});

// ---- 2. Retry carries on at the failed stage -------------------------------------------------
test("forced backend failure -> Retry resumes AT the backend (schema is not run again)", async () => {
  // First attempt: schema ok, backend fails.
  const seen = [];
  script = (opts) => {
    const k = kindOf(opts); seen.push(k);
    if (k === "schema") return SCHEMA_REPLY;
    throw new Error("No files in the reply (expected <<<FILE path>>> blocks). Start: <<<META>>>");
  };
  const project = b.beginBuild({ state: "IDLE", type: "app", prompt: "a pet app", userId: "u1", appFiles: null, history: [], stateHistory: [] });
  const onStage = (stage, status, data) => b.recordStage(project, stage, status, data);
  let failure;
  try { await appBot.buildAppStaged("p2", "a pet app", { plan: "pro", onStage }); } catch (e) { failure = e; }
  b.failBuild(project, failure);
  assert.deepEqual(seen, ["schema", "backend"]);
  assert.equal(project.buildError.stage, "backend");

  // Retry: what the server does.
  const resume = b.resumeFor(project, "u1");
  assert.ok(resume, "the failed build can be resumed");
  assert.equal(resume.backendFiles, null, "the backend never finished, so it runs again");
  b.restartBuild(project);
  assert.equal(project.state, "BUILDING");
  assert.equal(project.buildError, null);

  seen.length = 0;
  script = (opts) => {
    const k = kindOf(opts); seen.push(k);
    return { parsed: { files: files(k === "backend" ? "server.js" : "src/App.jsx"), summary: "s", imageRequests: [] }, usage: null };
  };
  const stages = [];
  const result = await appBot.buildAppStaged("p2", "a pet app", { plan: "pro", resume, onStage: (s, st) => stages.push(`${s}:${st}`) });
  assert.deepEqual(seen, ["backend", "frontend"], "starts at the backend; the schema is not asked for again");
  assert.equal(result.database.schema, "CREATE TABLE pets (id int);");
  assert.ok(stages.includes("schema:complete") && !stages.includes("schema:running"));
  assert.ok(stages.includes("backend:running"));
});

test("a failure in the frontend resumes at the frontend, reusing schema and backend", async () => {
  const project = b.beginBuild({ state: "IDLE", type: "app", prompt: "p", userId: "u1", appFiles: null, history: [], stateHistory: [] });
  b.recordStage(project, "schema", "complete", { schema: "CREATE TABLE a (id int);", engine: "postgres" });
  b.recordStage(project, "backend", "complete", { files: files("server.js") });
  const err = Object.assign(new Error("x"), { stage: "frontend" });
  b.failBuild(project, err);
  const resume = b.resumeFor(project, "u1");
  assert.equal(resume.backendFiles.length, 1);
  script = (opts) => ({ parsed: { files: files("src/App.jsx"), summary: "s", imageRequests: [] }, usage: null });
  await appBot.buildAppStaged("p3", "p", { plan: "pro", resume });
  assert.deepEqual(calls.map(kindOf), ["frontend"]);
});

test("resumeFor refuses anything but the owner's own failed app that still has a schema", () => {
  const failed = () => {
    const p = b.beginBuild({ state: "IDLE", type: "app", prompt: "p", userId: "u1", appFiles: null, history: [], stateHistory: [] });
    b.recordStage(p, "schema", "complete", { schema: "CREATE TABLE a (id int);", engine: "postgres" });
    return b.failBuild(p, new Error("boom"));
  };
  assert.ok(b.resumeFor(failed(), "u1"));
  assert.equal(b.resumeFor(failed(), "someone-else"), null, "another user's project");
  assert.equal(b.resumeFor(failed(), undefined), null);
  assert.equal(b.resumeFor(null, "u1"), null);
  const finished = failed(); b.finishBuild(finished);
  assert.equal(b.resumeFor(finished, "u1"), null, "a finished app is not retried");
  const noSchema = b.failBuild(b.beginBuild({ state: "IDLE", type: "app", prompt: "p", userId: "u1", appFiles: null, history: [], stateHistory: [] }), new Error("boom"));
  assert.equal(b.resumeFor(noSchema, "u1"), null, "nothing to reuse -> a fresh build");
  const site = failed(); site.type = "website";
  assert.equal(b.resumeFor(site, "u1"), null);
});

// ---- 3. plain error words --------------------------------------------------------------------
test("the user never sees parser text, model names or status codes", () => {
  const raw = [
    'No files in the reply (expected <<<FILE path>>> ... <<<END FILE>>> blocks). Start: <<<META>>>',
    'OpenRouter error (502) calling model "moonshotai/kimi-k2.6": upstream',
    'OpenRouter model "nvidia/nemotron-3-super-120b-a12b:free" was cut off (finish_reason: length). Raw: x',
    "Build timed out after 150s with no progress.",
    "The AI sent back a broken answer twice. Please try again.",
    "Cannot read properties of undefined (reading 'files')"
  ];
  for (const stage of ["schema", "backend", "frontend", undefined]) {
    for (const r of raw) {
      const msg = b.plainBuildError(Object.assign(new Error(r), { stage }));
      assert.doesNotMatch(msg, /<<<|OpenRouter|kimi|nemotron|moonshot|finish_reason|Raw:|\b\d{3}\b.*calling|undefined|files in the reply/i, msg);
      assert.match(msg, /Retry|try again/i);
    }
  }
  assert.match(b.plainBuildError(Object.assign(new Error(raw[0]), { stage: "backend" })), /writing the server code/);
  assert.match(b.plainBuildError(Object.assign(new Error(raw[3]), { stage: "frontend" })), /took too long while designing the screens/);
  // Already-plain messages pass through.
  assert.equal(b.plainBuildError(new Error("All models are busy. Please try again in 30 seconds.")), "All models are busy. Please try again in 30 seconds.");
});

test("failBuild stores the plain words and the stage; the raw text is not on the project", () => {
  const p = b.beginBuild({ state: "IDLE", type: "app", prompt: "p", userId: "u1", appFiles: null, history: [], stateHistory: [] });
  b.failBuild(p, Object.assign(new Error("No files in the reply (expected <<<FILE path>>>). Start: <<<META>>>"), { stage: "backend" }));
  assert.equal(p.state, "DONE");
  assert.equal(p.buildError.stage, "backend");
  assert.doesNotMatch(JSON.stringify(p.buildError), /<<<|No files/);
});

// ---- 4. callClaude: one retry on the next model, with the reminder ---------------------------
const CHAIN = "moonshotai/kimi-k2.6,anthropic/claude-sonnet-5,z-ai/glm-5.2,nvidia/nemotron-3-super-120b-a12b:free";
const reply = (model, text, finish = "stop") => ({ model, choices: [{ finish_reason: finish, message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
const META_ONLY = '<<<META>>>\n{"summary":"Express backend"}\n<<<END META>>>';
const WITH_FILES = `${META_ONLY}\n<<<FILE server.js>>>\nconsole.log("hi");\n<<<END FILE>>>`;

function mockFetch(replies) {
  const bodies = [];
  globalThis.fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    const r = replies.shift();
    if (r && r.__status) return { ok: false, status: r.__status, text: async () => r.__text };
    return { ok: true, json: async () => r };
  };
  return bodies;
}
const quiet = (fn) => async () => {
  const logs = []; const { log, warn, error } = console;
  console.log = (...a) => logs.push(a.join(" ")); console.warn = (...a) => logs.push(a.join(" ")); console.error = (...a) => logs.push(a.join(" "));
  try { await fn(logs); } finally { Object.assign(console, { log, warn, error }); }
};
const stage = { parse: parseFileBlocks, retryHint: "REMINDER-TEXT", logLabel: "app-backend", reasoningOff: true };
const msgs = [{ role: "user", content: "Business: pets" }];

test("a reply with no files is asked again ONCE, on the models after the one that answered, with the reminder", quiet(async (logs) => {
  const bodies = mockFetch([reply("anthropic/claude-sonnet-5", META_ONLY), reply("z-ai/glm-5.2", WITH_FILES)]);
  const r = await callClaude({ system: "sys", messages: msgs, model: CHAIN, maxTokens: 12000, ...stage });
  assert.equal(r.parsed.files.length, 1);
  assert.equal(r.modelUsed, "z-ai/glm-5.2");
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[1].models, ["z-ai/glm-5.2", "nvidia/nemotron-3-super-120b-a12b:free"], "next models only, not the one that failed");
  assert.match(bodies[1].messages.at(-1).content, /Business: pets\n\nREMINDER-TEXT/);
  assert.equal(bodies[0].messages.at(-1).content, "Business: pets", "the first request is unchanged");
  assert.ok(logs.some((l) => /\[code-call\] app-backend model=anthropic\/claude-sonnet-5 stop=stop cutoff=false chars=\d+ files=0 unusable=/.test(l)), logs.join("\n"));
  assert.ok(logs.some((l) => /\[code-call\] app-backend model=z-ai\/glm-5\.2 stop=stop .* files=1 .*\(retry\)/.test(l)));
}));

test("still no files after the retry -> the parser's error, no third attempt", quiet(async () => {
  const bodies = mockFetch([reply("anthropic/claude-sonnet-5", META_ONLY), reply("z-ai/glm-5.2", META_ONLY)]);
  await assert.rejects(callClaude({ system: "sys", messages: msgs, model: CHAIN, ...stage }), /No files in the reply/);
  assert.equal(bodies.length, 2);
}));

test("the last model in the chain answered with no files -> nothing left to try", quiet(async () => {
  const bodies = mockFetch([reply("nvidia/nemotron-3-super-120b-a12b:free", META_ONLY)]);
  await assert.rejects(callClaude({ system: "sys", messages: msgs, model: "nvidia/nemotron-3-super-120b-a12b:free", ...stage }), /No files in the reply/);
  assert.equal(bodies.length, 1);
}));

test("without a retryHint nothing changes: an unusable reply fails at once", quiet(async () => {
  const bodies = mockFetch([reply("anthropic/claude-sonnet-5", META_ONLY)]);
  await assert.rejects(callClaude({ system: "sys", messages: msgs, model: CHAIN, parse: parseFileBlocks }), /No files in the reply/);
  assert.equal(bodies.length, 1);
}));

test("a good reply logs one line: model, stop reason, length, files; cut-off models are listed", quiet(async (logs) => {
  mockFetch([reply("moonshotai/kimi-k2.6", "partial", "length"), reply("anthropic/claude-sonnet-5", WITH_FILES)]);
  await callClaude({ system: "sys", messages: msgs, model: CHAIN, ...stage });
  const line = logs.find((l) => l.startsWith("[code-call]"));
  assert.match(line, /model=anthropic\/claude-sonnet-5 stop=stop cutoff=false chars=\d+ files=1 skipped=\[moonshotai\/kimi-k2\.6:cut-off\/length\/7ch\]/);
  assert.ok(logs.some((l) => /moonshotai\/kimi-k2\.6 was cut off at the token limit \(stop=length, 7 chars, max_tokens=/.test(l)));
}));

// ---- 5. reasoning off ------------------------------------------------------------------------
test("reasoningOff sends reasoning:{enabled:false} on a paid chain; not asking leaves it out", quiet(async () => {
  let bodies = mockFetch([reply("moonshotai/kimi-k2.6", "ok")]);
  await callOpenRouter({ model: CHAIN, messages: msgs, reasoningOff: true });
  assert.deepEqual(bodies[0].reasoning, { enabled: false });
  bodies = mockFetch([reply("moonshotai/kimi-k2.6", "ok")]);
  await callOpenRouter({ model: CHAIN, messages: msgs });
  assert.equal("reasoning" in bodies[0], false);
}));

test("if the model rejects the setting: logged clearly, asked again without it, build continues", quiet(async (logs) => {
  const bodies = mockFetch([{ __status: 400, __text: '{"error":{"message":"Reasoning cannot be disabled for this model"}}' }, reply("moonshotai/kimi-k2.6", "ok")]);
  const r = await callOpenRouter({ model: CHAIN, messages: msgs, reasoningOff: true });
  assert.equal(r.text, "ok");
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0].reasoning, { enabled: false });
  assert.equal("reasoning" in bodies[1], false);
  assert.ok(logs.some((l) => /Reasoning-off was rejected for .*kimi-k2\.6.*continuing with the model's default/.test(l)));
}));

test("a 400 that is not about reasoning is not swallowed", quiet(async () => {
  mockFetch([{ __status: 400, __text: "bad request: messages" }]);
  await assert.rejects(callOpenRouter({ model: CHAIN, messages: msgs, reasoningOff: true }), /400/);
}));

// ---- 6. wiring (the server cannot be loaded here, so the source is checked) -------------------
test("the route accepts resumeProjectId, resumes only via buildState.resumeFor, and broadcasts the plain error", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(server, /rejectUnknownFields\(\["prompt", "dbEngine", "businessInfo", "resumeProjectId"\]\)/);
  assert.match(server, /buildState\.resumeFor\(earlier, req\.user\.id\)/);
  assert.match(server, /businessInfo,\n\s+resume,\n/);
  assert.match(server, /type: "error", error: project\.buildError\.error/);
  assert.doesNotMatch(server, /type: "error", error: err\.message \}\);\n  \}\n\}\);\n\napp\.post\("\/api\/app-builder\/pause"/);
});

test("the Retry button sends the failed project's id", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "app-builder.html"), "utf8");
  assert.match(html, /generateApp\(originalPrompt, \{ businessInfo: lastBusinessInfo, resumeProjectId: projectId \}\)/);
  assert.match(html, /resumeProjectId: opts\.resumeProjectId/);
});

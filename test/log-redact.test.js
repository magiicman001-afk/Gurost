"use strict";
const test = require("node:test");
const assert = require("node:assert");
const R = require("../lib/log-redact");

const SB = "sb_secret_AbCdEf0123456789xyzABCDEF";
const OR = "sk-or-v1-0123456789abcdef0123456789abcdef";
const GM = "AIzaSyA1234567890abcdefghijklmnopqrstuv";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9.abcdefghij1234567890";

test("key shapes become short markers", () => {
  assert.strictEqual(R.redactText(`key ${SB} used`), "key sb_secret_*** used");
  assert.strictEqual(R.redactText(OR), "sk-or-***");
  assert.strictEqual(R.redactText("sk-abcdefghijklmnopqrstuvwx"), "sk-***");
  assert.strictEqual(R.redactText(GM), "AIza***");
  assert.strictEqual(R.redactText(`token=${JWT}`), "token=eyJ***");
  assert.strictEqual(R.redactText(JWT), "eyJ***");
  assert.strictEqual(R.redactText("Authorization: Bearer abcdefghijklmnop1234"), "Authorization: Bearer ***");
  assert.strictEqual(R.redactText("GET /x?api_key=abcdefgh12345&a=1"), "GET /x?api_key=***&a=1");
  assert.strictEqual(R.redactText("postgres://u:hunter2hunter2@h/db"), "postgres://u:***@h/db");
});

test("exact env values are hidden whatever their shape", () => {
  R.refresh({ MY_SERVICE_TOKEN: "plain-odd-value-12345", NAME: "plain-odd-value-12345-not-secret" });
  assert.strictEqual(R.redactText("oops plain-odd-value-12345 here"), "oops *** here");
  R.refresh({});
});

test("short values and ordinary text are untouched", () => {
  R.refresh({ SOME_KEY: "short" });
  assert.strictEqual(R.redactText("a short answer, sk-learn is fine"), "a short answer, sk-learn is fine");
  R.refresh({});
});

test("never throws on odd input", () => {
  for (const v of [null, undefined, 42, {}]) assert.doesNotThrow(() => R.redactText(v));
  assert.doesNotThrow(() => R.redactAny({ a: SB }));
  assert.ok(!R.redactAny({ a: SB }).includes("AbCdEf"));
});

test("install wraps stdout and stderr, and uninstall restores", () => {
  const seen = [];
  const o1 = process.stdout.write, o2 = process.stderr.write;
  process.stdout.write = (c) => { seen.push(String(c)); return true; };
  process.stderr.write = (c) => { seen.push(String(c)); return true; };
  try {
    R.install(); R.install();
    process.stdout.write(`log ${SB}\n`);
    process.stderr.write(Buffer.from(`err ${GM}\n`));
    console.log(`via console ${OR}`);
  } finally {
    R.uninstall();
    process.stdout.write = o1; process.stderr.write = o2;
  }
  const all = seen.join("");
  for (const leak of ["AbCdEf", "SyA1234", "0123456789abcdef0123"]) assert.ok(!all.includes(leak), `leaked ${leak}`);
  assert.ok(all.includes("sb_secret_***") && all.includes("AIza***") && all.includes("sk-or-***"));
});

test("admin-ops redact covers shapes too", () => {
  const { redact } = require("../lib/admin-ops");
  assert.strictEqual(redact(`bad ${SB}`, {}), "bad sb_secret_***");
});

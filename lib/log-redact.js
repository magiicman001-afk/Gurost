"use strict";
/**
 * Keeps secrets out of the logs (Render keeps them, and the repo's logs are read by several people).
 *
 * Two layers, applied to everything written to stdout/stderr (so console.*, library output and Node's own messages are
 * all covered):
 *   1. Shapes: well-known key formats become a short, harmless marker (sb_secret_***, sk-***, AIza***, eyJ***, ...).
 *   2. Values: the exact value of every secret-looking environment variable (KEY, TOKEN, SECRET, PASSWORD, DSN, DATABASE_URL...)
 *      becomes ***, whatever shape it has.
 * Nothing is ever thrown from here: logging must keep working even if this file has a bug.
 */
const util = require("util");

// Order matters: longer, more specific shapes first.
const SHAPES = [
  [/sb_secret_[A-Za-z0-9_-]{8,}/g, "sb_secret_***"],
  [/sb_publishable_[A-Za-z0-9_-]{8,}/g, "sb_publishable_***"],
  [/sk-or-v1-[A-Za-z0-9_-]{8,}/g, "sk-or-***"],
  [/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-***"],
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/g, "sk-***"],
  [/\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/g, "$1_$2_***"],
  [/\bwhsec_[A-Za-z0-9]{8,}/g, "whsec_***"],
  [/AIza[0-9A-Za-z_-]{30,}/g, "AIza***"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "eyJ***"], // JWTs, including Supabase service-role keys
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g, "github_pat_***"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/g, "gh*_***"],
  [/\brnd_[A-Za-z0-9]{16,}/g, "rnd_***"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, "xox*-***"],
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi, "$1***"],
  [/((?:[?&]|\b)(?:api[_-]?key|apikey|access[_-]?token|token|secret|key)=)[^&\s"']{8,}/gi, "$1***"],
  [/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+(@)/gi, "$1***$2"],
];

const SECRET_NAME = /KEY|TOKEN|SECRET|PASSWORD|PASSPHRASE|DSN|DATABASE_URL|CREDENTIAL|PRIVATE|SALT/i;
const MIN_VALUE = 12; // shorter values would mangle ordinary words

let values = [];

/** Rebuild the list of exact secret values from the environment (call again after dotenv has loaded). */
function refresh(env = process.env) {
  values = [...new Set(Object.entries(env)
    .filter(([k, v]) => SECRET_NAME.test(k) && typeof v === "string" && v.trim().length >= MIN_VALUE)
    .map(([, v]) => v.trim()))]
    .sort((a, b) => b.length - a.length);
  return values.length;
}

/** Redact one string. `extraEnv` (optional) adds that environment's secrets too (for callers with their own env). */
function redactText(text, extraEnv) {
  let out = typeof text === "string" ? text : String(text);
  try {
    const list = extraEnv
      ? [...values, ...Object.entries(extraEnv).filter(([k, v]) => SECRET_NAME.test(k) && typeof v === "string" && v.trim().length >= 8).map(([, v]) => v.trim())]
      : values;
    for (const v of list) if (out.includes(v)) out = out.split(v).join("***");
    for (const [re, to] of SHAPES) out = out.replace(re, to);
  } catch {
    /* never break logging */
  }
  return out;
}

let installed = false;
const originals = {};

/** Wrap process.stdout.write and process.stderr.write. Safe to call twice. */
function install() {
  if (installed) return;
  installed = true;
  refresh();
  for (const name of ["stdout", "stderr"]) {
    const stream = process[name];
    const orig = stream.write.bind(stream);
    originals[name] = stream.write;
    stream.write = (chunk, ...rest) => {
      try {
        if (typeof chunk === "string") chunk = redactText(chunk);
        else if (Buffer.isBuffer(chunk)) {
          const s = chunk.toString("utf8");
          const r = redactText(s);
          if (r !== s) chunk = r;
        }
      } catch { /* write the original */ }
      return orig(chunk, ...rest);
    };
  }
}

/** Undo install() (tests). */
function uninstall() {
  if (!installed) return;
  for (const name of ["stdout", "stderr"]) process[name].write = originals[name];
  installed = false;
}

/** Redact anything printable: strings as they are, other values as util.inspect would show them. */
const redactAny = (v) => redactText(typeof v === "string" ? v : util.inspect(v, { depth: 5 }));

module.exports = { install, uninstall, refresh, redactText, redactAny, SHAPES };

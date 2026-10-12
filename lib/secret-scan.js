"use strict";
/**
 * Secret scanner (security spec 2.1). Finds API keys, tokens, private keys and password-like assignments in text.
 * Used by the git pre-commit hook, by CI, and (later) by the log scanner. The repo is PUBLIC: a key that reaches
 * GitHub is leaked for good, so this runs BEFORE the commit exists.
 *
 * Findings never contain the secret: only the file, line, kind and a masked preview (first 4 characters + ***).
 * A line carrying "secret-scan-ok" is skipped (fake keys in tests); say why next to it.
 */

const KINDS = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{16,}/],
  ["OpenRouter key", /sk-or-v1-[A-Za-z0-9_-]{16,}/],
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{16,}/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  ["Stripe key", /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{16,}/],
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["JWT (e.g. Supabase service role)", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ["Render key", /\brnd_[A-Za-z0-9]{20,}/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{20,}/],
  ["AWS access key id", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Private key block", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["Database URL with password", /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]{6,}@/],
  ["Bearer token", /\bBearer\s+[A-Za-z0-9._~+/=-]{30,}/],
];

// name = "long random-looking value"  (KEY, SECRET, TOKEN, PASSWORD names only)
const ASSIGN = /\b[A-Za-z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD)[A-Za-z0-9_]*["']?\s*[:=]\s*["']([A-Za-z0-9+/_=.-]{24,})["']/i;
const PLACEHOLDER = /(?:x{4,}|\*{3,}|your[-_]|example|placeholder|changeme|dummy|test|fake|sample|<[^>]+>|\$\{|process\.env)/i;

// Files that must never be committed, whatever they contain.
const FORBIDDEN_FILES = [/(^|\/)\.env(\.[\w-]+)?$/, /(^|\/)__auth-state\.json$/, /(^|\/)CLAUDE\.local\.md$/, /(^|\/)id_(?:rsa|ed25519|ecdsa)$/, /\.pem$/, /\.p12$/];
const ALLOWED_ENV_FILES = [/\.env\.example$/, /\.env\.sample$/];

const SKIP_PATH = /(^|\/)(node_modules|\.git)\//;
const SKIP_FILE = /(^|\/)package-lock\.json$|\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|gz|mp4|mp3)$/i;

function entropy(s) {
  const n = {};
  for (const c of s) n[c] = (n[c] || 0) + 1;
  return -Object.values(n).reduce((t, c) => t + (c / s.length) * Math.log2(c / s.length), 0);
}

const mask = (s) => `${s.slice(0, 4)}***`;

/** A JWT whose role is "anon" is Supabase's public key (it is meant to be in pages), so it is not a secret. */
function isPublicJwt(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return p && p.role === "anon";
  } catch { return false; }
}

/** Scan text. Returns [{ file, line, kind, preview }]. */
function scanText(text, file = "") {
  const out = [];
  const lines = String(text).split("\n");
  lines.forEach((line, i) => {
    if (line.length > 4000) line = line.slice(0, 4000);
    if (/secret-scan-ok/.test(line)) return;
    for (const [kind, re] of KINDS) {
      const m = re.exec(line);
      if (m && kind.startsWith("JWT") && isPublicJwt(m[0])) continue;
      if (m) { out.push({ file, line: i + 1, kind, preview: mask(m[0]) }); break; }
    }
    if (!out.length || out[out.length - 1].line !== i + 1 || out[out.length - 1].file !== file) {
      const a = ASSIGN.exec(line);
      if (a && !(a[1].startsWith("eyJ") && isPublicJwt(a[1])) && !PLACEHOLDER.test(a[1]) && entropy(a[1]) >= 3.5) out.push({ file, line: i + 1, kind: "Secret-looking value assigned to a key/token/password name", preview: mask(a[1]) });
    }
  });
  return out;
}

/** Is this path one that must never be committed? */
function forbiddenFile(path) {
  if (ALLOWED_ENV_FILES.some((re) => re.test(path))) return null;
  return FORBIDDEN_FILES.some((re) => re.test(path)) ? "This file holds secrets and must never be committed" : null;
}

const skipped = (path) => SKIP_PATH.test(path) || SKIP_FILE.test(path);

module.exports = { isPublicJwt, scanText, forbiddenFile, skipped, entropy, KINDS };

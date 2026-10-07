/**
 * Time-based one-time codes (TOTP, RFC 6238) for 2-step sign-in - the
 * 6-digit codes from Google Authenticator, 1Password, Authy and the like.
 * Node's own crypto only; no dependency.
 *
 *   newSecret()                  -> base32 secret to show once / put in a QR code
 *   otpauthUrl({ secret, account, issuer })
 *                                -> the URI authenticator apps scan
 *   verify(secret, code, { lastStep })
 *                                -> { ok, step } - accepts the current 30s
 *                                   window and one either side (clock drift);
 *                                   a step at or before lastStep is refused,
 *                                   so a code can't be used twice.
 */

const crypto = require("crypto");

const STEP_SECONDS = 30;
const DIGITS = 6;
const DRIFT_STEPS = 1;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i === -1) throw new Error("Invalid base32 secret.");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

// 160 bits, the size RFC 4226 recommends for HMAC-SHA1.
function newSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// HOTP (RFC 4226) for one counter value.
function codeAt(secretBuf, counter, digits = DIGITS) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", secretBuf).update(msg).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

const stepAt = (ms) => Math.floor(ms / 1000 / STEP_SECONDS);

function verify(secret, code, { now = Date.now(), lastStep = -1 } = {}) {
  const given = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(given)) return { ok: false };
  let key;
  try { key = base32Decode(secret); } catch { return { ok: false }; }
  if (key.length < 10) return { ok: false };
  const current = stepAt(now);
  // Every window is checked, each with a constant-time compare, before
  // answering - so the time taken doesn't reveal which window matched.
  let matched = -1;
  for (let step = current - DRIFT_STEPS; step <= current + DRIFT_STEPS; step++) {
    const match = crypto.timingSafeEqual(Buffer.from(codeAt(key, step)), Buffer.from(given));
    if (match && step > lastStep && matched === -1) matched = step;
  }
  return matched === -1 ? { ok: false } : { ok: true, step: matched };
}

function otpauthUrl({ secret, account, issuer = "Gurost" }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

module.exports = { newSecret, verify, otpauthUrl, base32Encode, base32Decode, codeAt, stepAt };

/**
 * Encrypts small secrets before they are stored (2-step sign-in secrets
 * first; other sensitive columns later). AES-256-GCM: a stolen database
 * copy alone does not reveal them, and any tampering is detected.
 *
 * Key: SECRETS_KEY - 32 random bytes, base64 (generate with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").
 * Stored as "v1:<iv>:<tag>:<ciphertext>" (base64 parts). The version prefix
 * leaves room for key rotation: a v2 key can be added while v1 values are
 * still readable, then re-encrypted.
 */

const crypto = require("crypto");

function keyFrom(env = process.env) {
  const raw = env.SECRETS_KEY;
  if (!raw) throw new Error("SECRETS_KEY is not set - 2-step sign-in can't store secrets yet.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SECRETS_KEY must be 32 bytes, base64-encoded.");
  return key;
}

function seal(plaintext, { key = keyFrom() } = {}) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

function open(sealed, { key = keyFrom() } = {}) {
  const [version, iv, tag, enc] = String(sealed || "").split(":");
  if (version !== "v1" || !iv || !tag || !enc) throw new Error("Unrecognised sealed value.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64")), decipher.final()]).toString("utf8");
}

module.exports = { seal, open, keyFrom };

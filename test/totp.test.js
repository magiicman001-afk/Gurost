// Run: node --test test/totp.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const totp = require("../lib/totp");
const box = require("../lib/secret-box");

// RFC 6238 appendix B: SHA-1 seed "12345678901234567890", 8-digit codes.
const RFC_SECRET = Buffer.from("12345678901234567890");
const RFC = [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]];

test("matches the RFC 6238 test vectors", () => {
  for (const [t, expected] of RFC) assert.equal(totp.codeAt(RFC_SECRET, totp.stepAt(t * 1000), 8), expected, `t=${t}`);
});

test("base32 round-trips; a new secret is 160 bits", () => {
  const buf = crypto.randomBytes(20);
  assert.deepEqual(totp.base32Decode(totp.base32Encode(buf)), buf);
  assert.equal(totp.base32Decode(totp.newSecret()).length, 20);
  assert.throws(() => totp.base32Decode("not*base32"));
});

test("accepts the current code and one step of clock drift either side, nothing further", () => {
  const secret = totp.newSecret();
  const key = totp.base32Decode(secret);
  const now = 1_800_000_000_000;
  const step = totp.stepAt(now);
  assert.equal(totp.verify(secret, totp.codeAt(key, step), { now }).ok, true);
  assert.equal(totp.verify(secret, totp.codeAt(key, step - 1), { now }).ok, true);
  assert.equal(totp.verify(secret, totp.codeAt(key, step + 1), { now }).ok, true);
  assert.equal(totp.verify(secret, totp.codeAt(key, step - 2), { now }).ok, false);
  assert.equal(totp.verify(secret, totp.codeAt(key, step + 2), { now }).ok, false);
});

test("a code can't be used twice (replay)", () => {
  const secret = totp.newSecret();
  const now = 1_800_000_000_000;
  const code = totp.codeAt(totp.base32Decode(secret), totp.stepAt(now));
  const first = totp.verify(secret, code, { now });
  assert.equal(first.ok, true);
  assert.equal(totp.verify(secret, code, { now, lastStep: first.step }).ok, false);
});

test("rejects malformed input without throwing", () => {
  const secret = totp.newSecret();
  for (const bad of ["", "12345", "1234567", "abcdef", null, undefined, "12 34 5x"]) assert.equal(totp.verify(secret, bad).ok, false);
  assert.equal(totp.verify("!!!", "123456").ok, false);
});

test("otpauth URL carries issuer, account and secret", () => {
  const url = totp.otpauthUrl({ secret: "JBSWY3DPEHPK3PXP", account: "admin@gurost.com" });
  assert.match(url, /^otpauth:\/\/totp\/Gurost%3Aadmin%40gurost\.com\?secret=JBSWY3DPEHPK3PXP&issuer=Gurost/);
});

test("secret box: round-trips, detects tampering, refuses a wrong key", () => {
  const key = crypto.randomBytes(32);
  const sealed = box.seal("JBSWY3DPEHPK3PXP", { key });
  assert.match(sealed, /^v1:/);
  assert.notEqual(box.seal("same", { key }), box.seal("same", { key }), "fresh IV every time");
  assert.equal(box.open(sealed, { key }), "JBSWY3DPEHPK3PXP");
  const parts = sealed.split(":");
  const flipped = Buffer.from(parts[3], "base64"); flipped[0] ^= 1;
  assert.throws(() => box.open([parts[0], parts[1], parts[2], flipped.toString("base64")].join(":"), { key }));
  assert.throws(() => box.open(sealed, { key: crypto.randomBytes(32) }));
});

test("secret box: a missing or short SECRETS_KEY is a clear error", () => {
  assert.throws(() => box.keyFrom({}), /SECRETS_KEY is not set/);
  assert.throws(() => box.keyFrom({ SECRETS_KEY: Buffer.alloc(16).toString("base64") }), /32 bytes/);
});

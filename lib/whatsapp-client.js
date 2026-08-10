/**
 * WhatsApp Cloud API client — low-level, real HTTP calls to Meta's
 * Graph API. Verified against current documentation before writing
 * this (multiple independent, recent sources), not assumed from
 * training data — the same discipline applied to every other external
 * API in this codebase.
 *
 * A REAL GAP IN WHAT WAS REQUESTED, FLAGGED RATHER THAN SILENTLY
 * WORKED AROUND: the four env vars listed in the request
 * (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN,
 * WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID) don't
 * include an app secret — but verifying that an incoming webhook
 * genuinely came from Meta (not a spoofed POST from anyone who finds
 * the URL) requires HMAC-verifying the `X-Hub-Signature-256` header
 * against the app secret. Added WHATSAPP_APP_SECRET as a fifth
 * required var. Skipping this check because it wasn't in the original
 * list would mean accepting unverified webhook payloads — not the
 * "safe" version of this feature.
 *
 * REAL OPERATIONAL CONSTRAINT, NOT OPTIONAL: WhatsApp only allows
 * free-form text replies within 24 hours of the customer's last
 * message. Outside that window, only pre-approved message templates
 * work — a real, separate Meta-side setup step (submit a template,
 * wait for approval), not something this code can create on its own.
 * This matters directly for "send order confirmations" — a
 * confirmation to someone who hasn't messaged recently needs a real
 * approved template, not free text, or Meta will reject it.
 */

const crypto = require("crypto");

const GRAPH_API_VERSION = "v21.0"; // current stable as of writing — Meta versions roughly twice a year, check before assuming this is still current in a year
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`${name} not configured — WhatsApp integration needs this to work.`);
  return process.env[name];
}

/**
 * Real send — free-form text. Only works within the real 24-hour
 * window; Meta's own API will reject it otherwise with a real error
 * this function surfaces rather than swallows.
 */
async function sendTextMessage(to, body) {
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const token = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } })
  });

  const data = await res.json();
  if (!res.ok) {
    const code = data.error?.code;
    if (code === 131047 || data.error?.message?.includes("24")) {
      throw new Error("Outside the 24-hour reply window — this recipient needs to message first, or this needs to be sent as an approved template instead of free text.");
    }
    throw new Error(`WhatsApp send failed: ${data.error?.message || res.statusText}`);
  }
  return { messageId: data.messages?.[0]?.id };
}

/**
 * Real send — approved template. Required outside the 24-hour window.
 * templateName must already exist and be approved in the Meta
 * Business dashboard — this function cannot create or approve one,
 * that's a real, separate, manual setup step.
 */
async function sendTemplateMessage(to, templateName, languageCode = "en_US", params = []) {
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const token = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: params.length ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: String(p) })) }] : []
      }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error?.code === 132001) {
      throw new Error(`Template "${templateName}" not found or not approved yet — check the Meta Business dashboard. Templates take real review time, this isn't instant.`);
    }
    throw new Error(`WhatsApp template send failed: ${data.error?.message || res.statusText}`);
  }
  return { messageId: data.messages?.[0]?.id };
}

/**
 * Real webhook subscription verification — the hub.challenge
 * handshake Meta uses to confirm you control the endpoint before it
 * starts sending real events.
 */
function verifyWebhookSubscription(query) {
  const verifyToken = requireEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === verifyToken) {
    return { verified: true, challenge: query["hub.challenge"] };
  }
  return { verified: false };
}

/**
 * Real signature verification — confirms an incoming webhook payload
 * actually came from Meta. Requires the RAW request body bytes, not
 * the parsed/re-serialized JSON — HMAC verification against a
 * re-serialized body can produce a different byte sequence than what
 * was actually sent and signed, and silently fail or silently pass
 * incorrectly. server.js wires this up with express.json's `verify`
 * option specifically to preserve the raw bytes for this reason.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const appSecret = requireEnv("WHATSAPP_APP_SECRET");
  if (!signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  // Real constant-time comparison — a naive === comparison leaks
  // timing information an attacker could use to guess the signature
  // byte by byte. Both buffers must be equal length for timingSafeEqual.
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { sendTextMessage, sendTemplateMessage, verifyWebhookSubscription, verifyWebhookSignature };

"use strict";
/**
 * The admin "Connected Tools" page: which outside tools are switched on, from environment variable PRESENCE only
 * (never a value) plus counts from our own tables (never addresses or tokens).
 * state: "on" | "partly" | "off".
 */
const livekit = require("./livekit");

function build({ env = process.env, gmail }) {
  const has = (k) => !!env[k];
  const tools = [];

  const g = gmail || { configured: false };
  const missing = [];
  if (!g.clientId) missing.push("GMAIL_CLIENT_ID");
  if (!g.clientSecret) missing.push("GMAIL_CLIENT_SECRET");
  if (!g.secretsKey) missing.push("SECRETS_KEY");
  let gState = g.configured ? "on" : (missing.length < 3 ? "partly" : "off");
  let gDetail = g.configured
    ? `Set up. ${g.connected == null ? "" : `${g.connected} account(s) connected, ${g.readingInbox || 0} reading the inbox. `}${g.table === "missing" ? "The gmail_connections table is missing: run docs/migrations/2026-10-16_gmail_connections.sql in Supabase." : ""}`.trim()
    : `Missing on Render: ${missing.join(", ")}.`;
  if (g.configured && g.table === "missing") gState = "partly";
  tools.push({ id: "gmail", name: "Gmail", state: gState, detail: gDetail, note: `Redirect address to register in the Google console: ${g.redirectUri || "(unknown)"}. Drafts and approved sends only; never deletes or archives.` });

  tools.push({ id: "calendar", name: "Calendar", state: "off", detail: "Not built yet (Business Assistant 2.0, phase 7).", note: "" });

  const lk = livekit.settings(env);
  tools.push({ id: "livekit", name: "Video calls (LiveKit)", state: lk.configured ? "on" : (has("LIVEKIT_URL") || has("LIVEKIT_API_KEY") ? "partly" : "off"), detail: lk.configured ? "Set up." : "Needs LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_SECRET on Render.", note: "" });
  tools.push({ id: "deepgram", name: "Voice (Deepgram)", state: has("DEEPGRAM_API_KEY") ? "on" : "off", detail: has("DEEPGRAM_API_KEY") ? "Key is set." : "DEEPGRAM_API_KEY is not set.", note: "" });
  tools.push({ id: "postmark", name: "Email alerts (Postmark)", state: has("POSTMARK_API_KEY") || has("POSTMARK_SERVER_TOKEN") ? "on" : "off", detail: has("POSTMARK_API_KEY") || has("POSTMARK_SERVER_TOKEN") ? "Key is set." : "No Postmark key is set.", note: "" });
  return { tools };
}

module.exports = { build };

/**
 * Postmark transactional email. `npm install postmark` (confirmed
 * current official package, v5.x). Requires POSTMARK_SERVER_TOKEN and a
 * sender address verified in your Postmark account (Sender Signatures
 * or a verified domain) — Postmark rejects sends from unverified
 * addresses, there's no way around that from this code.
 *
 * LAZY INITIALIZATION, ADDED THIS ROUND: same real bug class as
 * lib/db.js's Supabase client fix. Postmark's ServerClient constructor
 * calls token.trim() immediately, which throws a real, confirmed
 * TypeError at construction time if the token is undefined — meaning
 * this file's old module-level `new postmark.ServerClient(...)` would
 * crash the entire server at startup if POSTMARK_SERVER_TOKEN wasn't
 * set, exactly like the Supabase client did. Deferred the same way.
 */

const postmark = require("postmark");

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    throw new Error("POSTMARK_SERVER_TOKEN not configured — required to send any real email.");
  }
  _client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
  return _client;
}

const FROM = process.env.POSTMARK_FROM_EMAIL;

async function send({ to, subject, htmlBody, textBody, messageStream = "outbound" }) {
  if (!FROM) throw new Error("POSTMARK_FROM_EMAIL not configured — must be a verified sender in your Postmark account.");
  return getClient().sendEmail({
    From: FROM,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody || htmlBody.replace(/<[^>]+>/g, ""),
    MessageStream: messageStream // "outbound" for transactional, "broadcast" for the newsletter — set up the broadcast stream in Postmark's dashboard first
  });
}

async function sendWelcome(to, name) {
  return send({
    to,
    subject: "Welcome to Gurost",
    htmlBody: `<p>Hi ${name || "there"},</p><p>Welcome to Gurost — build with your voice. You're all set to start your first project.</p>`
  });
}

async function sendWaitlist(to) {
  return send({
    to,
    subject: "You're on the Gurost waitlist",
    htmlBody: `<p>Thanks for joining the waitlist — we'll email you the moment a spot opens up.</p>`
  });
}

async function sendLaunchAnnouncement(to) {
  return send({
    to,
    subject: "Gurost is live on Product Hunt today",
    htmlBody: `<p>We're live. If Gurost has been useful to you, an upvote today genuinely helps: [link].</p>`,
    messageStream: "broadcast"
  });
}

async function sendNewsletter(to, { subject, htmlBody }) {
  return send({ to, subject, htmlBody, messageStream: "broadcast" });
}

// Postmark's batch endpoint (client.sendEmailBatch) is the real way to
// send a newsletter/announcement to many recipients at once rather than
// looping sendNewsletter/sendLaunchAnnouncement per address — loop only
// for small lists (unit-testing, <20 recipients); for a real list, batch.
async function sendBatch(recipients, { subject, htmlBody, messageStream = "broadcast" }) {
  if (!FROM) throw new Error("POSTMARK_FROM_EMAIL not configured.");
  const textBody = htmlBody.replace(/<[^>]+>/g, "");
  const messages = recipients.map((to) => ({
    From: FROM,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: messageStream
  }));
  return getClient().sendEmailBatch(messages);
}

async function sendPasswordReset(to, resetUrl) {
  return send({
    to,
    subject: "Reset your Gurost password",
    htmlBody: `<p>Someone requested a password reset for this account. If that was you, click below — this link expires in 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email — your password hasn't changed.</p>`
  });
}

module.exports = { send, sendWelcome, sendWaitlist, sendLaunchAnnouncement, sendNewsletter, sendBatch, sendPasswordReset };

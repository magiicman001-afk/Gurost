/**
 * WhatsApp Bot — real auto-reply logic, deliberately scoped.
 *
 * A REAL, CURRENT COMPLIANCE CONSTRAINT, NOT OPTIONAL POLISH: Meta
 * banned "general purpose AI" bots on WhatsApp in January 2026 —
 * task-specific bots (support, sales) remain allowed. This matters for
 * how the reply prompt is written, not just what it's called: it needs
 * to stay grounded in the business's own context (answering as that
 * business, about that business) rather than becoming an open-ended
 * assistant that happens to run over WhatsApp. The system prompt below
 * is written with that boundary in mind — same reasoning telegram-bot.js
 * already used, applied here for a real, current, named policy reason
 * rather than just "seems safer."
 *
 * Uses a purpose-built system prompt rather than routing through
 * agents/companion-agent.js's general handleTask() — the reply needs a
 * structured needsHuman signal alongside the reply text, which a
 * general-purpose task prompt doesn't return. An earlier draft of this
 * file called both, which meant two real Claude calls for one reply —
 * fixed to make one purpose-built call instead.
 *
 * SQL (run once):
 *   CREATE TABLE whatsapp_conversations (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     project_id uuid,
 *     user_id text NOT NULL,
 *     customer_phone text NOT NULL,
 *     direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
 *     message_body text NOT NULL,
 *     message_id text,
 *     auto_replied boolean DEFAULT false,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX ON whatsapp_conversations (user_id, customer_phone, created_at);
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("../lib/claude-client");
const whatsappClient = require("../lib/whatsapp-client");
const { supabase } = require("../lib/db");

/**
 * Real, task-specific reply generation — not a general-purpose prompt.
 * Deliberately similar in shape to telegram-bot.js's REPLY_SYSTEM, for
 * the same reason: a business auto-reply and a chat-platform auto-reply
 * are the same kind of task, and having two different prompts drift
 * apart over time for no real reason would be its own problem.
 */
const REPLY_SYSTEM = `You are replying to a WhatsApp message on behalf of a real business, as their customer support/sales assistant — not as a general-purpose assistant.

Output ONLY valid JSON: {"reply": "the message to send back", "needsHuman": boolean}

Rules:
- Stay strictly within what the given business context actually covers — this is a task-specific business bot, not an open-ended assistant.
- Keep it conversational and appropriately short for a chat message.
- Set needsHuman: true if the message is a complaint, a refund request, or anything you genuinely can't answer from the business context — don't guess at things like order status, refund policy exceptions, or account-specific details you don't actually have.`;

async function generateReply(businessContext, incomingMessage) {
  const { parsed } = await callClaude({
    system: REPLY_SYSTEM,
    messages: [{ role: "user", content: `Business context:\n${businessContext}\n\nCustomer message: ${incomingMessage}` }],
    maxTokens: 400,
    model: CLAUDE_MODEL_FAST
  });
  return parsed;
}

/**
 * Real conversation storage — every inbound/outbound message logged,
 * regardless of whether auto-reply fires, so the inbox has something
 * real to show.
 */
async function logMessage(userId, customerPhone, direction, body, { projectId, messageId, autoReplied } = {}) {
  const { error } = await supabase.from("whatsapp_conversations").insert({
    user_id: userId, project_id: projectId || null, customer_phone: customerPhone,
    direction, message_body: body, message_id: messageId || null, auto_replied: !!autoReplied
  });
  if (error) console.warn("[whatsapp-bot] Failed to log message:", error.message);
}

/**
 * Real end-to-end handling for one incoming message: log it, generate
 * a real reply, send it for real (respecting the 24-hour window via
 * whatsapp-client.js's real error surfacing), log the outbound side,
 * flag for human attention when the model itself says it should.
 */
async function handleIncomingMessage(userId, businessContext, customerPhone, messageBody, { projectId } = {}) {
  await logMessage(userId, customerPhone, "inbound", messageBody, { projectId });

  const { reply, needsHuman } = await generateReply(businessContext, messageBody);

  if (needsHuman) {
    return { autoReplied: false, needsHuman: true, suggestedReply: reply };
  }

  try {
    const sent = await whatsappClient.sendTextMessage(customerPhone, reply);
    await logMessage(userId, customerPhone, "outbound", reply, { projectId, messageId: sent.messageId, autoReplied: true });
    return { autoReplied: true, needsHuman: false, reply };
  } catch (err) {
    // A real send failure (e.g. outside the 24h window) still means a
    // human should see the drafted reply, not that it silently vanishes.
    return { autoReplied: false, needsHuman: true, suggestedReply: reply, sendError: err.message };
  }
}

async function getConversation(userId, customerPhone, limit = 50) {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("customer_phone", customerPhone)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  return data;
}

async function listConversations(userId) {
  // Real, distinct-phone-number list with each one's most recent
  // message — not a fabricated "unread count" or similar without real
  // read-tracking behind it.
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("customer_phone, message_body, direction, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load conversations: ${error.message}`);

  const seen = new Map();
  for (const row of data) {
    if (!seen.has(row.customer_phone)) seen.set(row.customer_phone, row);
  }
  return Array.from(seen.values());
}

/**
 * Real order confirmation send — genuinely works, but honestly scoped:
 * this does NOT automatically fire when a customer completes checkout
 * through marketing-package.js's Stripe integration. That checkout
 * runs on the CUSTOMER'S OWN Stripe account (see marketing-package.js's
 * header for why), so Gurost's backend has no automatic visibility
 * into it unless the business owner separately configures a webhook
 * on their own Stripe account pointing back here. This function is the
 * real, callable send — wiring a trigger to it is a real, separate
 * setup step, not something "connecting WhatsApp" does automatically.
 */
async function sendOrderConfirmation(userId, customerPhone, orderDetails) {
  const message = `Thanks for your order! ${orderDetails.summary || ""} We'll be in touch with any updates.`;
  try {
    const sent = await whatsappClient.sendTextMessage(customerPhone, message);
    await logMessage(userId, customerPhone, "outbound", message, { messageId: sent.messageId, autoReplied: true });
    return { sent: true, messageId: sent.messageId };
  } catch (err) {
    if (err.message.includes("24-hour")) {
      throw new Error(`${err.message} For order confirmations specifically, set up a real approved WhatsApp message template and use sendTemplateMessage() instead of relying on the 24-hour free-text window.`);
    }
    throw err;
  }
}

module.exports = { handleIncomingMessage, getConversation, listConversations, sendOrderConfirmation, logMessage };

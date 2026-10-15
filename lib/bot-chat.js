"use strict";
/**
 * One chat turn with one of the 8 faces (Planner, Designer, ...), with that bot's personality.
 * Everything it needs comes in through `deps`, so the flow is tested with stand-ins (no server, database or model).
 * run() never throws: it returns { status, body }. body = { reply, catchphrase, bot } or { error }.
 * Drafts and advice only: no tools here, so nothing can be sent, published or changed from this route.
 */
const personalities = require("./bot-personalities");

const MAX_HISTORY = 10;
const MAX_CHARS = 4000;

function cleanHistory(history) {
  return (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
}

function createBotChat(deps) {
  const { claudeClient, modelRouter } = deps;

  async function run({ userId, plan, ip, botId, message, history = [], context = "" }) {
    if (!personalities.has(botId)) return { status: 404, body: { error: "Unknown assistant." } };
    const text = String(message || "").trim().slice(0, MAX_CHARS);
    if (!text) return { status: 400, body: { error: "Write a message first." } };
    try {
      const task = text.length > 1500 ? "long_document" : "simple_reply";
      const chain = modelRouter.modelFor(task, plan);
      if (modelRouter.recordUse) modelRouter.recordUse({ task, plan, chain });
      const out = await claudeClient.callClaude({
        system: personalities.systemPrompt(botId, context),
        messages: [...cleanHistory(history), { role: "user", content: text }],
        maxTokens: 700,
        model: chain,
        parse: (t) => String(t || "").trim(),
        context: { userId, ip }
      });
      const reply = String((typeof out === "string" ? out : out && out.parsed) || "").trim();
      if (!reply) throw new Error("The AI sent back an empty answer.");
      return { status: 200, body: { reply: String(reply), catchphrase: personalities.catchphrase(botId, "done"), bot: botId } };
    } catch (err) {
      return { status: 502, body: { error: deps.friendlyError ? deps.friendlyError(err) : "I could not answer just now. Please try again in a moment." } };
    }
  }
  return { run };
}

module.exports = { createBotChat, cleanHistory };

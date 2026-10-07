/**
 * One department-bot chat turn, shared by the text route and the voice route.
 * Everything it needs is passed in (`deps`), so the whole flow can be tested
 * with stand-ins and no server, database or model.
 *
 * run() never throws: it returns { status, body }, where body is either
 * { reply, draft, toolsUsed, proposals, approvals } or { error }.
 */
function createDepartmentChat(deps) {
  const { botPrefs, db, deptBots, botMemory, modelRouter, toolLoop, claudeClient, memoryExtract, freeModel, approvals } = deps;

  async function run({ userId, plan, ip, botId, message, history = [] }) {
    try {
      const { data, error } = await botPrefs();
      if (error) throw new Error(error.message);
      if (!data && botId === "custom") return { status: 400, body: { error: "Tell your custom bot what it should help with first." } };
      const cal = data ? deptBots.normalizeCalibration({ ...(data.profile || {}), tone: data.tone, signature: data.signature }, botId) : deptBots.normalizeCalibration({}, botId);

      // Saved history and notes (shared by all of this user's bots). If the
      // database is unavailable the chat carries on with what the page sent.
      const prep = await botMemory.prepareChat(db, userId, botId, history);
      const system = deptBots.buildSystemPrompt(botId, cal) + (prep.memoryBlock ? "\n\n" + prep.memoryBlock : "");

      // The model comes from the kind of task (long document, sums, drafting) and the plan.
      const task = modelRouter.classifyDepartmentMessage(botId, message);
      const modelChain = modelRouter.modelFor(task, plan);
      modelRouter.recordUse({ task, plan, chain: modelChain });

      // The bot may use tools (calculator, dates, exchange rates, drafts) before it answers.
      const tooled = await toolLoop.runWithTools({
        system,
        messages: [...prep.history, { role: "user", content: message }],
        ctx: { userId, db, requestApproval: approvals ? (tool, args) => approvals.create(db, { userId, botType: botId, tool, args }) : undefined },
        call: (a) => claudeClient.callClaude({ ...a, maxTokens: 1500, model: modelChain, parse: (t) => String(t || "").trim(), context: { userId, ip } })
      });
      if (tooled.incomplete) throw new Error("The AI sent back an empty answer.");
      const { reply, draft } = deptBots.parseReply(tooled.text);
      const toolsUsed = [...new Set(tooled.toolsUsed.filter((t) => t.ok).map((t) => t.tool))];
      if (!reply && !draft) throw new Error("The AI sent back an empty answer.");

      const stored = prep.stored && await botMemory.recordExchange(db, userId, botId, message, (reply ? reply + "\n\n" : "") + (draft ? "--- DRAFT ---\n" + draft + "\n--- END DRAFT ---" : ""));
      // Not awaited: noting anything lasting the user said must never slow the reply.
      if (stored) {
        memoryExtract.learnFromExchange({
          userText: message, botType: botId,
          call: (a) => claudeClient.callClaude({ ...a, model: freeModel, context: { userId, ip } }),
          list: () => botMemory.listMemory(db, userId),
          save: (items) => botMemory.rememberItems(db, userId, items)
        });
      }
      return { status: 200, body: { reply, draft, toolsUsed, proposals: tooled.proposals, approvals: tooled.approvals || [] } };
    } catch (err) {
      console.error("[department-bots] chat failed:", err.message);
      return { status: 500, body: { error: /OPENROUTER|credit|402/i.test(err.message) ? "The AI service needs credits or a key right now. Please try again later." : "The bot could not answer just now. Please try again." } };
    }
  }

  return { run };
}

module.exports = { createDepartmentChat };

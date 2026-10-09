/**
 * The voice of the AI inside Gurost: status lines, friendly wording, the honesty rules,
 * the avatar, and the filter that keeps AI model names away from people.
 *
 * The AI's NAME and AVATAR are not set here: they come from brand-config.js (the one
 * place to rename it). Works in the browser (window.GurostAI, with brand-config.js loaded
 * first) and in Node (require), so the pages, the server and the tests share the words.
 *
 * Honesty rule: the name is the name of Gurost's assistant. It is not a model
 * Gurost trained, and it never claims to be. Asked which AI is behind it, it says
 * "I can't share that." It never denies being an AI. See IDENTITY_RULE.
 *
 * Model names stay out of everything the user reads: publicText() turns any text
 * that mentions a model or AI provider into a friendly message in the AI's name.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostAI = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var config = typeof module === "object" && module.exports ? require("./brand-config") : self.GurostBrandConfig;
  if (!config) throw new Error("ai-brand.js needs brand-config.js loaded first");
  var NAME = config.NAME;
  var AVATAR = config.AVATAR;
  var CANT_SHARE = "I can't share that.";

  // Words and slugs that identify a model or an AI provider. Used by publicText()
  // and by the test that keeps them out of the user-facing text.
  var MODEL_WORDS = [
    "Claude", "Anthropic", "Sonnet", "Opus", "Haiku",
    "GPT", "ChatGPT", "OpenAI", "o1", "o3",
    "Gemini", "Gemma", "Imagen", "Veo", "Nano Banana",
    "DeepSeek", "GLM", "Zhipu", "Qwen", "Kimi", "Moonshot", "Mistral", "Mixtral", "Llama", "Nemotron", "Grok", "xAI",
    "OpenRouter", "FLUX", "Black Forest Labs"
  ];
  var MODEL_RE = new RegExp(
    "(?:\\b(?:anthropic|openai|google|z-ai|nvidia|qwen|meta-llama|mistralai|deepseek|moonshotai|x-ai|black-forest-labs)\\/[\\w.\\-:]+)" +
    "|(?:\\b(?:" + MODEL_WORDS.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?![A-Za-z]))",
    "i"
  );
  // A name may be followed by a version number ("Qwen3", "gemini2.5"), so the end test is "not a letter".
  // "o1" / "o3" are only model names as whole tokens, never inside words like "to3".
  function mentionsModel(text) {
    var s = String(text == null ? "" : text);
    var m = MODEL_RE.exec(s);
    if (!m) return false;
    // A bare "o1"/"o3" is too likely to be something else (a room, a code); only count them next to GPT-ish context.
    if (/^o[13]$/i.test(m[0])) return /\b(openai|gpt|model)\b/i.test(s);
    return true;
  }

  // What went wrong upstream, in plain words, so the person is told the true thing. The order matters:
  // "the free providers also failed" beats "no credit", which beats "rate limit", which beats the rest.
  var FREE_FAILED_RE = /free providers also failed/i;
  var NO_CREDIT_RE = /\b(402|insufficient credits?|out of credits?|no credits?|credits? (?:ran|have run) (?:low|out)|payment|billing)\b/i;
  var RATE_LIMIT_RE = /\b(429|rate.?limit(?:ed)?|too many requests|quota|RESOURCE_EXHAUSTED)\b/i;
  var BUSY_RE = /\b(overloaded|capacity|(?:all|every) (?:free )?models? (?:are busy|returned empty|failed)|models? are busy|503|502|504)\b/i;
  // Text that came from an upstream AI call even when no model is named in it.
  var UPSTREAM_RE = /free providers also failed|error \((?:402|429|5\d\d)\)|insufficient credits?|(?:all|every) (?:free )?models? (?:are busy|returned empty|failed)/i;

  var MESSAGES = {
    freeFailed: "All AI providers are temporarily unavailable. Please try again.",
    noCredit: "Our AI credits ran low. Top up to keep building.",
    rateLimit: "We've hit today's free limit. Please try again tomorrow or top up.",
    busy: "Our AI is temporarily unavailable. Try again in a moment.",
    snag: NAME + " hit a snag. Please try again in a moment."
  };

  // Text that is safe to show a person. Anything naming a model or provider, or coming from a failed AI call,
  // becomes a plain line saying what actually happened (the full error stays in the server log).
  function publicText(text) {
    var s = String(text == null ? "" : text);
    if (!mentionsModel(s) && !UPSTREAM_RE.test(s)) return s;
    if (FREE_FAILED_RE.test(s)) return MESSAGES.freeFailed;
    if (NO_CREDIT_RE.test(s)) return MESSAGES.noCredit;
    if (RATE_LIMIT_RE.test(s)) return MESSAGES.rateLimit;
    if (BUSY_RE.test(s)) return MESSAGES.busy;
    return MESSAGES.snag;
  }

  var STATUS = {
    thinking: NAME + " is thinking…",
    analyzing: NAME + " is analyzing…",
    building: NAME + " is building…",
    builtSite: NAME + " built your site.",
    builtApp: NAME + " built your app.",
    done: NAME + " is done.",
    found: function (n) { return n === 0 ? NAME + " found no issues." : NAME + " found " + n + " issue" + (n === 1 ? "" : "s") + "."; }
  };

  // Voice: friendly, British, helpful. First person, short, no jargon.
  var VOICE = {
    noticed: "I noticed something. Here's what I'd try.",
    ready: "Looking good. Ready to launch?",
    hello: "Hello, I'm " + NAME + ". Tell me what you'd like to do.",
    cleanAudit: "Lovely - nothing needed fixing.",
    retry: "That didn't work. Shall we try again?"
  };

  // The end-of-build report as plain lines for the conversation feed. report comes from the
  // server (lib/app-build-state.js buildReport) and holds only what was really counted.
  function buildSummary(report) {
    var r = report || {};
    var lines = [];
    var s = Math.max(0, Math.round(Number(r.seconds) || 0));
    lines.push("Build complete (" + (s >= 60 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : s + "s") + ").");
    if (r.found === 0) lines.push("No issues found.");
    else if (r.found > 0) {
      var line = r.found + " issue" + (r.found === 1 ? "" : "s") + " found. " + (r.fixed || 0) + " fixed.";
      if (r.remaining > 0) line += " " + r.remaining + " need" + (r.remaining === 1 ? "s" : "") + " your attention.";
      lines.push(line);
    }
    if (r.verified === false) lines.push("I couldn't confirm the app runs cleanly, so please look over the code panel.");
    return lines;
  }

  // The honesty rules, added to every prompt on the server (security.withGuardrail).
  // They name no model, and only cover talking about itself, so a site Gurost builds
  // about AI products is unaffected.
  var IDENTITY_RULES = [
    "If anyone asks which AI, model, company or technology is behind you, or what model you run on, reply exactly: \"" + CANT_SHARE + "\" and offer to help with their task.",
    "Never deny being an AI. Never say or imply that Gurost trained or built you as its own model. Never say which AI model or company is behind you."
  ].join("\n");
  // The same plus who you are, for conversational surfaces that speak as the AI.
  var IDENTITY_RULE = "You are " + NAME + ", Gurost's AI assistant. Be friendly, clear and helpful, and use British spelling.\n" + IDENTITY_RULES;

  // The avatar: the configured emoji in a small round Gurost-gradient badge. Plain HTML, so it
  // looks the same on every page and needs no image file. px is the width and height.
  function avatar(px) {
    var n = Math.max(12, Math.min(64, Number(px) || 24));
    return '<span role="img" aria-label="' + NAME + '" style="display:inline-flex;align-items:center;justify-content:center;width:' + n + "px;height:" + n + "px;border-radius:50%;background:linear-gradient(135deg,#FEB246,#FF8C00);font-size:" + Math.round(n * 0.58) + 'px;line-height:1;flex-shrink:0">' + AVATAR + "</span>";
  }

  // Fills the page's placeholders from the config: <span data-brand-name></span> becomes the
  // name and <span data-ai-avatar="40"></span> becomes the avatar.
  function fillPage(doc) {
    var d = doc || (typeof document !== "undefined" ? document : null);
    if (!d) return;
    Array.prototype.forEach.call(d.querySelectorAll("[data-brand-name]"), function (el) { el.textContent = NAME; });
    Array.prototype.forEach.call(d.querySelectorAll("[data-ai-avatar]"), function (el) { el.innerHTML = avatar(el.getAttribute("data-ai-avatar")); });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { fillPage(); });
    else fillPage();
  }

  return { NAME: NAME, CANT_SHARE: CANT_SHARE, MODEL_WORDS: MODEL_WORDS, STATUS: STATUS, VOICE: VOICE, buildSummary: buildSummary, IDENTITY_RULE: IDENTITY_RULE, IDENTITY_RULES: IDENTITY_RULES, mentionsModel: mentionsModel, publicText: publicText, avatar: avatar, fillPage: fillPage, AVATAR: AVATAR };
});

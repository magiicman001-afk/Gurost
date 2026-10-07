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

  var CAPACITY_RE = /\b(402|429|credit|credits|quota|billing|payment|rate.?limit|RESOURCE_EXHAUSTED|overloaded|capacity)\b/i;

  // Text that is safe to show a person. Anything naming a model or provider becomes a
  // friendly line (the full error stays in the server log).
  function publicText(text) {
    var s = String(text == null ? "" : text);
    if (!mentionsModel(s)) return s;
    if (CAPACITY_RE.test(s)) return NAME + " is very busy right now. Please try again in a little while.";
    return NAME + " hit a snag. Please try again in a moment.";
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

  return { NAME: NAME, CANT_SHARE: CANT_SHARE, MODEL_WORDS: MODEL_WORDS, STATUS: STATUS, VOICE: VOICE, IDENTITY_RULE: IDENTITY_RULE, IDENTITY_RULES: IDENTITY_RULES, mentionsModel: mentionsModel, publicText: publicText, avatar: avatar, fillPage: fillPage, AVATAR: AVATAR };
});

/**
 * Permanent-free LLM providers, the LAST resort when OpenRouter has nothing left to try
 * (out of credit, every model busy or empty). Each speaks the OpenAI chat-completions format,
 * so lib/openrouter-client.js talks to them with the same code, streaming included.
 *
 * A provider is only used when its API key is set in the environment; with none set nothing
 * changes. Model names are env-overridable because free tiers rename and retire models (a
 * retired name answers 404; the client logs it and moves to the next provider).
 *
 * Order = quality for code first. `maxOutput` caps max_tokens to what the free tier allows,
 * so a request asking for more is not refused; a reply that hits the cap counts as cut off.
 *
 * Free tiers can use prompts to train models (Mistral's Experiment tier requires opting in;
 * Google may outside UK/EU/EEA). Customer business details are in those prompts - the privacy
 * policy has to say so before real customers are served from these.
 */
function freeProviders(env = process.env) {
  const list = [];
  const add = (name, keyVar, baseUrl, modelVar, defaultModel, maxOutput) => {
    const key = env[keyVar];
    if (key && String(key).trim()) list.push({ name, key: String(key).trim(), baseUrl, model: env[modelVar] || defaultModel, maxOutput });
  };
  // A free-tier key from a Google AI Studio project WITHOUT billing: a key from a billed project is charged.
  add("gemini", "FREE_GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai", "FREE_GEMINI_MODEL", "gemini-2.5-flash", 32000);
  add("mistral", "FREE_MISTRAL_API_KEY", "https://api.mistral.ai/v1", "FREE_MISTRAL_MODEL", "codestral-latest", 16000);
  add("cerebras", "FREE_CEREBRAS_API_KEY", "https://api.cerebras.ai/v1", "FREE_CEREBRAS_MODEL", "gpt-oss-120b", 8000);
  add("groq", "FREE_GROQ_API_KEY", "https://api.groq.com/openai/v1", "FREE_GROQ_MODEL", "llama-3.3-70b-versatile", 8000);
  return list;
}

module.exports = { freeProviders };

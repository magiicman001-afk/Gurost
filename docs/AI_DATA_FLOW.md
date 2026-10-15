# AI provider data flow: audit (Fix 6)

Written 2026-10-13 (Web Claude) from reading the code. **NEEDS LEGAL REVIEW** with the privacy policy. Nothing here was tested against a
live provider (my sandbox cannot reach them), so "verified" means "by reading the code", and each claim says which.

## 1. How a model call leaves the server
Almost every bot calls one gateway, `lib/openrouter-client.js` (through `lib/tier-router.js`, `lib/claude-client.js`, `lib/model-router.js`).
**Verified in code: the request body holds only the model name(s), the messages, the token limit and (for streaming) a usage flag.**
No user id, email, IP address, workspace id or session is put in the body. The two headers are the app URL and name ("Gurost").
OpenRouter then sends the messages to whichever model maker serves the model (see section 4).
Other direct calls are listed in section 3.

## 2. What is IN the messages (this is the data that reaches providers)
| Flow | Content sent | Where it comes from |
|---|---|---|
| Website and App Builder, Amend Website | Your prompt, business name and description, chosen style and industry, the page being edited, uploaded text, your corrections | What you typed or uploaded |
| Pulse | Your instruction, the current page or file, your last few Pulse prompts (from `pulse_learning_log`) | What you typed |
| Business Assistant bots | Your message, recent conversation, saved memory notes (only if memory is on), company profile fields the tool reads | What you typed; notes the bots saved |
| The 8 assistant faces (widget chat, 2026-10-15) | Your message, your last 10 messages with that bot, and your project's business description if a project is open. Same gateway and models as other chats; no new provider. "Listen" sends the reply text (max 600 characters) to Deepgram to be spoken | What you typed; your project |
| Research agent | Search phrases (also to Brave Search) | Derived from your request |
| Reminders, briefings | The reminder or briefing text | What you saved |
| Meeting bot | Transcript text you provide | What you provided |
**Not sent (verified by search):** passwords, key hashes, sign-in tokens, card numbers, and form submissions from your sites' visitors
(`site_form_submissions` is used only in `server.js` and the export/delete list, never in a bot).
**Risk that stays:** a person can type anything into a prompt, including other people's details. The policy tells people not to, and
the memory writer filters some categories (policy section 11). We cannot filter free text perfectly.

## 3. Direct (non-gateway) calls
| Provider | File | What is sent |
|---|---|---|
| OpenAI embeddings | `lib/vector-memory.js`, `industry-rag.js` | The text to be embedded (assistant semantic memory; industry knowledge) |
| OpenAI images | `image-bot.js`, `bots/transformer-bot.js` | The image description |
| Gemini images and video | `image-bot.js`, `bots/video-bot.js` | The image or video description. The API key is in the request URL, which is Google's documented style; it is not personal data but must never be logged |
| fal.ai | `image-bot.js` | The image description |
| Free fallbacks: Gemini, Mistral, Cerebras, Groq | `lib/free-llm-providers.js` | The same messages as the gateway; used only if their key is set and the main route is exhausted |
| Deepgram | `video-client.js`, voice routes | Audio while a voice conversation is open |
| Anthropic direct | `headroom-integration.js` | Only if a Headroom proxy is configured; same messages as the gateway |

## 4. Minimisation: what we do and what we do not
- **Done (verified):** no identifiers in the request; the model sees only what the task needs; the image prompts are descriptions, not
  profiles; form submissions and secrets are never sent.
- **Not done:** the gateway does **not** set any provider data option (for example OpenRouter's `provider.data_collection: "deny"` or
  zero-data-retention routing). So what a provider keeps, and whether it may train on it, is decided by **its own terms and by the
  settings on our OpenRouter account**, which I cannot see. We therefore cannot tell customers "providers do not store your prompt".
- **Providers can be outside the UK/EEA**, including makers in China (e.g. Kimi, GLM, DeepSeek models are in our routing chains in
  `CLAUDE.md`). Free `:free` models and the free fallbacks usually have weaker terms than paid ones.

### Recommendation (Irfan to decide; I have not changed any code)
1. **Now, no code:** in the OpenRouter account privacy settings, switch off prompt logging / training use if the options exist, and write
   down what is set (date and screenshot) so we can prove it, as the regulator's quote says.
2. **Next, small code change:** send `provider: { data_collection: "deny" }` on paid calls so only providers that do not keep or train on
   data are used. **Cost:** fewer providers, and the free models mostly need data collection allowed, so the free fallback chain would
   stop working on that setting. Decide: privacy for paid calls (recommended), disclosed weaker terms for the free fallback.
3. **Later:** an option for customers to choose "private models only" (a paid-plan feature).
4. Ask Anthropic, Google and OpenAI for their data processing terms (DPAs) and file them; the adviser will ask.

## 5. Does our own system log it where it should not? (verified by search)
| Place | What is stored | Verdict |
|---|---|---|
| `claude_usage_log` | model, token counts, user id, workspace id | Fine: no prompt text |
| `pulse_learning_log` | each Pulse prompt, up to 2,000 characters, user id | Disclosed in the policy; exported and deleted with the account |
| `user_bot_conversations`, `user_bot_memory` | assistant chats and notes | Disclosed (policy section 11); exported and deleted |
| `training_data_log` | system prompt, user message, completion | **Only if the person opted in** (`training_data_opt_in`, default off, checked on every call). No training run exists. Exported and deleted. The policy says training is opt-in. |
| Server console logs | Errors and counts. **One prompt snippet:** `bots/video-bot.js` logs the first 60 characters of a video description with the user id. Video generation has no page that calls it today, but remove it before it is used (the log redactor `lib/log-redact.js` exists and should wrap it). | Minor finding |
| Admin audit and retention logs | counts and hashed ids only | Fine |

## 6. What the policy now says (and does not)
Says: what reaches providers, that we do not train on your data (training is opt-in and off), that providers' terms apply and we cannot
promise deletion on their side, that free fallbacks may be weaker, that transfers happen.
Does **not** say: "we don't store it on their servers" or "providers don't train", because we cannot prove either today.
Irfan's wording ("we don't store it on their servers, we don't use it for training") becomes true for paid calls after step 2 above.

## 7. Open items
1. Irfan: OpenRouter account settings (step 1) and the decision on step 2.
2. Web or Laptop Claude: the `data_collection: "deny"` change in `lib/openrouter-client.js` (a gateway file: Laptop Claude first), with a test.
3. Remove or redact the video-bot log line.
4. Provider data-processing agreements on file; adviser review.

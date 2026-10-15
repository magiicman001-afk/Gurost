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
| Video call with an assistant (2026-10-15, paid plans, off until LiveKit is set up) | Camera, microphone and any shared screen go to LiveKit (WebRTC) for the call. Your speech is cut into short clips and sent to Deepgram for text; the text then goes to the model exactly as in the widget chat; the reply is spoken by Deepgram. The assistant is NOT a LiveKit participant, so LiveKit never carries the assistant's voice. Recording stays in the browser and on your device. Stored by Gurost: which bot, when, seconds (`bot_calls`) | Your voice, camera and screen while the call is open |
| Assistant memory (2026-10-15) | Your saved notes and this assistant's recent turns are added to the chat prompt. After a chat, your message goes once to a free model to pick out lasting facts (same filter as the department bots: secrets, cards and sensitive categories are dropped; nothing is saved while memory is paused) | Your message; your saved notes |
| Gmail (2026-10-16, off until GMAIL_CLIENT_ID/SECRET and SECRETS_KEY are set and you connect) | Drafts and approved emails go to the Gmail API under your own account. With the separate inbox opt-in, when you ask an assistant about your mail, sender, subject, date and a 200-character preview of up to 10 recent messages are fetched and added to that one chat prompt, so they reach the same model providers as any chat. Message bodies, attachments and mail you did not ask about are never fetched. Not saved to memory, not logged (audit keeps counts only). Stored: Gmail address, scopes, sealed refresh token | What you connected and asked |
| Google Calendar (2026-10-16, off until Google client id/secret and SECRETS_KEY are set and you connect) | With the separate viewing choice, when you ask an assistant about your diary, the title, start, end and place of up to 25 events in the next 1 to 14 days are fetched and added to that one chat prompt, so they reach the same model providers as any chat. Event notes, guests and links are never fetched. Adding an event sends only the event you approved to Google, with no guests. Not saved to memory, not logged (audit keeps counts only). Stored: scopes and a sealed refresh token | What you connected and asked |
| Company Scout (2026-10-16, paid plans, only when you press the button; max 5 runs a month) | Plain text of up to 5 pages of YOUR OWN public website (scripts and markup removed, 3,500 characters per page) plus up to 4 Brave search results lists (title, link, 300-character snippet), all inside one model prompt that must answer with sourced statements. Brave receives the search phrases: company name, industry words, one social handle. No email addresses, account data or other users' data are included. Every statement must carry a source id and a word-for-word quote; the server deletes any it cannot match. Stored: short quotes, source links, read dates (in `scout_runs` for 90 days; in your company profile only after you Confirm). | What you put in your company profile; public web pages |
| Weekly plan (2026-10-16, paid plans, only when you switch it on or press Plan my week; max 3 a week and 8 a month) | One model prompt with: up to 8 confirmed Scout fixes (title, why, evidence, source link), up to 25 calendar event titles, times and places (ONLY if you connected Calendar and switched viewing on) and up to 15 open reminder texts. Events and reminders are marked as untrusted text the model must never obey. No inbox, email addresses, account data or other users' data. The model must name an input id for every proposal; the server drops proposals that cite an input that does not exist and writes the evidence itself. If the AI is unavailable, a plain rule-based plan from the top fixes is shown instead. Drafts: when you approve an item, one more prompt with that item and your confirmed Scout summary writes draft text; it is shown on the page and never sent anywhere. Stored in `weekly_plans` for 90 days. | What you confirmed in Scout; calendar and reminders you chose to share |
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

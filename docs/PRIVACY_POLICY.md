# Gurost Privacy Policy (working copy)

**NEEDS LEGAL REVIEW.** A qualified adviser must review this before launch (IP addresses are personal data; several providers are
outside the UK). Written 2026-10-13 by Web Claude from the code, not from legal knowledge. Plain English on purpose.
The public page is `public/privacy.html`; it must say the same as this file, except for rows marked not built in section 0: there the page says "email us" until the feature ships, and each fix updates that line.

Controller: Surii Global Limited. Contact: support@gurost.com.

## 0. Build status: what is true today (not part of the policy text)

The policy below describes the finished state. These lines say what the code does today, so nobody publishes a promise we cannot keep. Updated 2026-10-13 after Fixes 2 to 5. Provider list re-checked against the code on 2026-10-13 (every host in `server.js`, `image-bot.js`, `bots/`, `lib/`): added Google Maps embeds and the currency and news-feed lookups; OmniRoute is no longer used.

| Promise in the policy | Status 2026-10-13 |
|---|---|
| We never sell data; no ad or tracking scripts | True by code search (keyword search, not a full read). Re-check before launch. |
| Provider list below | Built from the code (env vars, `fetch` hosts, packages). Which providers are switched on in production depends on the keys set on Render; confirm each one with Irfan. |
| Export of your data | **Built (Fix 2, `cc9101f`).** ZIP of the account and 28 kinds of data plus uploaded files, 24-hour link. Not verified live yet. |
| Delete my account button | **Built (Fix 3, `2766a20`, `11430ab`).** Settings, Danger Zone. Not verified live yet. |
| Retention periods | **Built (Fix 4, `426ce36`).** Daily job; runs once deployed. Support messages (3 years) have no job: they live in email, not the database. Backups at providers are outside our control. |
| Rights list | Done in Fix 5: each right says how to use it. Restrict and Object are by email only (no button). |
| "Not stored by providers / not used for training" | **Cannot be promised.** Audit done in Fix 6: `docs/AI_DATA_FLOW.md`. The policy says what is true: we do not train; provider terms apply. Becomes promisable for paid calls after the OpenRouter settings and `data_collection: "deny"` step (Irfan to decide). |
| Model training | Opt-in only (`training-data.js`, off by default, per user); no training run exists. |

## 1. What we collect

- **Account:** email, name, password hash (or sign-in token), plan, sign-up date, workspace membership.
- **Profile and company details:** business name, website, industry, social handles, style notes, saved research notes.
- **Your projects:** the prompts you type, the sites and apps built, versions and undo history, images you upload or we generate, form submissions made on your published sites.
- **Business Assistant:** conversations with each bot, notes the bots keep (facts, preferences, habits), reminders, meeting notes, briefings, your answers to suggestions, usage counts (which bot, tool, day and time of day; not the text).
- **Pulse:** what you ask Pulse (stored as a learning log, up to 2,000 characters per entry).
- **Voice:** if you use Talk, your microphone audio is sent for transcription. We do not keep the recording; we keep the words as a message.
- **Payments:** handled by Stripe. We keep plan, credit balance and credit events (a record of credits used); we do not store card numbers.
- **Technical:** IP address and request timing (security logs, rate limits, blocked-IP list, security violation records), device and browser information, session records, audit records of admin and assistant actions (user id + IP address), build logs and build events.
- **Cookies/session storage:** sign-in session. No advertising or analytics cookies.

## 2. Why we collect it (and the legal basis)

| Purpose | Data | Basis (UK GDPR) |
|---|---|---|
| Build your site or app, run Pulse and the Assistant | prompts, profile, projects, memory | Contract |
| Sign you in, keep you secure, stop abuse | account, sessions, IP, logs | Contract; legitimate interests |
| Take payment, keep records | Stripe data, credit events | Contract; legal obligation |
| Send service emails (export, reset, receipts) | email address | Contract |
| Fix bugs and keep the service working | build logs and events | Legitimate interests |
| Suggestions in the Assistant | usage counts only | Legitimate interests; you can turn memory off |
| Train a future model | prompt/response pairs | **Consent only**: off by default, per account, you can turn it off |

We do not sell personal data. We do not run advertising, ad networks, tracking pixels or data brokers. We do not build advertising profiles.

## 3. Who we share it with (exactly who, and what they get)

Each provider gets only what its one job needs. "May be off" means the feature runs only if the key is set on our server.

| Provider | Job | Data that goes there |
|---|---|---|
| Supabase | Database, sign-in, file storage | Everything in section 1 that we store |
| Render | Runs the Gurost server; hosts deployed backends | Requests to our server; code of backends you deploy |
| Vercel | Hosts websites and app frontends you publish | The site files you publish |
| GitHub | Saves, backups, backend repos (private) | Project code you save or deploy |
| Neon | Database for apps you deploy (may be off) | The schema of your app |
| Stripe | Payments | Name, email, billing details you enter at Stripe |
| Postmark | Our emails | Your email address and the email text (reset, export, confirmations) |
| OpenRouter | Routes AI requests to model makers | Your prompt, project text and context for the request (see section 5) |
| Model makers behind OpenRouter | Write the content | Same as above. Includes makers such as Anthropic, Google, Moonshot (Kimi), Z.ai (GLM), DeepSeek, NVIDIA, depending on the plan and what is available |
| Google Gemini, Mistral, Cerebras, Groq | Free-tier fallbacks, used only if their key is set and the main route has nothing left | Same as above |
| Anthropic (direct), OpenAI | Some assistant features, embeddings for semantic memory (OpenAI), images (fallback) | Text to embed or the image prompt |
| fal.ai, Gemini image | Image generation (may be off) | The image description |
| Pixabay, Unsplash, Openverse | Stock photo search | A search phrase from your business description |
| Deepgram | Voice to text and back | Your audio while a voice conversation is open |
| LiveKit | Video calls with an assistant (paid plans; off until switched on) | Your camera, microphone and any screen you choose to share, while a call is open. The assistant itself is not in the LiveKit room: your browser sends short speech clips to Deepgram to be turned into text, and the text goes to the AI as in any chat. Call recordings are made in your browser and saved on your own device; Gurost does not receive them |
| Google Gmail (only if you connect it; off until switched on) | Writing and, after your approval, sending email from your own Gmail; optionally reading your inbox | Only if you press Connect Gmail. Drafts and approved emails go to Gmail under your own account. Reading your inbox is a separate opt-in: when it is on, sender, subject, date and a short preview of recent messages are fetched when you ask, and are sent to the AI provider that writes the reply (see section 5). We never delete or archive mail, and never send without your approval. We store a sealed (encrypted) access key and your Gmail address, not your mail. Disconnect revokes the key at Google and deletes it. |
| Brave Search | Web research for the Research agent | The search phrase |
| E2B | Sandbox that runs generated code to test it | The generated code for your project |
| Telegram, WhatsApp (Meta) | Only if you connect your own bot | Messages sent through your bot |
| ntfy | Push notifications, if turned on | Short notice text (e.g. "your deploy finished") on a private random topic |
| Google Maps | A map on a published site, if the business details include an address | The visitor's browser contacts Google directly (IP address, browser type); the address is in the map link |
| Frankfurter, Hacker News, TechCrunch, Reddit feeds | Currency rates and public news feeds for the Assistant | Currency codes, or nothing (our server fetches public feeds; no account data) |
| Google Fonts and CDNs (jsDelivr, cdnjs, unpkg, Tailwind CDN) | Fonts and code libraries for the Gurost pages and the sites we generate | Your browser's IP address and browser type, sent by your browser to them |

Also: professional advisers (lawyers, accountants), authorities when the law requires it, and a buyer if the business is sold (you are told).

## 4. International transfers
Several providers are outside the UK and EEA (mainly the USA; model makers can also be in other countries, including China). We rely on the
UK International Data Transfer Agreement or Addendum, EU Standard Contractual Clauses, and the UK-US data bridge where the provider
participates. **Needs adviser check:** which provider uses which mechanism; we have not verified this per provider.

## 5. What reaches AI providers
When you build, edit or chat, your prompt and the context needed (your business description, the page being edited, recent messages, saved
memory notes if memory is on) go to OpenRouter and the model maker it picks. We do not send passwords, card numbers or API keys on purpose.
- We do not train models on your data. We send only the content of the request: no account id, email or IP address (verified in the gateway code, `docs/AI_DATA_FLOW.md`). We have **not yet** set provider options that stop a provider keeping a copy, so each provider's own terms apply and **we cannot promise a provider deletes a request.** Form submissions on your sites, passwords and card details are never sent.
- Training data capture on our side is off unless you switch it on in your account.
- Free fallback models usually have weaker privacy terms than paid ones.

## 6. How long we keep it
| Data | Kept |
|---|---|
| Account, profile, projects, assistant data | Until you delete them or your account; then removed within 30 days |
| Payment and invoice records | 7 years (legal requirement), anonymised after you delete your account |
| Support messages | 3 years |
| Server and security logs | 30 to 90 days |
| Session records | Until expired + 30 days |
| Build logs and events | 90 days |
| Assistant team memory: recent conversations with each assistant (30 days) and lasting notes such as what your business sells (1 year); you can pause it, forget one note, one assistant's notes or everything, at any time | 30 days or 1 year, or until you forget it |
| Assistant nudges (a short sentence an assistant said unasked, and which build or score it came from) | 90 days |
| Video call records (which assistant, when, how many seconds; no audio, video or words) | 90 days |
| Voice recordings | Not kept |

## 7. Your rights, and how to use them in Gurost
| Right | How |
|---|---|
| Access | Settings, "Request a data export" (emails you a link, valid 24 hours, to a ZIP) |
| Rectification | Edit your profile and company details in Settings; email us for anything else |
| Erasure | Settings, Danger Zone, "Delete my account" (two confirmations); erased at once; or email support@gurost.com if you cannot sign in |
| Restrict processing | Email us; you can also turn Assistant memory off in the memory panel |
| Data portability | The same download, in JSON (a standard, machine-readable format) |
| Object | Email us (for example to stop processing based on legitimate interests); turn memory and suggestions off |
| Automated decisions | We do not make decisions with legal or similarly significant effects about you by automated means. AI writes site and app content at your request. Our security system can automatically block abusive IP addresses. |
| Complain | Information Commissioner's Office (ico.org.uk) |

We answer within one month.

## 8. Security
Encrypted connections, role-based admin access, rate limiting, input validation, secret scanning, audit logs, private code repositories. No system is perfectly secure.

## 9. Children
Not for under 16s.

## 10. Changes
We tell you by email or in the product.

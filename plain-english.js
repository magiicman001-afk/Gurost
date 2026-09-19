/**
 * Plain English Mode — two real mechanisms, not one, because static
 * page copy and dynamic AI output need genuinely different approaches.
 *
 * STATIC PAGE CONTENT (the "toggle on every page" part): a real,
 * deterministic glossary — technical term -> plain explanation. Fast,
 * free, reliable, and honest about its limits: it only catches terms
 * actually in the glossary below. It cannot rewrite arbitrary sentences
 * — that's not what a glossary does, and pretending otherwise would be
 * overclaiming what a simple term-swap can do. Served once via a real
 * route (GET /api/plain-english/glossary) and applied client-side by
 * shared/plain-english-widget.js, not re-fetched per page.
 *
 * DYNAMIC AI OUTPUT (assistant-bot.js's chat responses, task outputs):
 * a real Claude call, genuinely necessary here because a fixed glossary
 * can't anticipate every technical phrase a model might generate in
 * free-form text. This costs a real, small amount of extra latency and
 * tokens per simplified response — worth knowing, not hidden.
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

// Real, curated glossary — not exhaustive, but each entry is a genuine
// term that appears in this codebase's own UI or generated output.
// Add to this as real gaps are found, same practice as everywhere else
// in this build.
const GLOSSARY = {
  "database schema": "where your customer info lives",
  "API endpoint": "how your app talks to another service, like Stripe",
  "API": "a way for two pieces of software to talk to each other",
  "backend": "the part of your app that runs on a server, not in the browser",
  "frontend": "the part of your app people actually see and click on",
  "deployment": "putting your site live on the internet",
  "environment variable": "a secret setting, like a password, kept out of your actual code",
  "webhook": "a message one service sends automatically when something happens",
  "authentication": "checking that someone really is who they say they are",
  "JWT": "a secure, temporary login pass your browser holds onto",
  "OAuth": "the \"Log in with Google\" style login flow",
  "repository": "the folder holding all your project's code",
  "commit": "a saved snapshot of a change to your code",
  "sandbox": "a safe, separate space to test code without affecting the real thing",
  "staging": "a practice version of your site, separate from what customers see",
  "production": "the real, live version customers actually use",
  "SSL certificate": "what makes your site show the padlock icon and use https",
  "CDN": "a network that serves your site faster by using servers near the visitor",
  "cache": "a temporary copy kept nearby so things load faster next time",
  "rate limit": "a cap on how many requests something can make in a short time",
  "middleware": "a checkpoint your request passes through before reaching its destination",
  "webhook signature": "a way to confirm a message really came from who it claims to",
  "credential": "a login detail, like an email, password, or API key",
  "token": "a temporary digital pass proving you're allowed to do something",
  "endpoint": "a specific address your app sends a request to",
  "payload": "the actual data being sent in a request",
  "latency": "how long something takes to respond",
  "uptime": "how much of the time your site is actually working and reachable"
};

function getGlossary() {
  return GLOSSARY;
}

const SIMPLIFY_SYSTEM = `You are rewriting a piece of AI-generated text so a complete non-technical person (think: someone's grandparent, zero software background) can understand it.

Output ONLY valid JSON: {"simplified": "the rewritten text"}

Rules:
- Keep the same real meaning and any real action items — don't drop information, translate it.
- Replace jargon with everyday words and short, concrete analogies where it genuinely helps.
- Keep it roughly the same length — this is a translation, not a summary.
- If the text is already plain and non-technical, return it unchanged rather than force unnecessary rewrites.`;

async function simplifyText(text) {
  if (!text || !text.trim()) return text;
  const { parsed } = await callClaude({
    system: SIMPLIFY_SYSTEM,
    messages: [{ role: "user", content: text }],
    maxTokens: Math.min(2000, text.length * 2),
    model: CLAUDE_MODEL_FAST
  });
  return parsed.simplified;
}

module.exports = { getGlossary, simplifyText, GLOSSARY };

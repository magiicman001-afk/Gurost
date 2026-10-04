// DeepSeek code review via OpenRouter - run before every commit.
//
//   git add <files>
//   node scripts/deepseek-review.js "<one-line description of the change>"
//
// Reviews the STAGED diff against GUROST's vision and CLAUDE.md, prints
// the verdict and saves it to reviews/review-<timestamp>.md (gitignored).
// Uses OPENROUTER_API_KEY from .env; REVIEW_MODEL overrides the model.
// A full review costs well under a cent.
require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODEL = process.env.REVIEW_MODEL || "deepseek/deepseek-v4-pro";
const intent = process.argv.slice(2).join(" ") || "(no description given)";
const diff = execSync("git diff --cached --no-color -U6", { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 })
  // Inline base64 images (the logo) are noise for a reviewer.
  .replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{200,}/g, "data:image/...;base64,(omitted)");
if (!diff.trim()) { console.error("Nothing staged."); process.exit(1); }

// Never send a secret anywhere - and never commit one (the repo is public).
const FORBIDDEN_FILES = /^(\.env(\..*)?|CLAUDE\.local\.md|__auth-state\.json)$/;
const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).split("\n").filter(Boolean);
const badFiles = staged.filter((f) => FORBIDDEN_FILES.test(path.basename(f)) && !/\.example$/.test(f));
const SECRET_PATTERNS = [
  /sk-or-v1-[0-9a-f]{20,}/i, /\bsk-[A-Za-z0-9_-]{24,}/, /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /\b\d{8}-[0-9a-f]{25}\b/, // Pixabay key shape
  /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/
];
const addedLines = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
const secretHits = addedLines.filter((l) => SECRET_PATTERNS.some((re) => re.test(l)));
if (badFiles.length || secretHits.length) {
  console.error("Refusing to send this diff - it looks like it contains secrets. Unstage them first.");
  if (badFiles.length) console.error("  forbidden files staged:", badFiles.join(", "));
  for (const l of secretHits.slice(0, 5)) console.error("  suspicious line:", l.slice(0, 40) + "...");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) { console.error("OPENROUTER_API_KEY is not set."); process.exit(1); }

const claudeMd = fs.existsSync("CLAUDE.md") ? fs.readFileSync("CLAUDE.md", "utf8").slice(0, 6000) : "";

const SYSTEM = `You are DeepSeek, the senior reviewer on the GUROST team. Another engineer (Claude) wrote this change; the product owner watches. Review it honestly and specifically - you are not a rubber stamp, and you don't invent problems either.

GUROST: an AI website/app builder (Node/Express + Supabase + OpenRouter, deployed on Render). A user describes a business; bots design and build a real, launch-ready site live in front of them, and Pulse (a floating assistant) helps refine, fix and launch it. Priorities: real working output over demos, honest status (never fake success), low running cost, security (the repo is public; never trust client input for server-side data), and code that reads like the surrounding code.

Check that the commit follows GUROST's vision:
1. Two panels side by side, synced, no glitches
2. Pulse floating, draggable, self-inspecting
3. Industry-aware design
4. Free tools first (Pixabay -> FLUX -> Gemini last)
5. No patching - only real fixes
6. Nothing breaks the layout or the bot conversation

Project notes (CLAUDE.md):
${claudeMd}

Answer in this exact shape:
VERDICT: APPROVE | APPROVE WITH NITS | CHANGES NEEDED
VISION: go through the 6 points above - which ones this change touches, and whether it holds to each (one line per point it touches)
FIX OR PATCH: is this a real fix of the root cause, or a patch over a symptom? (1-3 sentences)
ISSUES: numbered list, each with file:line-ish location, severity (blocker/major/minor/nit) and the concrete change you'd make. Write "none" if there are none.
TESTS: is the testing adequate? What's missing, if anything?`;

(async () => {
  const t = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "X-Title": "Gurost code review" },
    // A reasoning model: room to think AND answer (4000 tokens once went entirely on thinking).
    body: JSON.stringify({ model: MODEL, max_tokens: 24000, reasoning: { effort: "medium" }, messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `CHANGE: ${intent}\n\nSTAGED DIFF:\n${diff.slice(0, 400000)}` }
    ] })
  });
  const j = await res.json();
  if (!res.ok || !j.choices) { console.error("Review failed:", res.status, JSON.stringify(j).slice(0, 500)); process.exit(1); }
  const review = j.choices[0].message.content;
  if (!review || !review.trim()) { console.error(`Review came back empty (finish_reason: ${j.choices[0].finish_reason}, ${j.usage?.completion_tokens} tokens) - not a review.`); process.exit(1); }
  const meta = `model ${j.model} · ${Math.round((Date.now() - t) / 1000)}s · ${j.usage?.prompt_tokens} in / ${j.usage?.completion_tokens} out · $${(j.usage?.cost ?? 0).toFixed(4)}`;
  const out = `# DeepSeek review\n\n${intent}\n\n_${meta}_\n\n${review}\n`;
  const dir = path.join(process.cwd(), "reviews");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `review-${Date.now()}.md`), out);
  console.log(out);
})();

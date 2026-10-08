/**
 * Suggestion box (Website Builder and App Builder): up to 3 friendly ideas for the finished site or app,
 * each ready to send to Pulse as an edit ("Add X") or put off ("Maybe later").
 *
 * No AI and no cost: eight plain checks (on the page's own HTML, or on an app's own files) decide what is
 * missing, so it works on the free tier. A keyword check can be wrong now and
 * then (a section called something unusual); "Maybe later" is the answer to that.
 *
 *  - at most MAX ideas at a time, most useful first
 *  - an idea put off ("skipped") or taken ("accepted") is not offered again for 7 days
 *  - every accept and skip is counted per idea, in project.suggestionLog (saved with the project)
 *
 * Log shape: { [ideaId]: { status: "accepted" | "skipped", at: ms, accepted: n, skipped: n } }
 */

const DAY = 24 * 60 * 60 * 1000;
const QUIET_MS = 7 * DAY;
const MAX = 3;

// Visible markup only: scripts, styles and comments never count as content.
function visible(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
}

// The text of the page's headings, plus every id and class name: the places a section announces itself.
function signals(html) {
  const heads = [...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ")).join(" | ");
  const names = [...html.matchAll(/\b(?:id|class|data-page)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]).join(" ");
  return `${heads} | ${names}`;
}

const CTA_WORDS = /\b(book|order|call|contact|get|start|buy|shop|reserve|request|quote|visit|sign\s*up|subscribe|join|try|learn more|enquire|inquire|schedule)\b/i;

// Ordered by how much each idea usually helps; the first three missing ones are offered.
// `instruction` is what Pulse is asked to do. Nothing is invented: examples are labelled as examples.
const CATALOG = [
  {
    id: "cta",
    title: "a clear button at the top",
    text: "Your top section could have one clear button, like Order or Book, so visitors know what to do first.",
    instruction: "Add one clear call-to-action button in the top section that leads to the order or contact section.",
    missing: (html) => {
      const top = html.slice(0, 6000);
      const buttons = [...top.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2].replace(/<[^>]+>/g, " "));
      return !buttons.some((t) => CTA_WORDS.test(t));
    }
  },
  {
    id: "contact-details",
    title: "opening hours and address",
    text: "Visitors look for opening hours and where to find you. I can add them to your contact section.",
    instruction: "Add opening hours and the address to the contact section, using my company details where I have given them, and clearly marked placeholders where I have not.",
    missing: (html, info) => {
      const hasInfo = !!(info && (info.address || info.openingHours || info.hours));
      const onPage = /\b(opening hours|open (mon|tue|wed|thu|fri|sat|sun|daily|every)|hours of|find us|our address|google\.com\/maps|<iframe[^>]+map)/i.test(html) || /\bid\s*=\s*["'][^"']*(hours|location|address|map)/i.test(html);
      return !hasInfo && !onPage;
    }
  },
  {
    id: "testimonials",
    title: "customer testimonials",
    text: "A few customer quotes build trust quickly. I can add a testimonials section for you to fill with real ones.",
    instruction: "Add a testimonials section with three short quote cards. Mark each clearly as an example to replace with a real customer review; do not invent names or claims.",
    missing: (html) => !/(testimonial|what (our )?(customers|clients|guests|people) (say|think)|kind words|customer (reviews|stories)|love (letters|notes))/i.test(signals(html))
  },
  {
    id: "about",
    title: "an 'our story' section",
    text: "People like to know who is behind a business. An 'our story' section makes it personal.",
    instruction: "Add a short 'Our story' section about the business, using my company details and prompt only, with a clearly marked placeholder where a detail is missing.",
    missing: (html) => !/(about|our story|who we are|meet the|our team|our history)/i.test(signals(html))
  },
  {
    id: "faq",
    title: "a FAQ",
    text: "A short FAQ answers the questions people always ask, so fewer of them need to call.",
    instruction: "Add a FAQ section with four common questions and short answers for this kind of business. Mark any answer that needs my real details as a placeholder.",
    missing: (html) => !/(\bfaq\b|frequently asked|common questions|questions? (and|&amp;|&) answers?)/i.test(signals(html))
  },
  {
    id: "pricing",
    title: "prices or offers",
    text: "Showing prices, or at least a 'from' price, helps people decide. I can add a prices section.",
    instruction: "Add a prices or offers section. Use clearly marked placeholder prices that I can replace; do not invent real prices.",
    missing: (html) => !/(pricing|price list|our prices|\bprices\b|packages|\bplans\b|\brates\b|\bmenu\b|our services|special offers?|\boffers\b)/i.test(signals(html)) && !/(?:[$£€]\s?\d)/.test(html)
  },
  {
    id: "gallery",
    title: "a photo gallery",
    text: "A small gallery lets visitors see your work before they get in touch.",
    instruction: "Add a photo gallery section with a tidy grid of six images, using the images already on the site or clear placeholders.",
    missing: (html) => !/(gallery|portfolio|our work|\bphotos\b|\bimages\b)/i.test(signals(html))
  },
  {
    id: "newsletter",
    title: "an email sign-up",
    text: "An email sign-up lets you keep in touch with people who are not ready to buy yet.",
    instruction: "Add a simple email sign-up box with a short friendly line above it, near the footer.",
    missing: (html) => !/(newsletter|subscribe|mailing list|join our list|stay in touch|sign up for (updates|our|news))/i.test(html)
  }
];

// ---- App Builder: the same box, with checks on an app's own files (no AI) ----
const appText = (files) => (Array.isArray(files) ? files : []).filter((f) => f && typeof f.content === "string").map((f) => f.content).join("\n");

const APP_CATALOG = [
  {
    id: "app-login",
    title: "login protection",
    text: "Your app has users, but nothing in the backend checks who is logged in. I can protect the private pages and routes.",
    instruction: "Protect the private pages and API routes behind a login: the backend checks a signed token on every private route, and the frontend shows the login page when there is no valid session.",
    missing: (a) => /\busers?\b/i.test(a.schema) && !/(jwt|jsonwebtoken|bcrypt|passport|express-session|authoriz|requireAuth|authenticate)/i.test(a.backend)
  },
  {
    id: "app-validation",
    title: "form checks",
    text: "Your forms accept anything right now. I can add checks so people see what to fix before they submit.",
    instruction: "Add input validation to every form: required fields, sensible formats (email, numbers), and a short friendly message next to each field that needs fixing. Validate on the backend too.",
    missing: (a) => /<(form|input)\b/i.test(a.frontend) && !/(required|validat|pattern=|minLength|maxLength|zod|yup)/i.test(a.frontend)
  },
  {
    id: "app-errors",
    title: "clear error messages",
    text: "If the server is slow or fails, your app says nothing. I can add friendly error messages with a retry.",
    instruction: "Add friendly error messages with a Retry button wherever the app talks to the backend, so a failed request never leaves a blank or stuck screen.",
    missing: (a) => /\bfetch\s*\(/.test(a.frontend) && !/(\.catch\s*\(|catch\s*\()/.test(a.frontend)
  },
  {
    id: "app-loading",
    title: "loading indicators",
    text: "People should see that something is happening while data loads. I can add spinners or skeleton cards.",
    instruction: "Add loading indicators (a spinner or skeleton cards) wherever the app waits for data.",
    missing: (a) => !/(loading|spinner|skeleton|isLoading|animate-pulse|animate-spin)/i.test(a.frontend)
  },
  {
    id: "app-empty",
    title: "friendly empty screens",
    text: "A new account starts with nothing in it. I can add a friendly empty screen that says what to do first.",
    instruction: "Add a friendly empty state to every list or table, with one short line and a button for the first action (for example: 'No tasks yet. Add your first one').",
    missing: (a) => !/(no \w+ yet|nothing (here|to show)|empty state|get started by|add your first|no results|no items)/i.test(a.frontend)
  },
  {
    id: "app-mobile",
    title: "phone-friendly layout",
    text: "I can't see any phone layout rules in your app. Most people will open it on their phone.",
    instruction: "Make every page work well on a phone: stack columns on small screens, make buttons and inputs easy to tap, and keep the navigation usable at 320px wide.",
    missing: (a) => !/\b(sm|md|lg|xl):[a-z]/.test(a.frontend) && !/@media/i.test(a.frontend)
  },
  {
    id: "app-dark",
    title: "dark mode",
    text: "Many people prefer a dark screen at night. I can add a dark mode switch.",
    instruction: "Add a dark mode with a toggle in the header, following the device setting by default.",
    missing: (a) => !/(\bdark:|prefers-color-scheme|dark-mode|darkMode)/i.test(a.frontend)
  },
  {
    id: "app-a11y",
    title: "screen-reader labels",
    text: "Buttons that only show an icon, and images without a description, can't be read aloud. I can add labels.",
    instruction: "Add accessibility labels: aria-label on icon-only buttons, alt text on images, proper labels on inputs, and visible keyboard focus.",
    missing: (a) => !/aria-/i.test(a.frontend) && !/\balt\s*=/i.test(a.frontend)
  }
];
const BY_ID = new Map([...CATALOG, ...APP_CATALOG].map((c) => [c.id, c]));

// A saved log can come from an older project or be damaged; only known ideas with a real time are trusted.
function cleanLog(log) {
  const out = {};
  if (!log || typeof log !== "object" || Array.isArray(log)) return out;
  for (const [id, e] of Object.entries(log)) {
    if (!BY_ID.has(id) || !e || typeof e !== "object") continue;
    const at = Number(e.at);
    if (!Number.isFinite(at)) continue;
    out[id] = {
      status: e.status === "accepted" ? "accepted" : "skipped",
      at,
      accepted: Math.max(0, Math.floor(Number(e.accepted) || 0)),
      skipped: Math.max(0, Math.floor(Number(e.skipped) || 0))
    };
  }
  return out;
}

/**
 * The ideas to show now: [{ id, title, text, instruction }], at most `max`.
 * Never throws; nothing to show is an empty list.
 */
function pick(project, { now = Date.now(), max = MAX } = {}) {
  try {
    if (!project) return [];
    let catalog; let subject;
    if (project.type === "app") {
      const af = project.appFiles;
      if (!af || (!(af.frontend || []).length && !(af.backend || []).length)) return [];
      catalog = APP_CATALOG;
      subject = { frontend: appText(af.frontend), backend: appText(af.backend), schema: (af.database && typeof af.database.schema === "string") ? af.database.schema : "" };
    } else {
      if (!project.currentHtml) return [];
      catalog = CATALOG;
      subject = visible(project.currentHtml);
    }
    const log = cleanLog(project.suggestionLog);
    const out = [];
    for (const c of catalog) {
      if (out.length >= Math.min(max, MAX)) break;
      const e = log[c.id];
      if (e && now - e.at < QUIET_MS) continue; // put off or taken in the last 7 days
      if (!c.missing(subject, project.businessInfo || null)) continue;
      out.push({ id: c.id, title: c.title, text: c.text, instruction: c.instruction });
    }
    return out;
  } catch (err) {
    return [];
  }
}

/**
 * Records the person's answer on the project. action: "accepted" | "skipped".
 * Returns { ok: true } or { ok: false, error }. Counts accumulate across answers.
 */
function respond(project, id, action, now = Date.now()) {
  if (!BY_ID.has(id)) return { ok: false, error: "Unknown suggestion." };
  if (action !== "accepted" && action !== "skipped") return { ok: false, error: "Answer must be accepted or skipped." };
  const log = cleanLog(project.suggestionLog);
  const before = log[id] || { accepted: 0, skipped: 0 };
  log[id] = {
    status: action,
    at: now,
    accepted: before.accepted + (action === "accepted" ? 1 : 0),
    skipped: before.skipped + (action === "skipped" ? 1 : 0)
  };
  project.suggestionLog = log;
  return { ok: true };
}

// Totals for reporting: how many were accepted and skipped, overall and per idea.
function stats(project) {
  const log = cleanLog(project && project.suggestionLog);
  let accepted = 0; let skipped = 0;
  for (const e of Object.values(log)) { accepted += e.accepted; skipped += e.skipped; }
  return { accepted, skipped, byIdea: log };
}

module.exports = { pick, respond, stats, cleanLog, CATALOG, APP_CATALOG, QUIET_MS, MAX };

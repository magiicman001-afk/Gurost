"use strict";
/**
 * Admin Help and Guide (docs/ADMIN_GUIDE_SPEC.md). Decides, on the server, what each role receives: a Viewer never
 * gets Owner-only text. Pure functions; the route in server.js only calls guideFor(role).
 */
const access = require("./admin-access");
const { HELP } = require("./admin-guide-help");
const { SECTIONS, GLOSSARY } = require("./admin-guide-content");

/** Tab id -> the access section that opens it. Must match TABS in public/admin-dashboard.html (a test checks). */
const TAB_SECTIONS = {
  overview: "dashboard", inventory: "inventory", models: "models", projects: "projects", builds: "builds", buildlogs: "builds",
  memory: "builds", code: "code", docs: "docs", ops: "ops", team: "team", security: "security", users: "users",
  usage: "models", health: "builds", payments: "revenue", bots: "bots", audit: "security",
};

const TAB_LABELS = {
  overview: "Dashboard", inventory: "Software", models: "Models & APIs", projects: "Projects", builds: "Builds log",
  buildlogs: "Build Logs", memory: "Design memory", code: "Code & deploy", docs: "Docs", ops: "Ops", team: "Team",
  security: "Security", users: "Users", usage: "API Usage", health: "System Health", payments: "Payments",
  bots: "Bot Activity", audit: "Assistant Audit",
};

const wordCount = (e) => [e.title, ...e.shows, ...e.numbers.flat(), ...e.wrong, ...e.dont].join(" ").split(/\s+/).filter(Boolean).length;

/** The five-step first-login tour (spec section 4). Step 2 lists the tabs this role can open. */
function tourFor(role) {
  const tabs = Object.keys(TAB_SECTIONS).filter((t) => access.sectionsFor(role).includes(TAB_SECTIONS[t])).map((t) => TAB_LABELS[t]);
  return [
    { title: "Welcome to the Gurost admin area", body: "This is the control room. You can look at how Gurost is doing and, depending on your role, make a few careful changes. Looking is always safe." },
    { title: "Your tabs", body: `Along the top are your tabs: ${tabs.join(", ")}. You only see what your role allows, on purpose. If you need more, ask the Owner.` },
    { title: "The ? button", body: "Every tab has a ? button in its corner. It explains the tab in plain words: what the numbers mean, what to click when something looks wrong, and what not to click." },
    { title: "The Guide tab", body: "The Guide has step-by-step help for the jobs you will do, such as reading a build log, adding a team member or handling an outage. It has a search box and a glossary of every term." },
    { title: "What to check each morning", body: "Open the Dashboard and System Health. Server errors should be near zero, and the badge should say Healthy. The Guide's Daily routine takes about five minutes. You can take this tour again any time from the Guide tab." },
  ];
}

/** Everything one role may read. */
function guideFor(role) {
  const allowed = access.sectionsFor(role);
  const tabs = {};
  for (const [tab, section] of Object.entries(TAB_SECTIONS)) {
    if (allowed.includes(section) && HELP[tab]) tabs[tab] = HELP[tab];
  }
  const sections = SECTIONS.filter((s) => s.roles.includes(role));
  return {
    role,
    tabs,
    sections,
    glossary: GLOSSARY.map(([term, meaning]) => ({ term, meaning })),
    tour: tourFor(role),
  };
}

module.exports = { guideFor, tourFor, TAB_SECTIONS, TAB_LABELS, wordCount, HELP, SECTIONS, GLOSSARY };

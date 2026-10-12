"use strict";
/**
 * The Guide tab: step-by-step sections and the glossary (docs/ADMIN_GUIDE_SPEC.md sections 2, 3, 5).
 * Plain English for a non-technical founder; every "why" is explained. Says plainly what is not built yet.
 *
 * A block is one of: { h } a small heading, { p } a paragraph, { ol } numbered steps, { ul } bullets, { warn } a caution.
 * `roles` says who gets the section (the server filters; a Viewer never receives Owner-only text).
 */

const ALL = ["owner", "admin", "team_lead", "engineer", "viewer"];
const STAFF = ["owner", "admin", "team_lead", "engineer"];

const SECTIONS = [
  {
    id: "welcome", letter: "a", title: "Welcome and overview", roles: ALL,
    blocks: [
      { p: "This admin area is the control room for Gurost. It lets you see whether the product is healthy, what it costs, who is using it, what the bots did, and who on the team can do what. It is for looking and for a small number of careful actions. Nothing here builds websites; customers do that in the Website Builder." },
      { h: "How it is laid out" },
      { ul: [
        "Along the top is a row of tabs. You only see the tabs your role is allowed to open. That is deliberate: it keeps mistakes small.",
        "Every tab has a ? button in its corner. It explains that tab in plain words: what it shows, what the numbers mean, what to click when something is wrong, and what not to click.",
        "This Guide tab is the walkthrough. Use the search box to find a word, such as deploy or key.",
      ] },
      { h: "Three rules to remember" },
      { ol: [
        "Looking is always safe. Only buttons that say they change something (Redeploy, Revoke, Block, New credentials) change anything.",
        "Every change asks for a reason, and the reason is recorded with your name. That is not distrust. It lets the team explain a change months later.",
        "If you are unsure, do nothing and ask. A pause costs minutes. A wrong click on the live site can cost a customer's work.",
      ] },
    ],
  },
  {
    id: "daily", letter: "b", title: "Daily routine (about five minutes)", roles: ALL,
    blocks: [
      { p: "Do this once each morning. The point is to notice a problem before a customer does." },
      { ol: [
        "Open Dashboard. Look at Server errors in the last hour and Failed builds this week. Both should be small. Why: these are the earliest signs of trouble.",
        "Open System Health. The badge should say Healthy. If it says Watch or Needs attention, read its ? help.",
        "Open Builds log. Glance at the top lines: mostly OK, a normal number of seconds, scores of 70 or more. Why: this is the product doing its main job.",
        "Open Ops, then Test connections (Owner only). Every service should say ok. If one says rejected or failed, see Handle an outage. Why: a key can expire overnight.",
        "Open Security. Check Recent admin actions. Every one should be something you or your team did. Why: this is how you would notice someone you do not know.",
      ] },
      { p: "If you can only see some of these tabs, do the ones you can. A Viewer checks the Dashboard and Software tabs." },
    ],
  },
  {
    id: "weekly", letter: "c", title: "Weekly routine (Sundays)", roles: ["owner", "admin"],
    blocks: [
      { p: "There is no automatic Sunday report yet. Until there is, this is the manual version, about twenty minutes." },
      { ol: [
        "Dashboard: write down Builds this week, Failed builds, Active builders and AI spend. Compare with last week's numbers. Trends matter more than single days.",
        "API Usage: which model costs the most? If one model suddenly dominates, ask Claude why.",
        "Design memory: how many builds are recorded for each industry? This shows what customers actually ask for.",
        "Team: remove anyone who no longer needs access (Revoke). Check that nobody sits at a higher level than their job needs.",
        "Users: look at Blocked and new sign-ups. Anything strange gets a note.",
        "Models & APIs and Ops, then Test connections: top up any account that is low in the provider's own website. Why: running out of AI credit stops every build at once.",
        "Open the Docs tab and check HOW GUROST WORKS is still true. If something changed this week, ask Claude to update it.",
      ] },
    ],
  },
  {
    id: "build", letter: "d", title: "Build a website, end to end", roles: ALL,
    blocks: [
      { p: "This is what a customer does, and what happens behind it. Knowing it helps you read every other tab." },
      { ol: [
        "The customer opens the Website Builder and describes their business, by typing or by voice.",
        "Gurost asks for company details (name, phone, address, social links). They are optional. Real details mean the page has no made-up placeholders.",
        "The builder picks a look. When the Premium Pipeline is on, it chooses from 24 hand-checked looks. Design memory nudges the choice toward combinations that scored best for that kind of business.",
        "The Copywriter bot writes the words, the Photographer bot finds pictures, and the Builder bot assembles the page from ready-made sections.",
        "Every page is scored out of 100. The pass mark is 70. If it fails, the Fixer repairs it, then the Manager re-plans, then the Senior engineer checks it in depth. One attempt per level; the best attempt is shown. This is called escalation.",
        "The customer sees four designs, picks one, and can ask Pulse (the helper ball) for changes, such as a different colour or a new heading.",
        "The journey ends at a finished, editable page, and a \"Launch\" button in the Full site panel can freeze a copy at a public address. Launch is built but not switched on until the database table for published sites has been created and the web address (DNS) is set up, so until then it answers \"not switched on yet\" and nobody outside can open a site.",
      ] },
      { p: "Each build writes a line in Builds log and a detailed story in Build Logs." },
    ],
  },
  {
    id: "buildlog", letter: "e", title: "Read a build log", roles: STAFF,
    blocks: [
      { p: "Use this when a customer says a build was bad, or when Failed builds goes up." },
      { ol: [
        "Open Builds log. Find the build by time or by project. Note the status and the error text.",
        "Open Build Logs and filter by that project. Read from the top, in time order.",
        "Look at the colours. Green is success. Orange is a failure. Blue means handed to a more senior bot. A blue row is normal; an orange row followed by nothing is the problem.",
        "Open Details on the first orange row. The reason is usually written in plain words.",
        "If the build reached the Senior engineer, read its report. It lists eight checks, what failed, the closest of the 24 looks, and what it tried.",
        "Decide: a one-off (note it and move on), a pattern (the same error three times, tell Claude), or an outage (see Handle an outage).",
      ] },
      { warn: "Exported logs can contain a customer's business wording. Keep them inside the team." },
    ],
  },
  {
    id: "alert", letter: "f", title: "Read a security alert", roles: ["owner", "admin"],
    blocks: [
      { p: "Honest status first: the automatic alert system (red banner, email, push) is planned for the next security phase and is not built yet. Today, trouble shows up in these places." },
      { ul: [
        "Security tab, Recent admin actions: a change you do not recognise. Treat it as serious.",
        "Assistant Audit: red failures, and unfamiliar IP addresses on someone's account.",
        "Team: an account that has never logged in, or a new account nobody asked for.",
        "The GitHub repository: if GitHub secret scanning is switched on, GitHub emails the owner when it finds a key in public code.",
      ] },
      { h: "If something looks wrong" },
      { ol: [
        "Do not panic and do not delete anything. Evidence matters.",
        "Revoke any account you do not recognise (Team, Revoke). It can be restored.",
        "If a key may have been seen by someone it should not have been, rotate it. See Rotate a key.",
        "Write down the time, what you saw and what you did. Then ask Claude to investigate.",
      ] },
    ],
  },
  {
    id: "addmember", letter: "g", title: "Add a team member", roles: ["owner", "admin"],
    blocks: [
      { ol: [
        "Open Team. Below the table, type the person's name and choose a role. Start with the lowest role that lets them do their job.",
        "Press Add team member. Type a reason when asked (for example: joined as engineer, agreed with Irfan).",
        "A screen shows their sign-in details once. Write them down or tell the person in a private way, in person or by phone. Why: only a scrambled copy is stored, so nobody, including you, can look them up later.",
        "Ask the person to sign in at once. In Team their Last login changes from never to a time. If it stays never after a day, check they got the details.",
      ] },
      { warn: "Never paste sign-in details into a chat, email or document. If you do, press New credentials for that person straight away." },
      { p: "You can only add people below your own level. Only the Owner is the Owner, and that cannot be changed from this screen." },
    ],
  },
  {
    id: "access", letter: "h", title: "Grant access safely", roles: ["owner", "admin"],
    blocks: [
      { p: "The rule is least access: give each person only what the job needs, for only as long as they need it. If someone is hacked or makes a mistake, the damage stops at their level." },
      { h: "What each role sees" },
      { ul: [
        "Owner: everything, including Ops, revenue and the AI balance.",
        "Admin: most things, but not Ops actions or revenue.",
        "Team lead: builds, projects, bot activity, code and docs.",
        "Engineer: code and deploy, builds, projects, bot activity, docs.",
        "Viewer: the dashboard headline numbers, Software and Docs, read only.",
      ] },
      { h: "Steps" },
      { ol: [
        "Decide what the person must do. Pick the role that does that and no more.",
        "Add them (see Add a team member) and note why in the reason box.",
        "Each month, open Team and ask: do they still need it? If not, press Revoke. Revoking keeps their history and can be undone.",
        "When someone leaves, revoke them the same day. Do not wait.",
      ] },
      { p: "Two-factor sign-in (a second code from a phone) is not built yet. Until it is, ask every person to use a long, unique password and never to share it." },
    ],
  },
  {
    id: "rotate", letter: "i", title: "Rotate a key", roles: ["owner"],
    blocks: [
      { p: "Rotating means replacing a secret key with a new one, then cancelling the old one. Do it when a key may have been seen by someone it should not have been, when a person who knew it leaves, or on a regular schedule." },
      { p: "There is no one-click button, by design: a rushed swap can take the site down. This is the same checklist shown in the Ops tab." },
      { ol: [
        "Create the new key in the provider's own website (OpenRouter, Supabase, Gemini and so on). Keep the old one active for now. Why: you must be able to go back.",
        "Open Ops, then Test connections, to see how the current key behaves. Note it.",
        "In Render, open the service, then Environment, and put the new key in the variable's value. Save. This restarts the site.",
        "When the restart finishes, run Test connections again. The provider must say ok.",
        "Do one real action that uses the key: a build, an image, or a voice message.",
        "Only now cancel the old key in the provider's website.",
        "If step 4 or 5 fails, put the old key back in Render (it still works) and start again.",
      ] },
      { warn: "Never paste a key into chat or a document. Type it only into Render or the provider's site." },
    ],
  },
  {
    id: "outage", letter: "j", title: "Handle an outage", roles: ["owner", "admin", "engineer"],
    blocks: [
      { p: "An outage is when customers cannot use Gurost, or a key part has stopped. Work from the outside in." },
      { ol: [
        "Confirm it. Open the public site in a private window. Open System Health.",
        "Open Ops, then Test connections. Which service says failed or rejected? That is your suspect. Most outages are one outside service.",
        "AI says payment problem or credit: top up the AI account in its website. This fixes every failing build at once.",
        "Everything is ok but the site is broken: open Code & deploy. Was there a deploy just before the trouble? If yes, ask an engineer to revert it (undo that change). The previous version goes live again.",
        "The hosting service itself is down: check Render's own status page. Nothing you do helps; wait and keep customers informed.",
        "Afterwards write down what happened, how long it lasted, and what fixed it.",
      ] },
      { warn: "Do not press Redeploy as a first move. It wipes any build in progress and rarely fixes an outside failure." },
    ],
  },
  {
    id: "breaks", letter: "k", title: "What to do when something breaks", roles: ALL,
    blocks: [
      { p: "Short version: stay calm, find out what changed, and change as little as possible." },
      { ol: [
        "What exactly is wrong, and who noticed? Write one sentence.",
        "When did it start? Compare that time with the last deploy (Code & deploy) and with the numbers in System Health.",
        "Is it one person or everyone? One person: look in Users, Projects and Build Logs. Everyone: see Handle an outage.",
        "Take a screenshot and copy the error words exactly. Do not retype them from memory.",
        "Tell Claude what you saw, and what you have not touched. A clear report fixes things faster than a fix attempt.",
        "If a recent change is clearly the cause, an engineer can revert it. A revert is small and recorded.",
      ] },
      { p: "Viewers and team members who cannot see the tabs mentioned should tell the Owner or an Admin what they saw." },
    ],
  },
  {
    id: "emergency", letter: "l", title: "Emergency checklist", roles: STAFF,
    blocks: [
      { p: "Use this when something serious is happening right now: customer data may be exposed, a key may be leaked, or the site is down. Read the whole list first, then act." },
      { ol: [
        "Stop the bleeding. If an account is suspicious, revoke it (Team). If a customer is abusing the service, block them with a reason (Users).",
        "If a key may have leaked, treat it as leaked. Rotate it now (see Rotate a key). Revoke the old key in the provider's website.",
        "If a bad change went live, ask an engineer to revert it. Do not try to fix forward in a hurry.",
        "Do not delete logs or records. They are the evidence.",
        "Write a timeline as you go: what you saw, when, and what you did.",
        "Tell Irfan if you are not Irfan. Tell Claude what you know.",
        "After it is over: find the cause, fix it properly, and add a line to the project memory so it does not happen again.",
        "If customer personal data was involved, a legal duty may apply (reporting to the UK data authority within 72 hours in some cases). Get proper advice at once.",
      ] },
    ],
  },
];

const GLOSSARY = [
  ["Admin area", "This control room, where the team watches and manages Gurost."],
  ["API", "A way for one program to ask another for something. Gurost's page asks Gurost's server through its API."],
  ["API key", "A secret password that lets Gurost use an outside service. Treat it like a bank card number."],
  ["App Builder", "The part of Gurost that builds a working app (database, behind-the-scenes code, screens). It waits until the Website Builder is ready."],
  ["Audit record", "A permanent note of who did what and when, so any action can be explained later."],
  ["Block", "Stopping a person from using the service, with a reason, without deleting anything."],
  ["Branch", "A line of saved code. Gurost uses one live branch, called clean-main."],
  ["Build", "One request to the Website Builder that makes designs for a customer."],
  ["Build log", "The record of a build: a short line in Builds log and a detailed story in Build Logs."],
  ["Business Assistant", "The helper that works on a customer's own business tasks such as research, email and tasks. Its actions appear in Assistant Audit."],
  ["Builder (bot)", "The first bot in the chain that assembles a page from ready-made sections."],
  ["Cache", "A short-term copy kept to save time. Clearing it is safe and the copy is rebuilt."],
  ["clean-main", "The one live branch. Anything saved there is put live automatically."],
  ["Commit", "A saved change to the code, with a note saying what changed, who made it and when."],
  ["Content Security Policy (CSP)", "A browser rule listing what a page may load. It limits some attacks. Gurost's is in report-only mode: it records problems but does not block yet."],
  ["Credits", "Money paid in advance to an outside service (such as the AI provider). When it runs out, that service stops."],
  ["Deploy", "Putting new code on the live site so customers get it. Render does this automatically after each commit to clean-main."],
  ["Design memory", "What the builder has learned about which combinations work best for each type of business. It stores structure only, never customers' words."],
  ["Environment variable", "A setting kept outside the code, such as a key or an on/off switch. Set in Render under Environment."],
  ["Error rate", "The share of requests where the server itself broke."],
  ["Escalation", "When a bot cannot fix a problem, a more senior bot takes over: Fixer, then Manager, then Senior engineer. Handing up is normal."],
  ["Fixer", "The second bot in the chain. It repairs a page that failed the quality check."],
  ["GDPR", "The law (UK and EU) that protects people's personal data. It affects what Gurost may store, share and keep."],
  ["GitHub", "The website where Gurost's code is stored and every change is recorded."],
  ["Manager (bot)", "The third bot in the chain. It re-plans the page when the Fixer could not rescue it."],
  ["Model", "An AI system such as the ones that write the page. Different models cost different amounts and write differently."],
  ["Owner", "The top role: Irfan. Can do everything and cannot be changed from the Team tab."],
  ["Password hash", "A scrambled form of a password. It lets the system check a password without ever storing the real one."],
  ["Premium Pipeline", "The system that picks from 24 checked looks, scores each page out of 100 and only ships pages that pass."],
  ["Pulse", "The helper ball inside the builder that customers use to ask for changes by voice or text."],
  ["Quality gate", "The checks a page must pass before anyone sees it, such as readable text and a layout that fits a phone."],
  ["Quality score", "A number out of 100 for how good a page is. The pass mark is 70."],
  ["Rate limit", "A cap on how many requests one person can make in a time, to stop abuse."],
  ["Redeploy", "Restarting the live site from the latest code. It clears builds in progress."],
  ["Render", "The hosting service that runs the live Gurost server."],
  ["Repository", "The folder of code and history on GitHub. Gurost's is public, so never put a secret in it."],
  ["Revert", "Undoing a change by saving a new change that cancels it. Small, recorded and safe."],
  ["Revoke", "Switching off someone's access. Their history stays, and it can be restored."],
  ["Role", "A person's level in the admin area: Owner, Admin, Team lead, Engineer or Viewer."],
  ["Rotate a key", "Replacing a secret key with a new one and cancelling the old one."],
  ["Section library", "The set of ready-made page parts (menu, hero, footer and more) the builder assembles pages from."],
  ["Secret", "Anything that must stay private: keys, passwords, sign-in details."],
  ["Senior engineer (bot)", "The last bot in the chain. It checks a page in depth and writes a report."],
  ["Server", "The computer program that answers every request from Gurost's pages."],
  ["Spec", "A written plan describing what a system should do, written before it is built."],
  ["Stripe", "The payments service Gurost will use. It is not live yet."],
  ["Supabase", "The database service where Gurost keeps its saved data."],
  ["Switch", "A setting that turns a feature on or off without new code. Also called a feature flag."],
  ["Token", "A small piece of text, roughly three-quarters of a word. AI models charge by the token."],
  ["Two-factor sign-in", "A second proof at sign-in, such as a code on your phone. Not built yet for the admin area."],
  ["Uptime", "How long the server has been running without a restart."],
  ["Vercel", "A hosting service Gurost uses to publish customers' finished sites."],
  ["Viewer", "The read-only role. It sees headline numbers, Software and Docs."],
  ["XSS", "A kind of attack where hostile text is slipped into a page and runs as code. Gurost escapes all text and tests for it on every change."],
];

module.exports = { SECTIONS, GLOSSARY, ALL, STAFF };

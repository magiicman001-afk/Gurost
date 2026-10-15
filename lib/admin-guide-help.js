"use strict";
/**
 * Help text for every admin tab (docs/ADMIN_GUIDE_SPEC.md section 1). Plain English, written for a non-technical
 * founder. Each entry: what it shows, what the numbers mean, what to do when something looks wrong, what NOT to click.
 * A test keeps every entry between 200 and 400 words and checks every tab has one.
 *
 * Only describes what exists today. When something is not built yet, the text says so.
 */

const HELP = {
  overview: {
    title: "Dashboard",
    shows: [
      "This is the first thing you see. It answers one question: is Gurost healthy this week? Each box is one number, taken from the live database when you open the tab.",
      "What you see depends on your role. The Owner and Admin see everything below. A Viewer sees only the build count, with no money and no error details.",
    ],
    numbers: [
      ["Builds this week", "How many website builds were started in the last 7 days. A build is one person asking the Website Builder for designs."],
      ["Failed builds this week", "Builds that ended in an error and gave the person no designs. A few is normal. If it is more than about one in ten builds, something needs a look."],
      ["Active builders", "How many different people started a build in the last 7 days."],
      ["Server errors, last hour", "Times the server itself broke in the last hour. This should be 0 or very close. It is not the same as a failed build."],
      ["AI spend this week", "What the AI models cost over the last 7 days, in US dollars, taken from the usage log."],
      ["Revenue", "Shows \"Not connected\" until Stripe (the payments service) is live. It is never a made-up zero."],
    ],
    wrong: [
      "A box that says \"Not available\" means that source could not be read right now. Open System Health, then try again in a minute.",
      "Failed builds rising: open Builds log to see the error text, then Build Logs to see which bot failed.",
      "Server errors above a handful: open System Health, then Code & deploy to see whether a deploy just happened.",
    ],
    dont: [
      "Do not treat \"Not connected\" as zero. It means nobody is measuring that yet.",
      "Do not redeploy (Ops) just because a number looks odd. A redeploy wipes any build someone is in the middle of.",
    ],
  },

  inventory: {
    title: "Software",
    shows: [
      "A list of everything Gurost is made of and whether each part is live, waiting, or not built. It also shows which version is running and which switches are on.",
      "This is the tab to open when someone asks \"is X live yet?\" It is a plain status board, not a control panel: nothing here changes anything.",
    ],
    numbers: [
      ["Version", "The first seven letters of the code version running right now. It matches a commit on GitHub, so an engineer can see exactly what code is live."],
      ["Running since", "When this copy of the server started. It restarts on every deploy, so this is also \"time of the last deploy\"."],
      ["Status", "Live means people can use it. Waiting means it is parked on purpose. In progress means being built. Not built means it does not exist yet."],
      ["Switches", "Settings that turn a feature on or off without new code, such as the Premium Pipeline. ON means active. off means asleep."],
    ],
    wrong: [
      "A switch shows off when you expected ON: it is set in Render under Environment. Ask Claude or an engineer to confirm, then change it there. Changing it restarts the site.",
      "Version says \"unknown\": the server was started outside Render (for example on a laptop). That is normal for testing.",
    ],
    dont: [
      "Do not read \"Live\" as \"launch ready\". The Launch flow is listed as in progress: the code exists, but it is not switched on until the published-sites database table is created and the web address (DNS) is set up, so nobody outside can open a launched site yet.",
      "Do not change switches in the middle of someone testing. Every change restarts the site.",
    ],
  },

  models: {
    title: "Models & APIs",
    shows: [
      "The outside services Gurost depends on: the AI models, image makers, voice, database, hosting and payments. For each one it shows whether its key is set on the server. It never shows the key itself.",
      "Think of each key as a door pass. If the pass is missing, that part of Gurost cannot work.",
    ],
    numbers: [
      ["Key: set", "A key exists on the server. This does not prove the key still works. Use Ops, then Test connections for that."],
      ["Key: not set", "No key. Features that need this service will fail or use a backup."],
      ["Balance", "Shows \"Not connected\". Most providers do not give Gurost a way to ask for the balance, so the money left is not shown here. The Owner can see the AI model balance under Ops, then Test connections."],
    ],
    wrong: [
      "AI builds failing with a payment error: the AI account is out of credit. Top it up in the provider's own website, then run Test connections.",
      "A service you pay for shows not set: ask an engineer to add the key in Render under Environment.",
    ],
    dont: [
      "Do not paste a key into chat, email or a document. If a key has been seen by someone it should not be, rotate it. See the Guide, \"Rotate a key\".",
      "Do not assume \"set\" means \"working\". A set key can still be wrong, expired or out of credit.",
    ],
  },

  projects: {
    title: "Projects",
    shows: [
      "Every website or app project saved in the database, newest first: its name, type, stage, when it last changed, and whether it is also in the server's memory right now.",
      "Projects are saved so that a refresh or a restart does not lose them. The \"in memory\" column shows which ones the running server is holding.",
    ],
    numbers: [
      ["Type", "Website or app."],
      ["State", "Where the project is: planning, building, choosing a design, ready, and so on."],
      ["Updated", "The last time anything changed in the project."],
      ["In memory", "Yes means the running server has it loaded. Projects not in memory are loaded again when their owner opens them."],
    ],
    wrong: [
      "A project stuck in a building state for a long time: open Build Logs for that project and look for a red failed row.",
      "A person says their project vanished: look for it here first. If it is listed, it is saved and can be restored. If not, it was never saved.",
      "Many projects for one person in a short time: open Users to check whether it is a real customer or someone testing the free plan limits.",
    ],
    dont: [
      "Do not worry that \"in memory\" is empty after a deploy. A deploy clears memory by design, and the saved copy stays here.",
      "Do not share project names outside the team. They can contain customer business details.",
    ],
  },

  builds: {
    title: "Builds log",
    shows: [
      "One line per website build attempt, newest first. It tells you who built, how it went, how many designs came out, and the best quality score.",
      "It starts from the day this log went live, so earlier builds are not in it. The note at the top says so.",
    ],
    numbers: [
      ["Status", "OK means the person got designs. Failed means they did not."],
      ["Designs", "How many designs came back. The target is four."],
      ["Best score", "The highest quality score out of 100 among the designs. 70 is the pass mark. Scores need the Premium Pipeline switched on to appear."],
      ["Seconds", "How long the whole build took."],
      ["Error", "The reason for a failure, in short form."],
    ],
    wrong: [
      "Many failed lines in a row with the same error: it is probably the AI account (no credit) or a provider outage. Check Models & APIs and Ops, then Test connections.",
      "Builds are slow (over about three minutes): check API Usage for an expensive model and System Health for slow responses.",
    ],
    dont: [
      "Do not use this tab to judge design quality. A score is a machine's opinion. Look at the real design, and Irfan's own eyes win.",
      "Do not delete or edit rows. This is a record, and there is no button for it on purpose.",
    ],
  },

  buildlogs: {
    title: "Build Logs",
    shows: [
      "The detailed story of each build: every action every bot took, in order, with the reason. A chain of bots tries to make a good page: the Builder first, then the Fixer, then the Manager, then the Senior engineer if needed.",
      "Green rows succeeded. Orange rows failed. Blue rows mean the task was handed to a more senior bot. Open Details on a row to see numbers, and for a Senior engineer row the written report.",
    ],
    numbers: [
      ["Bot", "Who did the action: Builder, Fixer, Manager, Senior engineer, Copywriter (the words), Photographer (the pictures) or Reviewer (the checks)."],
      ["Result", "Success, failed, or escalated (handed up)."],
      ["Decision and why", "What the bot chose and its reason, written in plain words."],
      ["Time", "How long the action took, in milliseconds."],
    ],
    wrong: [
      "A build that reached the Senior engineer: read its report. It lists what it checked and what it tried. If it says the page needs a person, look at the page yourself.",
      "A person says \"my build was bad\": filter by their project and read from the top. The first failed row is usually the cause.",
    ],
    dont: [
      "Do not worry about blue \"escalated\" rows. Handing up is the system working as designed, not an emergency.",
      "Do not send an exported log to anyone outside the team without reading it. It can include the customer's business wording.",
    ],
  },

  memory: {
    title: "Design memory",
    shows: [
      "What the Website Builder has learned about which design combinations work best for each kind of business. It keeps only the structure of a build (the business type, the sections, the colours, the score), never a person's words or details.",
      "Once an industry has at least 50 recorded builds, the builder starts leading with the best-performing combination, and still tries something new on about one build in five so it keeps learning.",
    ],
    numbers: [
      ["Builds", "How many builds are recorded for that industry."],
      ["Average score", "The mean quality score out of 100."],
      ["Kept and Deleted", "How often people kept a design, or threw it away. Keeping is a good sign."],
      ["Value", "A combined score that ranks combinations. Higher is better."],
      ["Learning", "Green means it has enough builds to lead with the best combination. Orange shows how many more it needs."],
    ],
    wrong: [
      "Nothing is listed: the memory only fills when the Premium Pipeline and Design Memory switches are on (see Software).",
      "One combination dominating: that is expected once an industry is learning. The one-in-five exploring prevents it getting stuck.",
    ],
    dont: [
      "Do not read much into an industry with only a handful of builds. The averages are too small to trust.",
      "Do not expect people's text here. It is deliberately not stored.",
    ],
  },

  code: {
    title: "Code & deploy",
    shows: [
      "Where the code lives and what is running. It shows the running version, the most recent deploys from the hosting service (Render), and the latest saved changes (commits) on GitHub.",
      "A deploy is the act of putting new code live. Render does it automatically every time code is saved to the main branch, which is called clean-main.",
    ],
    numbers: [
      ["Running", "The version and start time of the live server."],
      ["Deploy status", "Live means it is the current one. Building means it is on its way. Failed means that version did not go live and the previous one is still serving."],
      ["Commit", "A saved change to the code with a note of what changed, who made it and when."],
    ],
    wrong: [
      "The site misbehaves right after a deploy: compare the time of the problem with the deploy time here. If they match, the new code is the suspect. See the Guide, \"What to do when something breaks\".",
      "It says \"Not connected\": the hosting or GitHub access key is missing on the server. Ask an engineer to add it.",
    ],
    dont: [
      "Do not expect to change code here. This tab only shows. Changes are made by Web Claude or Laptop Claude and saved to GitHub.",
      "Do not trigger deploys by habit. Every deploy restarts the site and clears builds in progress.",
    ],
  },

  docs: {
    title: "Docs",
    shows: [
      "Links to the written documents that explain Gurost: the project memory file, the specs for each system, and the plans. They open on GitHub.",
      "These are the long-form answers. If you wonder why something works the way it does, the answer is usually in one of these.",
    ],
    numbers: [
      ["CLAUDE.md", "The project's memory: rules, priorities, known problems and what is done. The first thing every Claude reads."],
      ["Specs", "Each major system has a spec, which is a written plan saying what it should do before it is built."],
      ["HOW GUROST WORKS", "The master reference for the whole company. If you only read one thing, read this."],
    ],
    wrong: [
      "A link opens a \"not found\" page: the file was renamed. Tell Web Claude.",
      "You cannot open the links: the repository is on GitHub and needs the internet. They are public, so no sign-in is needed.",
      "You are looking for a how-to for a task, such as adding a team member: the Guide tab in this admin area has step-by-step help for that, written for non-technical readers.",
    ],
    dont: [
      "Do not put anything private in these documents. The repository is public, and so is everything in it. Never write a password or a key in a document.",
      "Do not edit the documents on GitHub's website. Ask Claude, so the change is checked and recorded.",
    ],
  },

  ops: {
    title: "Ops",
    shows: [
      "The control room, for the Owner only. It has three parts: Test connections (a read-only health check of every outside service), two action buttons (Redeploy and Clear caches), and the guided checklist for replacing a key.",
      "Every action here asks for your password again, asks you to type a reason, and is written to the audit record with your name on it.",
    ],
    numbers: [
      ["Test connections", "One harmless call to each service. ok means it answered. rejected means the key was refused. failed means no answer. not set means no key. For the AI account it also shows the money used and left."],
      ["Redeploy", "Restarts the live site from the latest code. Allowed once every 10 minutes."],
      ["Clear caches", "Forgets stored admin roles and in-memory build logs. Allowed once a minute. It is safe."],
    ],
    wrong: [
      "A service says rejected: its key is wrong or expired. Follow the key checklist below, which is also in the Guide.",
      "The AI account shows $0 or less remaining: top it up in the provider's website. Builds fail until you do.",
    ],
    dont: [
      "Do not press Redeploy while someone is building. The page refuses unless you tick \"force\", and force wipes their work. Check Projects first.",
      "Do not skip the reason box. Future you will want to know why it was done.",
      "Never replace a key by deleting the old one first. Follow the checklist order: new key in, test, then retire the old one.",
    ],
  },

  team: {
    title: "Team",
    shows: [
      "Who can sign in to this admin area, and at what level. You can add people, change their level, switch them off, and give them new sign-in details.",
      "You can only manage people below your own level, and never yourself. The Owner cannot be changed from here at all, which protects you from locking everyone out.",
    ],
    numbers: [
      ["Role", "Owner, Admin, Team lead, Engineer or Viewer. Each sees a different set of tabs. The Guide explains each."],
      ["Status", "Active can sign in. Revoked cannot, but their history stays."],
      ["Last login", "When they last signed in. \"never\" means the account was made but not yet used."],
    ],
    wrong: [
      "Someone lost their sign-in: press New credentials for them. The old ones stop working at once.",
      "Someone left the team or you are unsure about an account: press Revoke immediately, then think. You can restore later.",
      "A new person cannot see a tab they expected: that is their role, not a fault. Roles are meant to see only what they need. Change the role only if the job really needs it.",
    ],
    dont: [
      "Do not copy new credentials into a chat or email. They are shown once, on this screen, and stored only as a scrambled version. Give them in person or by phone.",
      "Do not give someone a higher role than they need. Start low. The Guide, \"Grant access safely\", explains why.",
    ],
  },

  security: {
    title: "Security",
    shows: [
      "A plain list of the protections Gurost has, and whether each is on. It also counts the admin accounts and lists the most recent admin actions, with who did them and why.",
      "It is honest about gaps. Anything not built yet says so, rather than showing a reassuring tick.",
    ],
    numbers: [
      ["Protection and state", "On means working. Report-only means it is watching and recording but not blocking yet. Not built means it does not exist."],
      ["Admin accounts", "How many active and revoked accounts there are, by role."],
      ["Never logged in", "Accounts that were created but have not signed in. If the person does not need access, revoke it."],
      ["Recent admin actions", "A record of changes: who, what and the reason typed."],
    ],
    wrong: [
      "An admin action you do not recognise: revoke that account at once in Team, create new credentials for anyone else who may be affected, and ask Claude to look at the audit record.",
      "An account on the list that should not exist: revoke it, then find out who created it.",
      "A protection you expected to be on says off or report-only: do not guess. Ask Claude, who can check the setting and tell you what turning it on would affect.",
    ],
    dont: [
      "Do not read \"report-only\" as protected. It records problems and does not stop them yet.",
      "Two-factor sign-in is not built yet, so a strong, unshared password matters a great deal.",
    ],
  },

  users: {
    title: "Users",
    shows: [
      "The people who have signed up to use Gurost: their email, their plan, whether they are active or blocked, and when they joined.",
      "You can block a person, which stops them using the service, and unblock them. Blocking records the reason you type.",
    ],
    numbers: [
      ["Users", "Everyone who has an account."],
      ["Joined this week", "New sign-ups in the last 7 days."],
      ["On a paid plan", "Anyone not on the free plan."],
      ["Blocked", "How many are currently blocked."],
    ],
    wrong: [
      "A customer reports they cannot sign in: look for them here. If they are blocked, read the reason before doing anything.",
      "Someone is abusing the service, for example running up cost: block them with a clear reason, then look at API Usage and Bot Activity for what they did.",
      "A customer asks you to delete their data: this tab only blocks. Deleting a person's data properly (the legal right to erasure) is a separate job that must be done carefully, so ask Claude and write down the request and the date.",
    ],
    dont: [
      "Do not block someone without typing a reason. If they complain, the reason is your evidence.",
      "Do not share this list. It contains personal data, which UK law (GDPR) protects.",
      "Do not unblock someone just because they ask politely. Read the reason it was blocked first, and check what they did before you decide.",
    ],
  },

  usage: {
    title: "API Usage",
    shows: [
      "What the AI models are costing, grouped by model, for the last 500 calls. It is the tab to open when the bill looks high.",
      "A call is one request to an AI model. A token is a small piece of text, roughly three-quarters of a word. Models charge by the token.",
    ],
    numbers: [
      ["Total cost", "The dollar cost across these calls."],
      ["Calls", "How many requests were made."],
      ["Input and output tokens", "Text sent to the model, and text it wrote back. Output usually costs more."],
      ["Share", "How much of the total cost each model caused. A thin bar is cheap, a long bar is where the money goes."],
    ],
    wrong: [
      "One model eating most of the cost: check the Builds log to see whether builds got slower or more frequent. Ask Claude whether that model is still the right choice for that job.",
      "No data at all: the usage log is empty. Either nothing has run, or logging is broken. Run a build and look again.",
    ],
    dont: [
      "Do not switch models without testing. A cheaper model can quietly produce worse designs.",
      "Do not forget this is the last 500 calls, not a whole month. For the true balance, look in the AI provider's own dashboard.",
    ],
  },

  health: {
    title: "System Health",
    shows: [
      "How the server has behaved in the last hour, in four numbers. The badge at the top summarises: Healthy, Watch, or Needs attention.",
      "The thresholds are written on the page. Amber starts at 1% errors or one-second responses. Red starts at 5% errors or three-second responses.",
    ],
    numbers: [
      ["Uptime", "How long the server has been running since its last start. A short uptime after a long one means it restarted, usually a deploy."],
      ["Requests (1h)", "How many times anyone asked the server for something in the last hour."],
      ["Error rate", "The share of requests where the server itself broke. Not the same as a person typing something wrong."],
      ["Avg response", "The typical wait for an answer, in milliseconds. 1000 ms is one second."],
    ],
    wrong: [
      "Needs attention: check Code & deploy for a deploy in the last hour. If one just happened and the problems began with it, tell an engineer to revert it.",
      "Error rate high but requests low: the percentage swings wildly on tiny numbers. Wait ten minutes and look again.",
      "Responses slow but errors zero: the server is working but something it depends on is slow, such as an AI provider. Open Ops, then Test connections to see which service answers slowly.",
    ],
    dont: [
      "Do not panic at a red number with only a handful of requests behind it.",
      "Do not redeploy as a first reaction. It clears any builds running right now.",
    ],
  },

  payments: {
    title: "Payments",
    shows: [
      "Which accounts are on which plan, and whether each has a payment (Stripe) account attached. It does not show money, because payments are not live yet.",
      "The note at the top says so in plain words. When Stripe goes live this tab will show real payments.",
    ],
    numbers: [
      ["Accounts", "Everyone with a plan record."],
      ["On a paid plan", "Accounts not on free."],
      ["With a Stripe account", "Accounts that have a payment profile attached."],
      ["Plans", "A count of accounts for each plan."],
    ],
    wrong: [
      "Someone says they paid but shows free: payments are not live, so check how they paid. Ask an engineer before changing their plan by hand.",
      "A paid plan with no Stripe account: it may have been set up manually for testing. Check with the person who set it.",
      "You want to know what a plan includes: the pricing page on the public site is the source of truth. Do not change a plan from memory.",
    ],
    dont: [
      "Do not promise refunds or access from this tab. It is a record, not a ledger.",
      "Do not treat these figures as revenue. There is a Revenue box on the Dashboard that reads Not connected until payments are real.",
      "Do not give anyone a paid plan by hand to settle an argument. Keep a written note of who approved it and why, so the books match later.",
    ],
  },

  bots: {
    title: "Bot Activity",
    shows: [
      "A list of recent things the AI helpers have done for people, newest first: who, what kind of action, the start of what was asked, and when.",
      "Use it to see what people actually use Gurost for, and to spot odd or heavy use.",
    ],
    numbers: [
      ["Recent actions", "How many rows are listed."],
      ["Different users", "How many separate people they came from."],
      ["Most common", "The kind of action that appears most often."],
      ["Prompt", "The first part of what the person typed. It is shortened on purpose."],
    ],
    wrong: [
      "One person doing hundreds of actions: look them up in Users. If it looks like abuse, block them with a reason.",
      "A person says the assistant did something wrong: find their row, then open the Assistant Audit tab for the detailed trail.",
      "A sudden jump in activity: check System Health and API Usage at the same time. More activity means more cost, and it can also mean one person is looping a request.",
    ],
    dont: [
      "Do not read people's prompts for curiosity. They are private business ideas. Look only when you have a reason, such as a complaint or abuse.",
      "Do not copy prompts into other tools or chats.",
      "Do not treat a long list as a problem by itself. Busy is good. Look for one person or one kind of action that stands out from the rest.",
    ],
  },

  audit: {
    title: "Assistant Audit",
    shows: [
      "A detailed record of what the Business Assistant did for each person: chats, tool calls, approvals, memory changes and errors. It is there so any action can be explained afterwards.",
      "Message text, email bodies and secrets are never stored here. Only what happened, not what was said.",
    ],
    numbers: [
      ["Event", "The type of thing: chat, tool call, approval, memory or error."],
      ["Tool", "Which tool the assistant used, such as email."],
      ["OK", "Yes if it worked. A red no means it failed."],
      ["Asked for and Answered by", "The AI model that was requested and the one that really answered. They can differ when a backup was used."],
      ["Approved", "Whether the person approved or cancelled an action that needed their permission."],
      ["IP", "The network address the request came from."],
    ],
    wrong: [
      "A person disputes that the assistant sent something: filter by their user id and the tool, and read the time and approval column.",
      "Many red failures: filter by Errors to see them together.",
      "A failure tied to one tool, such as email: the connection to that service may be down. Open Ops, then Test connections.",
    ],
    dont: [
      "Do not share rows outside the team. They hold user ids and IP addresses, which count as personal data.",
      "Do not look people up out of curiosity. Use it for support and for investigating a problem.",
    ],
  },

  proactive: {
    title: "Proactive Log",
    shows: [
      "Every time one of the eight assistants spoke up without being asked, newest first: Pulse flagging a problem during a build, Review pointing out a design that scored low, Launch reminding someone what is missing before they go live, and Planner suggesting one next step.",
      "These messages are written by simple rules, not by an AI model, so they cost nothing. Each one shows the evidence it came from, such as the build step that failed or the quality score.",
    ],
    numbers: [
      ["Bot", "Which assistant spoke: pulse, review, launch or planner."],
      ["Kind", "What it was about. A build problem is marked alert and makes the assistant's picture flash. The others show a quiet dot."],
      ["Status", "New means waiting to be seen. Seen means the person opened it. Dismissed means they pressed Got it."],
      ["Said", "The exact sentence the person was shown."],
      ["Evidence", "The fact behind it, so you can check the assistant was not guessing."],
    ],
    wrong: [
      "Nothing appears at all: the table behind this tab may not exist yet. The page will say so. Ask Claude to confirm the nudges migration was run in Supabase.",
      "One person getting many alerts: look at the Builds log and Build Logs for that person. Repeated problem messages usually mean the builds really are failing.",
      "A person says the assistants nag them: each person can set Normal, Quiet or Off inside any assistant's panel. Normal is at most three a day, Quiet is one.",
    ],
    dont: [
      "Do not read these out of curiosity. They name real projects, so open them only when helping with a complaint or a problem.",
      "Do not treat a long list as a fault by itself. Check whether the problems are real before changing anything.",
      "Do not share rows outside the team. They hold user ids, which count as personal data.",
    ],
  },
  tools: {
    title: "Connected Tools",
    shows: [
      "One line for each outside tool the assistants can use: Gmail, Calendar, video calls, voice and email alerts. Each shows On, Partly or Off, and in plain words what is missing.",
      "For Gmail it also shows how many people have connected their account and how many of them allowed inbox reading. It shows counts only, never anyone's address, mail or key.",
      "The page only checks that a setting exists on the server. It never shows the secret value itself.",
    ],
    numbers: [
      ["On", "Everything the tool needs is set. People can use it."],
      ["Partly", "Some settings exist but not all, or a database table is missing. The line says which."],
      ["Off", "Not set up. The assistants quietly leave the tool out, and nothing breaks."],
      ["Connected", "How many people pressed Connect Gmail and gave permission."],
      ["Reading the inbox", "How many of those people also switched on inbox reading. That is a separate choice for each person."],
      ["Redirect address", "The exact web address that must be registered in the Google console, or Google will refuse the connection."],
    ],
    wrong: [
      "Gmail says Partly: read the Missing line. Usually one of the Render settings was not added, or the Supabase migration for gmail connections was not run.",
      "People click Connect Gmail and Google shows a warning: while the Google app is unverified, only test users added in the Google console can connect. Ask Claude before inviting customers.",
      "A person says Gmail stopped working: they may have removed Gurost in their Google account. The next use disconnects it, and they connect again from Settings.",
    ],
    dont: [
      "Do not paste any client secret or key into chat, email or this page. Settings are changed only in Render.",
      "Do not tell customers the assistant can delete or archive mail. It cannot, on purpose.",
      "Do not turn on Calendar or Gmail for customers before the Google review and the privacy policy review are finished.",
    ],
  },
  scout: {
    title: "Scout Runs",
    shows: [
      "Every time a customer pressed Scout my business: when, which customer (a short code, never a name), how it ended, how many pages and web searches it used, and how many statements and fixes it produced.",
      "It shows counts and timings only. It never shows what Scout found about anyone's business.",
      "Scout reads the customer's own public website and searches the web. Each customer gets 5 runs a month, and there is a daily limit for the whole service.",
    ],
    numbers: [
      ["Status", "Running, Ready (waiting for the customer to confirm), Confirmed, Discarded or Failed."],
      ["Counted", "Yes once something that costs money was used. Failed runs that cost nothing are not counted against the customer."],
      ["Searches and Pages", "Web searches made (the paid part) and website pages read. At most 4 searches and 5 pages per run."],
      ["Statements and Fixes", "How many sourced statements and how many things to fix the run produced."],
      ["Removed", "Statements the server deleted because the quote did not match its source. A high number means the AI is guessing."],
    ],
    wrong: [
      "Many Failed rows: usually the customer's website blocks robots or is down, or web search is not switched on. The Error column says which.",
      "Costs rising: check Searches. If the daily limit is hit, customers see a polite message and nothing else breaks.",
      "A customer says the result is wrong: Scout shows public information that can be wrong, and they confirm it first. Ask them to remove the statement and tell Claude which source misled it.",
    ],
    dont: [
      "Do not raise the monthly limit without checking the cost of web searches first.",
      "Do not ask a customer to scout a website that is not theirs. Scout is for the owner's own business.",
      "Do not share rows outside the team. Even short codes count as personal data.",
    ],
  },
};

module.exports = { HELP };

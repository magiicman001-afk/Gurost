# Admin Help and Guide system: spec

Written 2026-10-12 (Web Claude). Request (Irfan): "In the admin pages, can Claude explain how everything works step by
step once everything is finished and built?" Every serious admin has help, so this is a real feature, not a chat message.

Tone: plain English, written for Irfan (a non-technical founder) and still useful to programmers. No jargon without a
definition. Every "why" is explained, not just the "what". It describes only what exists today and says so when
something is not built yet (no 2FA, no alerts yet, and so on). A guide that promises things that are not there is worse
than no guide.

## 1. Help icons ("?") on every tab

- Every admin tab has a "?" button in the top corner of its panel. It opens a help panel for that tab.
- Each help text has five parts: what this tab shows; what each number or column means; what to click when something looks
  wrong; what NOT to click (and why); who can see it.
- Length: 200 to 400 words per tab. A test enforces this, and a test fails if a tab exists with no help (so a new tab
  cannot ship without its help).
- The help panel is read-only, closes with Escape or the close button, and works on a phone (full-width sheet).

## 2. Guide tab

A new tab, "Guide", visible to every role. Top to bottom:

a. Welcome and overview. b. Daily routine (the morning check). c. Weekly routine (Sunday). d. Build a website, end to end.
e. Read a build log. f. Read a security alert. g. Add a team member. h. Grant access safely. i. Rotate a key.
j. Handle an outage. k. What to do when something breaks. l. Emergency checklist. m. Glossary.

- Searchable: one search box filters sections, help texts and glossary terms as you type.
- Each section is short steps with the reason for each step.
- Screenshots inline are a later step (section 7); the first version is text.

## 3. Role-specific guide

The server decides what each person receives, not the page (a Viewer's browser never receives Owner-only text):

| Role | Gets |
|---|---|
| Owner | the full guide, every tab's help |
| Admin | most of it (no ops actions, no revenue) |
| Team lead | builds, projects, bots, code, docs |
| Engineer | code and deploy, builds, projects |
| Viewer | read-only basics: dashboard, software, docs |

Help texts follow the tabs a role can open (the same access table the tabs use: `lib/admin-access.js`). Guide sections
carry a list of roles. Sections about rotating keys or redeploying are Owner-only.

## 4. Onboarding

- First login on a browser: a 5-step walkthrough opens (where you are, what the tabs are, the "?" icons, the Guide tab,
  what to check each morning). Steps are short. It can be skipped and re-opened any time from the Guide tab or the
  "Take the tour" link.
- "Seen" is remembered in the browser per person (a convenience only; clearing it just shows the tour again).

## 5. Glossary

Plain-English definition for every term the admin uses, for example Deploy = putting new code on the live site;
Commit = saving a change to the code with a note; Escalation = a more senior bot takes over when the first one
cannot fix a problem; Quality gate = the checks a page must pass before anyone sees it. A test fails when the glossary is
missing a term the help texts promise to explain, or has a duplicate.

## 6. Data and safety

- Content lives in the code (`lib/admin-guide-content.js`), so it is versioned and reviewed like any change.
- Route: `GET /api/admin/guide` (any signed-in admin; filtered by role on the server).
- The page draws it as text only (never as HTML), so a mistake in the content cannot become a security hole.
- Nothing in it contains a secret, a key, or a real person's data.

## 7. Later

- Screenshots inline: taken from the real admin pages at 375px and 1440px and stored as files; added once the pages stop changing.
- Walkthrough videos: 30 to 60 seconds per major feature, only if time allows.
- When Security Week 2 lands (alerts, config auditor), the "Read a security alert" section gets its real screens.

## 8. Build order

1. Spec (this file). 2. Content and logic with tests. 3. Server route. 4. Help icons and panels, Guide tab, search.
5. Onboarding tour. 6. Screenshots. Also written: `docs/HOW_GUROST_WORKS.md`, the master reference (and the "if Irfan
is hit by a bus" document, and the investor overview).

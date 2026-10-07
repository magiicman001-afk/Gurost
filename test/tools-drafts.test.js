// Run: node --test test/tools-drafts.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../lib/tools");
const cal = require("../lib/tools/calendar-event");
const { runWithTools } = require("../lib/tools/loop");

const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
const now = () => new Date("2026-10-07T10:00:00Z");

test("email_draft: builds a draft that is marked not sent; checks addresses; stops header tricks", async () => {
  const ok = await quiet(() => tools.runTool("email_draft", { to: "john@crumb.example, ann@x.co", subject: "Quote\r\nBcc: evil@x.com", body: "Hi John,\n\nThanks.\n\nAlex" }));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.result.to, ["john@crumb.example", "ann@x.co"]);
  assert.equal(ok.result.subject, "Quote Bcc: evil@x.com", "line breaks removed from the subject");
  assert.equal(ok.result.sent, false);
  assert.match((await quiet(() => tools.runTool("email_draft", { to: "not-an-email", subject: "s", body: "b" }))).error, /not a valid email/);
  assert.equal((await quiet(() => tools.runTool("email_draft", { subject: "s", body: "b" }))).ok, true, "recipient is optional");
  assert.match((await quiet(() => tools.runTool("email_draft", { subject: "  ", body: "b" }))).error, /Missing|subject/);
  assert.match((await quiet(() => tools.runTool("email_draft", { to: Array(11).fill("a@b.co").join(","), subject: "s", body: "b" }))).error, /too many/);
});

test("calendar: local time converts to UTC with daylight saving, in several zones", () => {
  assert.equal(cal.zonedToUtc("2026-10-14T14:30", "Europe/London").toISOString(), "2026-10-14T13:30:00.000Z", "BST = UTC+1");
  assert.equal(cal.zonedToUtc("2026-12-01T14:30", "Europe/London").toISOString(), "2026-12-01T14:30:00.000Z", "GMT = UTC+0");
  assert.equal(cal.zonedToUtc("2026-10-14T09:00", "America/New_York").toISOString(), "2026-10-14T13:00:00.000Z");
  assert.equal(cal.zonedToUtc("2026-10-14T20:00", "Asia/Tokyo").toISOString(), "2026-10-14T11:00:00.000Z");
  assert.throws(() => cal.zonedToUtc("2026-10-14 14:30", "Europe/London"), /start must look like/);
  assert.throws(() => cal.zonedToUtc("2026-02-30T10:00", "Europe/London"), /not a real/);
  assert.throws(() => cal.zonedToUtc("2026-10-14T10:00", "Mars/Base"), /time zone/);
});

test("calendar_event: proposal with a valid .ics, escaped text, default zone and length", async () => {
  const r = await quiet(() => tools.runTool("calendar_event", { title: "Supplier call; flour, eggs", start: "2026-10-14T14:30", description: "Line one\nLine two", location: "Zoom" }, { now }));
  assert.equal(r.ok, true);
  const e = r.result;
  assert.deepEqual([e.timezone, e.durationMinutes, e.startUtc, e.endUtc, e.added], ["Europe/London", 60, "2026-10-14T13:30:00.000Z", "2026-10-14T14:30:00.000Z", false]);
  assert.match(e.ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0/);
  assert.match(e.ics, /DTSTART:20261014T133000Z\r\n/);
  assert.match(e.ics, /DTEND:20261014T143000Z\r\n/);
  assert.match(e.ics, /SUMMARY:Supplier call\; flour\\, eggs\r\n/);
  assert.match(e.ics, /DESCRIPTION:Line one\\nLine two\r\n/);
  assert.match(e.ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  assert.match((await quiet(() => tools.runTool("calendar_event", { title: "x", start: "2026-10-14T14:30", duration_minutes: 5000 }))).error, /between 5 minutes/);
  assert.match((await quiet(() => tools.runTool("calendar_event", { title: "x", start: "tomorrow" }))).error, /start must look like/);
});

test("the loop hands email and event drafts to the page as proposals, and only when they worked", async () => {
  const replies = [
    'TOOL_CALL: {"tool":"email_draft","args":{"subject":"Hello","body":"Hi there"}}',
    'TOOL_CALL: {"tool":"calendar_event","args":{"title":"Call","start":"nonsense"}}',
    "Here is the email. I could not set the event."
  ];
  const call = async () => ({ parsed: replies.shift() });
  const out = await quiet(() => runWithTools({ call, system: "S", messages: [{ role: "user", content: "q" }] }));
  assert.equal(out.proposals.length, 1);
  assert.equal(out.proposals[0].type, "email");
  assert.deepEqual(out.toolsUsed, [{ tool: "email_draft", ok: true }, { tool: "calendar_event", ok: false }]);
});

test("draft tools never send or add anything: they need no approval because they do nothing", () => {
  for (const name of ["email_draft", "calendar_event"]) {
    const t = tools.list().find((x) => x.name === name);
    assert.equal(t.needsApproval, false);
    assert.ok(t.proposal);
    assert.match(t.description, /does NOT/);
  }
});

test("long .ics lines are folded at 75 bytes and unfold back to the original text", async () => {
  const long = "A very long meeting description that goes on and on, with accents é and ü, well past the seventy-five byte limit of a calendar line.";
  const r = await quiet(() => tools.runTool("calendar_event", { title: "T", start: "2026-10-14T14:30", description: long }, { now }));
  const lines = r.result.ics.split("\r\n");
  assert.ok(lines.every((l) => Buffer.byteLength(l) <= 75), "no line over 75 bytes");
  const unfolded = r.result.ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("DESCRIPTION:" + long.replace(/,/g, "\\,")));
});

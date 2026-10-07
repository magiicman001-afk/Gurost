/**
 * Calendar event tool. It prepares an event proposal plus a standard .ics
 * file the user can open to add it to ANY calendar. It does not create the
 * event itself or check availability (there is no calendar connection yet).
 */
const pad = (n) => String(n).padStart(2, "0");

/** Local wall-clock time in an IANA zone -> a UTC Date. Handles daylight saving. */
function zonedToUtc(local, timeZone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error("start must look like 2026-10-14T14:30 (local time, no zone).");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(asUtc).getUTCMonth() !== mo - 1 || h > 23 || mi > 59) throw new Error("That is not a real date and time.");
  let fmt;
  try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { throw new Error(`"${timeZone}" is not a time zone I know. Use a name like Europe/London.`); }
  const offsetAt = (ms) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).filter((x) => x.type !== "literal").map((x) => [x.type, +x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - ms;
  };
  let ms = asUtc - offsetAt(asUtc);
  ms = asUtc - offsetAt(ms); // second pass settles dates near a clock change
  return new Date(ms);
}

const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function buildIcs({ title, start, end, location, description, uid, now }) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gurost//Business Assistant//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(title)}`];
  if (location) lines.push(`LOCATION:${esc(location)}`);
  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// The .ics format limits a line to 75 bytes; longer lines continue on the next line after a space.
function fold(line) {
  const out = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

module.exports = {
  name: "calendar_event",
  description: "Prepare a calendar event for the user to add themselves: a card with the details and a calendar file (.ics) that opens in any calendar app. Use it when the user wants to schedule something. It does NOT add the event or check their diary.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event title" },
      start: { type: "string", description: "Local start, like 2026-10-14T14:30" },
      timezone: { type: "string", description: "IANA zone like Europe/London. Defaults to Europe/London." },
      duration_minutes: { type: "number", description: "Length in minutes, 5 to 1440. Defaults to 60." },
      location: { type: "string", description: "Where, if known" },
      description: { type: "string", description: "Notes for the event" }
    },
    required: ["title", "start"]
  },
  needsApproval: false,
  proposal: "event",
  zonedToUtc,
  buildIcs,
  async execute({ title, start, timezone, duration_minutes, location, description }, ctx = {}) {
    const name = String(title).replace(/[\r\n]+/g, " ").trim().slice(0, 150);
    if (!name) throw new Error("The event needs a title.");
    const zone = timezone || "Europe/London";
    const mins = Math.round(duration_minutes === undefined ? 60 : duration_minutes);
    if (!(mins >= 5 && mins <= 1440)) throw new Error("The length must be between 5 minutes and 24 hours.");
    const startUtc = zonedToUtc(start, zone);
    const endUtc = new Date(startUtc.getTime() + mins * 60000);
    const now = ctx.now ? ctx.now() : new Date();
    const loc = location ? String(location).slice(0, 200) : "";
    const notes = description ? String(description).slice(0, 1000) : "";
    const uid = `${startUtc.getTime()}-${Math.abs([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}@gurost`;
    return { type: "event", title: name, start: start, timezone: zone, durationMinutes: mins, startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString(), location: loc, description: notes, ics: buildIcs({ title: name, start: startUtc, end: endUtc, location: loc, description: notes, uid, now }), added: false };
  }
};

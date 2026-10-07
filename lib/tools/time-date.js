/** Time and date tool, with real time-zone handling (Intl, no library). */
const DAY_MS = 86400000;

function checkZone(tz) {
  const zone = tz || "UTC";
  try { new Intl.DateTimeFormat("en-GB", { timeZone: zone }); } catch { throw new Error(`"${zone}" is not a time zone I know. Use a name like Europe/London.`); }
  return zone;
}

function describe(date, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return { timeZone: zone, weekday: parts.weekday, date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, utc: date.toISOString() };
}

function parseDay(text, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || "").trim());
  if (!m) throw new Error(`${label} must be a date like 2026-10-07.`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) throw new Error(`${label} is not a real date.`);
  return d;
}

module.exports = {
  name: "time_date",
  description: "Get the current date and time in any time zone, or the number of days between two dates. Use it instead of guessing what day or time it is.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["now", "days_between"], description: "now = current date and time; days_between = days from one date to another" },
      timezone: { type: "string", description: "For now. IANA name like Europe/London. Defaults to UTC." },
      from: { type: "string", description: "For days_between. YYYY-MM-DD" },
      to: { type: "string", description: "For days_between. YYYY-MM-DD" }
    },
    required: ["action"]
  },
  needsApproval: false,
  async execute(args, ctx = {}) {
    if (args.action === "now") return describe((ctx.now ? ctx.now() : new Date()), checkZone(args.timezone));
    if (args.action === "days_between") {
      const a = parseDay(args.from, "from"), b = parseDay(args.to, "to");
      return { from: args.from, to: args.to, days: Math.round((b - a) / DAY_MS) };
    }
    throw new Error("action must be now or days_between.");
  }
};

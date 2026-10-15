"use strict";
/**
 * Proactive intelligence (Business Assistant 2.0, phase 4): bots speak up without being asked.
 *   Pulse    catches a problem during a build        (from the build log: a bot's step failed)
 *   Review   spots an improvement                    (from the quality score of the designs)
 *   Launch   reminds about what is pending           (not live yet, contact details missing)
 *   Planner  suggests the next step                  (pick a design; after launch, share it)
 * Plain rules over facts the app already has. No model is called, so it costs nothing, and it never invents: every nudge
 * carries the line of evidence it came from. Lines are written here, in each bot's own voice (hardcoded catchphrases).
 *
 * Limits: normal = up to 3 a day, quiet = 1, off = none; at most one per bot a day; the same thing is never raised twice
 * (dedupe key); a dismissed kind stays quiet for 7 days; nudges expire after 3 days. Fails closed: if the table is
 * missing or anything errors, nobody is nudged. All database access goes through `db` so tests pass a stand-in.
 */
const personalities = require("./bot-personalities");

const DAY = 24 * 60 * 60 * 1000;
const MODES = { normal: 3, quiet: 1, off: 0 };
const EXPIRES_MS = 3 * DAY;
const DISMISS_QUIET_MS = 7 * DAY;
const PROBLEM_WINDOW_MS = DAY;
const T = "bot_nudges", S = "bot_nudge_settings";
const clip = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
const BOT_LABEL = { builder: "Builder", fixer: "Fixer", manager: "Manager", senior: "Senior", copywriter: "Copywriter", photographer: "Photographer", reviewer: "Reviewer", planner: "Planner", designer: "Designer", industry: "Industry", research: "Research", launch: "Launch", pulse: "Pulse", review: "Review" };
const label = (b) => BOT_LABEL[b] || "A helper";

const CONTACT = [["phone", "phone number"], ["email", "email address"], ["address", "address"]];
const joinList = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

/**
 * Pure: a snapshot of one project -> candidate nudges (not yet limited).
 * snapshot: { projectId, now, built, picked, published (true | false | null = unknown), businessInfo,
 *             reviews: [{ id, label, score, passed, reasons[] }], logs: [{ bot, result, decision, reason, created_at }] }
 */
function evaluate(s) {
  const out = [];
  const now = s.now || Date.now(), pid = s.projectId || "none";
  const bucket = (days) => Math.floor(now / (days * DAY));

  // PULSE: a step failed in the last day.
  const fails = (s.logs || []).filter((l) => l && l.result === "fail" && now - Date.parse(l.created_at) <= PROBLEM_WINDOW_MS && now - Date.parse(l.created_at) >= -60000);
  if (fails.length) {
    const newest = fails.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    const what = clip(newest.reason || newest.decision || newest.task, 140);
    out.push({
      bot: "pulse", kind: "build-problem", severity: "alert", project: pid,
      text: `${personalities.catchphrase("pulse", "problem")} ${label(newest.bot)} hit a problem while building${what ? ": " + what : ""}.${fails.length > 1 ? ` It happened ${fails.length} times.` : ""} Open the build log to see the steps.`,
      why: `Build log: ${label(newest.bot)} step failed at ${new Date(Date.parse(newest.created_at)).toISOString().slice(0, 16).replace("T", " ")} UTC.`,
      dedupe: `pulse:problem:${pid}:${newest.created_at}`
    });
  }

  // REVIEW: the quality score found something to improve on a design.
  const rv = (s.reviews || []).filter((r) => r && typeof r.score === "number" && (r.passed === false || (r.reasons || []).length));
  if (rv.length) {
    const r = rv.slice().sort((a, b) => a.score - b.score)[0];
    const reason = clip((r.reasons || [])[0], 160);
    out.push({
      bot: "review", kind: "improvement", severity: "note", project: pid,
      text: `${r.passed === false ? personalities.catchphrase("review", "problem") : "I checked it properly."} The ${clip(r.label || "design", 40)} design scored ${r.score}/100${reason ? ": " + reason : ""}. Ask me and I will say what to change first.`,
      why: `Quality score ${r.score}/100 on the ${clip(r.label || "design", 40)} design${reason ? ": " + reason : ""}.`,
      dedupe: `review:${pid}:${clip(r.id || r.label, 30)}:${r.score}`
    });
  }

  // PLANNER: one next step.
  if (s.built && !s.picked) {
    out.push({
      bot: "planner", kind: "next-step", severity: "note", project: pid,
      text: `${personalities.catchphrase("planner", "done")} Next: pick the design you like best, so I can line up the launch.`,
      why: "Your site has been built, but no design has been picked yet.",
      dedupe: `planner:pick:${pid}:${bucket(3)}`
    });
  } else if (s.built && s.picked && s.published === true) {
    out.push({
      bot: "planner", kind: "next-step", severity: "note", project: pid,
      text: `${personalities.catchphrase("planner", "done")} Your site is live. Next: share the link with three customers this week, then check the enquiries that come in.`,
      why: "Your site is published.",
      dedupe: `planner:share:${pid}:${bucket(7)}`
    });
  }

  // LAUNCH: not live yet.
  if (s.built && s.picked && s.published === false) {
    const info = s.businessInfo || {};
    const missing = CONTACT.filter(([k]) => !clip(info[k], 5)).map(([, w]) => w);
    out.push({
      bot: "launch", kind: "pending", severity: "note", project: pid,
      text: missing.length
        ? `${personalities.catchphrase("launch", "alert")} Add your ${joinList(missing)} so visitors can reach you, then we can go live.`
        : `${personalities.catchphrase("launch", "greeting")} Your details are in and the site is not live yet. ${personalities.catchphrase("launch", "done")}`,
      why: missing.length ? `Your business details have no ${joinList(missing)}.` : "The design is picked and the site is not published.",
      dedupe: `launch:pending:${pid}:${bucket(3)}`
    });
  }
  return out;
}

function createEngine({ db, now = () => Date.now() }) {
  const missing = (error) => !!error;

  async function getMode(userId) {
    const { data, error } = await db.from(S).select("mode").eq("user_id", String(userId)).maybeSingle();
    if (error) return "normal";
    return data && MODES[data.mode] !== undefined ? data.mode : "normal";
  }
  async function setMode(userId, mode) {
    if (MODES[mode] === undefined) return { status: 400, body: { error: "Choose normal, quiet or off." } };
    const { error } = await db.from(S).upsert({ user_id: String(userId), mode, updated_at: new Date(now()).toISOString() }, { onConflict: "user_id" });
    if (error) return { status: 503, body: { error: "That setting could not be saved just now." } };
    return { status: 200, body: { mode } };
  }

  /** Runs the rules for one project and stores what passes the limits. Returns how many were added. Never throws. */
  async function scan({ userId, snapshot }) {
    try {
      const mode = await getMode(userId);
      const cap = MODES[mode];
      if (!cap) return { added: 0, mode };
      const since = new Date(now() - DAY).toISOString();
      const recent = await db.from(T).select("bot_id, kind, project_id, status, created_at").eq("user_id", String(userId)).gte("created_at", new Date(now() - DISMISS_QUIET_MS).toISOString());
      if (missing(recent.error)) return { added: 0, mode, notReady: true };
      const rows = recent.data || [];
      const today = rows.filter((r) => r.created_at >= since);
      let room = cap - today.length;
      const botsToday = new Set(today.map((r) => r.bot_id));
      const cands = evaluate({ ...snapshot, now: now() })
        .filter((c) => !rows.some((r) => r.status === "dismissed" && r.bot_id === c.bot && r.kind === c.kind && r.project_id === (snapshot.projectId || null)))
        .sort((a, b) => (a.severity === "alert" ? 0 : 1) - (b.severity === "alert" ? 0 : 1));
      let added = 0;
      const addedRows = [];
      for (const c of cands) {
        if (room <= 0) break;
        if (botsToday.has(c.bot)) continue;
        const ins = await db.from(T).upsert({ user_id: String(userId), project_id: snapshot.projectId || null, bot_id: c.bot, kind: c.kind, text: c.text.slice(0, 500), why: c.why.slice(0, 300), severity: c.severity, dedupe_key: c.dedupe.slice(0, 200), status: "new", expires_at: new Date(now() + EXPIRES_MS).toISOString() }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select("id");
        if (ins.error) return { added, mode, notReady: true };
        if (ins.data && ins.data.length) { added++; room--; botsToday.add(c.bot); addedRows.push({ bot: c.bot, kind: c.kind, text: c.text }); }
      }
      return { added, mode, addedRows };
    } catch (e) { return { added: 0, mode: "normal", notReady: true }; }
  }

  /** Nudges waiting for this person: new, not expired. */
  async function pending(userId) {
    try {
      const { data, error } = await db.from(T).select("id, bot_id, kind, text, why, severity, project_id, created_at").eq("user_id", String(userId)).eq("status", "new").gte("expires_at", new Date(now()).toISOString()).order("created_at", { ascending: false }).limit(5);
      if (error) return [];
      return (data || []).map((r) => ({ id: r.id, bot: r.bot_id, kind: r.kind, text: r.text, why: r.why, severity: r.severity, projectId: r.project_id }));
    } catch (e) { return []; }
  }
  async function mark(userId, id, status) {
    if (status !== "seen" && status !== "dismissed") return { status: 400, body: { error: "Bad request." } };
    const patch = status === "seen" ? { status: "seen", seen_at: new Date(now()).toISOString() } : { status: "dismissed", seen_at: new Date(now()).toISOString() };
    const { error } = await db.from(T).update(patch).eq("id", String(id)).eq("user_id", String(userId));
    return error ? { status: 503, body: { error: "That could not be saved just now." } } : { status: 200, body: { ok: true } };
  }

  /** Admin: the proactive log, newest first, with counts. User ids are shortened by the caller's page. */
  async function adminLog(limit = 100) {
    const { data, error } = await db.from(T).select("id, user_id, project_id, bot_id, kind, text, why, severity, status, created_at").order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 300));
    if (error) throw new Error("The nudges table is not ready.");
    const rows = data || [], by = {}, st = {};
    rows.forEach((r) => { by[r.bot_id] = (by[r.bot_id] || 0) + 1; st[r.status] = (st[r.status] || 0) + 1; });
    return { rows, byBot: by, byStatus: st };
  }

  return { scan, pending, mark, getMode, setMode, adminLog };
}

module.exports = { MODES, DAY, evaluate, createEngine };

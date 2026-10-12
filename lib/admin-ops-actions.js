"use strict";
/**
 * Admin Area Phase 2C: Owner-only ops actions (docs/ADMIN_AREA_SPEC.md section 3, item 12).
 *
 * Every action needs: the admin's PASSWORD again (a stolen token alone cannot do this), a typed reason (5+ characters),
 * a cooldown, and leaves an audit entry. A wrong password is audited and, after 5 in 15 minutes, locks ops for that
 * person for the rest of the window. "Rotate keys" is deliberately not a button: it is a guided checklist (decision 4).
 * Injected: fetch, env, db, verifyPassword(adminId, password) -> bool, busyCount() -> number, clearCaches() -> string[].
 */
const { audit } = require("./admin-team");
const { redact, timed, DEFAULT_RENDER_SERVICE } = require("./admin-ops");

const COOLDOWN_MS = { redeploy: 10 * 60 * 1000, "clear-cache": 60 * 1000 };
const LOCK_AFTER = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const fail = (status, message, extra) => Object.assign(new Error(message), { status }, extra || {});

function createOps({ fetch: f = global.fetch, env = process.env, db, verifyPassword, busyCount = () => 0, clearCaches = () => [], now = () => Date.now() }) {
  const last = new Map(); // action -> time of last run
  const misses = new Map(); // adminId -> [times of wrong passwords]

  const recentMisses = (id) => {
    const list = (misses.get(id) || []).filter((t) => now() - t < LOCK_WINDOW_MS);
    misses.set(id, list);
    return list;
  };

  async function run(actor, action, body = {}) {
    if (!(action in COOLDOWN_MS)) throw fail(404, "Unknown ops action.");
    const reason = String(body.reason || "").trim();
    if (reason.length < 5) throw fail(400, "Type a reason (at least 5 characters).");
    if (recentMisses(actor.adminId).length >= LOCK_AFTER) throw fail(429, "Too many wrong passwords. Ops is locked for 15 minutes.");

    if (!body.password || !(await verifyPassword(actor.adminId, String(body.password)))) {
      misses.get(actor.adminId).push(now());
      await audit(db, actor, "ops.denied", action, reason, { why: "wrong password" });
      throw fail(403, "Wrong password.");
    }
    const wait = (last.get(action) || 0) + COOLDOWN_MS[action] - now();
    if (wait > 0) throw fail(429, `Cooling down: try again in ${Math.ceil(wait / 1000)} seconds.`, { retryInMs: wait });

    let result;
    if (action === "clear-cache") {
      result = { cleared: clearCaches() };
    } else {
      if (!env.RENDER_API_KEY) throw fail(503, "Redeploy needs RENDER_API_KEY on the server.");
      const busy = busyCount();
      if (busy > 0 && body.force !== true) {
        throw fail(409, `${busy} build(s) are running right now and a redeploy would wipe them. Wait, or send force.`, { busy });
      }
      let r;
      try {
        r = await timed(f, `https://api.render.com/v1/services/${env.RENDER_SERVICE_ID || DEFAULT_RENDER_SERVICE}/deploys`, { method: "POST", headers: { Authorization: `Bearer ${env.RENDER_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ clearCache: "do_not_clear" }) }, 10000);
      } catch (err) {
        throw fail(502, `Render did not answer: ${redact(err.message, env)}`);
      }
      if (!r.ok) throw fail(502, `Render refused the redeploy (${r.status}).`);
      let j = {};
      try { j = await r.json(); } catch { /* the deploy was accepted; the id is a courtesy */ }
      result = { started: true, deployId: j.id || null, wipedBuilds: busy };
    }
    last.set(action, now()); // the cooldown starts only after a real run
    await audit(db, actor, `ops.${action}`, null, reason, { ...result, forced: body.force === true });
    return result;
  }

  const state = () => Object.fromEntries(Object.entries(COOLDOWN_MS).map(([a, ms]) => [a, { cooldownMs: ms, readyInMs: Math.max(0, (last.get(a) || 0) + ms - now()) }]));
  return { run, state };
}

/** The guided way to rotate a key (spec decision 4): never one click on a production credential. */
const ROTATION_CHECKLIST = [
  "Create the NEW key in the provider's own dashboard. Keep the old one active for now.",
  "Run Ops > Test connections to learn how the current key behaves (and note the state).",
  "In Render > your service > Environment, set the variable to the NEW key and save. This redeploys the site.",
  "When the deploy is live, run Test connections again: the provider must say ok.",
  "Do one real action that uses it (a build, an image, a voice message).",
  "Only now revoke the OLD key in the provider's dashboard.",
  "If anything fails at step 4 or 5, put the old key back in Render (it is still active) and start again.",
];

module.exports = { createOps, ROTATION_CHECKLIST, COOLDOWN_MS, LOCK_AFTER };

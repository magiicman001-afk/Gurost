/**
 * Supabase client, used for anything that needs to outlive the
 * in-memory PROJECTS map in server.js (user accounts, subscription
 * status, deployed-project records). The orchestrator's live project
 * state (current HTML, build history) stays in memory in this version —
 * wire it to Supabase too before you have concurrent users across more
 * than one server process.
 *
 * LAZY INITIALIZATION, ADDED THIS ROUND, AND WHY: the real bug that
 * broke local startup wasn't really about Supabase — it was that
 * `dotenv` was never loaded anywhere in this codebase (fixed in
 * server.js, see that file), so .env values never reached
 * process.env at all. But there's a second, real design problem this
 * surfaced: the old code called createClient() at MODULE LOAD TIME,
 * which throws synchronously if the URL/key aren't set — meaning one
 * missing env var crashed the entire server before it even started
 * listening, taking down every route including ones that don't touch
 * the database at all (most of the website builder's core flow runs
 * on the in-memory PROJECTS map, not Supabase).
 *
 * This version defers actually creating the client until the first
 * real database call. The server now starts and serves non-DB routes
 * even with Supabase unconfigured; the moment something genuinely
 * needs the database, it gets a clear, specific, actionable error
 * instead of a cryptic startup crash. This is NOT "graceful
 * degradation" in the sense of silently no-op'ing database calls —
 * every real query still requires a real, working Supabase connection
 * to succeed. It only changes WHEN a missing-config error surfaces,
 * not WHETHER one does.
 */

const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env. " +
      "Note: SUPABASE_SERVICE_KEY is the service role key (Settings > API > service_role in your Supabase dashboard), " +
      "not the anon/public key — a different, more privileged credential this backend needs to bypass row-level security."
    );
  }
  _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _client;
}

// A real Proxy, not a mock — every property access (supabase.from(...),
// supabase.auth, etc.) transparently reaches the real client once
// configured. Existing code across this codebase that does
// `const { supabase } = require("./lib/db")` then `supabase.from(...)`
// keeps working completely unchanged; only the timing of
// initialization changed, not the interface.
const supabase = new Proxy(
  {},
  {
    get(target, prop) {
      return getClient()[prop];
    }
  }
);

module.exports = { supabase };

/**
 * Developer onboarding — real, but deliberately narrow. Named
 * developer-onboarding.js, not onboarding.js: industry-onboarding.js
 * already exists (customer industry selection, a completely different
 * concern) — two files both called some variant of "onboarding" is the
 * same confusion risk already avoided with usage-billing.js vs
 * lib/billing.js.
 *
 * WHY THIS IS NARROWER THAN THE SPEC, stated plainly rather than
 * silently trimmed:
 *
 *  - "They get access to the codebase" — that's a GitHub repository
 *    permission, not a Gurost product concern. Building a fake
 *    "codebase access" system inside Gurost's own database, separate
 *    from real GitHub collaborator permissions, would create a shadow
 *    system that can drift out of sync with who ACTUALLY has repo
 *    access. Use GitHub's own "invite collaborator" flow (or the
 *    GitHub API, if you want it triggered from this admin panel later
 *    — that's a real, scoped addition on top of THIS file, using a
 *    GitHub token with access to your own internal engineering repo,
 *    which is a different token/scope than GITHUB_TOKEN elsewhere in
 *    this codebase, that one is for pushing GENERATED USER APPS'
 *    repos, not Gurost's own source).
 *
 *  - "They get a guide on how the system works" — that's
 *    README.md / GUROST_COMPLETE_GUIDE.md, which already exist. Not a
 *    new API route; there's nothing to build here beyond pointing a
 *    new hire at files that are already real.
 *
 *  - "They can fix bugs and submit fixes, all changes are logged" —
 *    that's a git commit / pull request, and GitHub already logs every
 *    one of those with full authorship, diffs, and history, better
 *    than a parallel "fix submission" table in this database ever
 *    could. Building a duplicate bug-fix-tracking system here would
 *    mean two sources of truth for the same fact (did this bug get
 *    fixed, and by whom) — a real, avoidable source of drift. Real,
 *    fixable bugs belong in GitHub Issues linked to the PR that closes
 *    them; that's what GitHub Issues is for, not something to rebuild
 *    inside this product.
 *
 * What's actually real and specific to Gurost's own backend, and
 * what's built below: WHO currently has developer-level read access to
 * this system's error/audit log, and a role check other admin routes
 * can reuse — reusing the EXISTING error/audit infrastructure
 * (admin-dashboard.js's getRecentErrors, security.js's auditLog), not
 * duplicating it.
 *
 * SQL (run once):
 *   CREATE TABLE developers (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name text NOT NULL,
 *     email text NOT NULL UNIQUE,
 *     user_id text,               -- set once they've signed up/logged in, links to api_keys.user_id
 *     active boolean NOT NULL DEFAULT true,
 *     added_by text,
 *     added_at timestamptz DEFAULT now()
 *   );
 */

const { supabase } = require("./lib/db");

async function addDeveloper(name, email, addedBy) {
  const { data, error } = await supabase.from("developers").insert({ name, email, added_by: addedBy }).select("id").single();
  if (error) throw new Error(`Failed to add developer: ${error.message}`);
  return { id: data.id, name, email };
}

async function listDevelopers() {
  const { data, error } = await supabase.from("developers").select("*").order("added_at", { ascending: false });
  if (error) return [];
  return data;
}

async function updateDeveloperAccess(developerId, { active, name }) {
  const updates = {};
  if (active !== undefined) updates.active = active;
  if (name !== undefined) updates.name = name;
  const { error } = await supabase.from("developers").update(updates).eq("id", developerId);
  if (error) throw new Error(`Failed to update developer: ${error.message}`);
  return { id: developerId, ...updates };
}

/**
 * Real check other routes can use to grant read-only error-log access
 * to an active developer without making them a full admin (admin also
 * grants deactivate/reactivate power over customer accounts, billing
 * visibility, etc. — a developer debugging an error doesn't need that
 * and arguably shouldn't default to having it).
 */
async function isActiveDeveloper(userId) {
  if (!userId) return false;
  const { data } = await supabase.from("developers").select("active").eq("user_id", userId).maybeSingle();
  return data?.active === true;
}

async function requireDeveloperOrAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes((req.user?.email || "").toLowerCase())) return next();
  if (await isActiveDeveloper(req.user?.id)) return next();
  return res.status(403).json({ error: "Developer or admin access required." });
}

module.exports = { addDeveloper, listDevelopers, updateDeveloperAccess, isActiveDeveloper, requireDeveloperOrAdmin };

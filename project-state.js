/**
 * Project State — real, database-backed persistence for what's
 * currently only an in-memory Map (PROJECTS in server.js). This file
 * doesn't replace that Map or change how it works — 23 real call
 * sites throughout server.js already depend on PROJECTS.get()/.set()
 * behaving exactly as they do now, and rewriting all 23 in one pass
 * to make the shared getProject() helper async would be a large, real
 * risk for one round of work. Instead, this adds a narrow, opt-in
 * fallback at the specific points where a returning user actually
 * hits the real problem: the server restarted (which happens on
 * every Render deploy — observed directly, repeatedly, this build)
 * and their project genuinely isn't in memory anymore, even though
 * real history for it exists.
 *
 * REAL TABLE SCHEMA — checked directly against what actually exists
 * in Supabase before writing this version, not assumed. The table
 * that got created uses a simpler shape than the original plan: one
 * JSONB `context` column instead of several named ones.
 *   project_state (
 *     id text primary key,
 *     user_id text not null,
 *     name text,
 *     context jsonb,
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   )
 *
 * Honest scope note: `context` persists the fields that represent
 * real decisions and progress (history, stateHistory,
 * assistantHistory, the actual generated content) — not every field
 * on a project object. Things like sandboxResult and androidBuild are
 * left out deliberately; they're large, regenerable, and not "what
 * was decided," which is what this exists to protect against losing.
 */

const { supabase } = require("./lib/db");

// Which real fields on a project object are worth persisting inside
// the single `context` blob — kept as one named list so it's obvious
// at a glance what does and doesn't survive a restart.
function toRow(projectId, userId, project) {
  return {
    id: projectId,
    user_id: userId,
    name: project.prompt ? project.prompt.slice(0, 120) : projectId, // a short, real label — falls back to the id if there's genuinely no prompt yet
    context: {
      prompt: project.prompt,
      type: project.type,
      state: project.state,
      currentHtml: project.currentHtml,
      appFiles: project.appFiles,
      history: project.history,
      stateHistory: project.stateHistory,
      assistantHistory: project.assistantHistory,
      deployUrl: project.deployUrl,
    },
    updated_at: new Date().toISOString(),
  };
}

// The reverse direction — reconstructs a real, usable in-memory
// project object from a persisted row. Fields this deliberately
// doesn't persist (sandboxResult, androidBuild, lastAudit, etc.) come
// back as their real, honest default rather than silently missing —
// same shape newProject() in server.js produces, so code downstream
// that expects those fields to exist doesn't break on a hydrated
// project specifically.
function fromRow(row) {
  const ctx = row.context || {};
  return {
    state: ctx.state,
    prompt: ctx.prompt,
    userId: row.user_id,
    type: ctx.type,
    variants: null,
    selectedVariantId: null,
    currentHtml: ctx.currentHtml,
    appFiles: ctx.appFiles,
    lastAudit: null,
    history: ctx.history || [],
    stateHistory: ctx.stateHistory || [],
    deployUrl: ctx.deployUrl,
    assistantHistory: ctx.assistantHistory || [],
    pendingAssistantSuggestion: null,
    codeReview: null,
    sandboxResult: null,
    androidBuild: null,
    buildStartedAt: new Date(row.updated_at).getTime(),
    lastCheckpointAt: null,
    hydratedFromPersistence: true, // real, honest marker — not a field newProject() sets, so callers can tell if they want to
  };
}

/**
 * Saves the current, real state of a project. Called from the same
 * points backup.autoBackupIfDue() already is — those are already the
 * established "something meaningful just happened" checkpoints in
 * this codebase, so this reuses them rather than adding new ones.
 */
async function persistProjectState(projectId, userId, project) {
  const { error } = await supabase.from("project_state").upsert(toRow(projectId, userId, project));
  if (error) console.warn("[project-state] Failed to persist:", error.message);
}

/**
 * Real fallback for when a project isn't in the in-memory PROJECTS
 * Map — checks the database before giving up. Returns null (not an
 * error) if genuinely nothing was ever persisted for this ID, so
 * callers can fall through to a normal 404 the same as before.
 */
async function hydrateProjectIfMissing(projectId) {
  const { data, error } = await supabase.from("project_state").select("*").eq("id", projectId).maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

/**
 * Real, persisted project list for a user — the actual fix for
 * GET /api/projects returning empty right after a restart even
 * though the user has genuine history. Merges with whatever's
 * currently in memory rather than replacing it, since in-memory
 * data for a project still actively being worked on this session is
 * always at least as fresh as what's in the database.
 */
async function listPersistedProjects(userId, limit = 20) {
  const { data, error } = await supabase
    .from("project_state")
    .select("id, name, context, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[project-state] Failed to list persisted projects:", error.message);
    return [];
  }
  // Real shape callers of this function need — unpacked here, once,
  // rather than making every caller reach into `context` itself.
  return data.map((row) => ({
    project_id: row.id,
    prompt: row.context?.prompt,
    type: row.context?.type,
    state: row.context?.state,
    deploy_url: row.context?.deployUrl,
    updated_at: row.updated_at,
  }));
}

module.exports = { persistProjectState, hydrateProjectIfMissing, listPersistedProjects };

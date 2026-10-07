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
const { markInterrupted } = require("./lib/app-build-state");

// A project counts towards the plan's project limit once something has
// been built: a site, the designs to pick from, or an app's files. A build
// that failed or never started is an empty shell - it doesn't use up the
// user's allowance (they can delete it from the dashboard).
function isBuilt(project) {
  const files = project?.appFiles;
  const hasFiles = Array.isArray(files) ? files.length > 0 : !!files && Object.keys(files).length > 0;
  return Boolean(project?.currentHtml) || (Array.isArray(project?.variants) && project.variants.length > 0) || hasFiles;
}

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
      // Website Builder design choices - without these a restart between
      // "designs ready" and "pick one" loses the options.
      variants: project.variants,
      selectedVariantId: project.selectedVariantId,
      appFiles: project.appFiles,
      history: project.history,
      stateHistory: project.stateHistory,
      assistantHistory: project.assistantHistory,
      deployUrl: project.deployUrl,
      // The user's company details - Pulse and later edits rely on them.
      businessInfo: project.businessInfo || null,
      premiumImageCost: project.premiumImageCost || 0, // FLUX Pro/Dev spend on the picked design (USD)
      buildError: project.buildError || null, // App Builder: why a build stopped ({ error, at })
      suggestionLog: project.suggestionLog || null, // Website Builder suggestion box: what was accepted or put off, and when
      githubSave: project.githubSave || null, // its private GitHub repo, last save, and the auto-save choice
      built: isBuilt(project), // counts towards the project limit (see isBuilt)
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
  return markInterrupted({
    state: ctx.state,
    prompt: ctx.prompt,
    userId: row.user_id,
    type: ctx.type,
    variants: ctx.variants || null,
    selectedVariantId: ctx.selectedVariantId || null,
    currentHtml: ctx.currentHtml,
    appFiles: ctx.appFiles,
    lastAudit: null,
    history: ctx.history || [],
    stateHistory: ctx.stateHistory || [],
    deployUrl: ctx.deployUrl,
    businessInfo: ctx.businessInfo || null,
    premiumImageCost: ctx.premiumImageCost || 0,
    buildError: ctx.buildError || null,
    suggestionLog: ctx.suggestionLog || null,
    githubSave: ctx.githubSave || null,
    assistantHistory: ctx.assistantHistory || [],
    pendingAssistantSuggestion: null,
    codeReview: null,
    sandboxResult: null,
    androidBuild: null,
    buildStartedAt: new Date(row.updated_at).getTime(),
    lastCheckpointAt: null,
    hydratedFromPersistence: true, // real, honest marker — not a field newProject() sets, so callers can tell if they want to
  });
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
    .select("id, name, context->prompt, context->type, context->state, context->deployUrl, context->built, updated_at")
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
    prompt: row.prompt,
    type: row.type,
    state: row.state,
    deploy_url: row.deployUrl,
    built: row.built === true,
    updated_at: row.updated_at,
  }));
}

/**
 * Ids of a user's saved projects that count towards the limit. The saved
 * rows, not server memory: memory is emptied by every deploy, so counting
 * it let a Free user start another project after each restart.
 */
async function builtProjectIds(userId) {
  const { data, error } = await supabase.from("project_state").select("id").eq("user_id", userId).eq("context->>built", "true");
  if (error) throw new Error(`Couldn't count your projects: ${error.message}`);
  return new Set((data || []).map((r) => r.id));
}

// The owner of a saved project, or null if there is no such row.
async function ownerOf(projectId) {
  const { data, error } = await supabase.from("project_state").select("user_id").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? data.user_id : null;
}

// Removes a project's saved state, history and share links. Form
// submissions and GitHub backup repos are kept: they belong to the owner,
// not the build, and deleting them is a separate decision.
async function deleteProjectRows(projectId, userId) {
  const steps = [
    supabase.from("project_state").delete().eq("id", projectId).eq("user_id", userId),
    supabase.from("project_history").delete().eq("id", projectId).eq("user_id", userId),
    supabase.from("project_shares").delete().eq("project_id", projectId)
  ];
  const results = await Promise.all(steps);
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(`Couldn't delete the project: ${failed.error.message}`);
}

module.exports = { toRow, fromRow, persistProjectState, hydrateProjectIfMissing, listPersistedProjects, isBuilt, builtProjectIds, ownerOf, deleteProjectRows };

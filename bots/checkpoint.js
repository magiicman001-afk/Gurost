/**
 * GitHub checkpointing: commits current project files to a dedicated
 * per-project checkpoint repo, so a build can be saved and resumed
 * later. Reuses the low-level functions in lib/github.js directly
 * rather than its pushGeneratedRepo() — that function names repos
 * `gurost-${projectId}`, which is the SAME naming scheme lib/deploy.js
 * uses for the backend deploy repo. Calling it here would collide with
 * (or silently reuse) a project's actual deploy repo. Checkpoint repos
 * use a distinct `gurost-checkpoint-${projectId}` name.
 *
 * SQL (run once):
 *   create table checkpoints (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     project_id text not null,
 *     repo_owner text not null,
 *     repo_name text not null,
 *     commit_sha text not null,
 *     build_minutes numeric,
 *     created_at timestamptz default now()
 *   );
 *   create index on checkpoints (project_id, created_at desc);
 */

const { getAuthenticatedUser, createRepo, commitFiles } = require("../lib/github");
const { supabase } = require("../lib/db");

const AUTO_CHECKPOINT_MINUTES = Number(process.env.CHECKPOINT_INTERVAL_MINUTES) || 45; // mid-point of the requested 30-60 min range

async function getExistingCheckpointRepo(projectId) {
  const { data } = await supabase
    .from("checkpoints")
    .select("repo_owner, repo_name")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function saveCheckpoint(userId, projectId, files, buildMinutes) {
  let repoOwner, repoName;
  const existing = await getExistingCheckpointRepo(projectId);

  if (existing) {
    repoOwner = existing.repo_owner;
    repoName = existing.repo_name;
  } else {
    repoOwner = await getAuthenticatedUser();
    repoName = `gurost-checkpoint-${projectId.slice(0, 8)}`;
    await createRepo(repoName);
  }

  const commitSha = await commitFiles(repoOwner, repoName, files);

  const { data, error } = await supabase
    .from("checkpoints")
    .insert({
      user_id: userId,
      project_id: projectId,
      repo_owner: repoOwner,
      repo_name: repoName,
      commit_sha: commitSha,
      build_minutes: buildMinutes || null
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to record checkpoint: ${error.message}`);

  return { checkpointId: data.id, repoUrl: `https://github.com/${repoOwner}/${repoName}`, commitSha };
}

async function listCheckpoints(projectId) {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("id, commit_sha, build_minutes, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list checkpoints: ${error.message}`);
  return data;
}

async function getCheckpoint(checkpointId) {
  const { data, error } = await supabase.from("checkpoints").select("*").eq("id", checkpointId).single();
  if (error) throw new Error(`Checkpoint not found: ${error.message}`);
  return data;
}

// Called opportunistically after mutating build actions (not a real
// per-project background timer — this codebase's projects live in an
// in-memory Map, running setInterval per project would leak on restart/
// cleanup). project.lastCheckpointAt / project.buildStartedAt are plain
// fields the caller (server.js) is responsible for setting.
function shouldAutoCheckpoint(project) {
  const since = project.lastCheckpointAt || project.buildStartedAt;
  if (!since) return false;
  const minutesElapsed = (Date.now() - since) / 60000;
  return minutesElapsed >= AUTO_CHECKPOINT_MINUTES;
}

module.exports = { saveCheckpoint, listCheckpoints, getCheckpoint, shouldAutoCheckpoint, AUTO_CHECKPOINT_MINUTES };

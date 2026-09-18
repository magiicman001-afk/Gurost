/**
 * "New agent spawn" — honest scope note, read this before wiring it up:
 *
 * The original request framed this as preventing "credit burn from long
 * sessions," modeled on how long agentic coding sessions (e.g. Claude
 * Code) accumulate huge context over many tool calls, making later
 * calls in the same session progressively more expensive. Gurost's
 * bots don't actually have that problem — every bot in this codebase
 * makes stateless, single-shot Claude calls with the current file
 * content, not a growing conversation transcript, and the few places
 * that do pull history (transformer-bot's feedback, the Guide Bot's
 * past decisions) already query with an explicit .limit(15-20), so
 * they don't grow unbounded either. There's no long-session cost
 * problem here to solve.
 *
 * What IS genuinely useful and is what this module actually does:
 * given a checkpoint (see checkpoint.js), reconstruct a fresh in-memory
 * project object from the committed files, ready to keep building on —
 * i.e. real session resume, which is valuable on its own regardless of
 * the credit-burn framing.
 */

const checkpoint = require("./checkpoint");

async function fetchFileFromRepo(owner, repo, path, ref) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }
  });
  if (!response.ok) throw new Error(`Failed to fetch ${path} from checkpoint: ${response.status}`);
  const data = await response.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function fetchAllFiles(owner, repo, ref) {
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }
  });
  if (!treeResponse.ok) throw new Error(`Failed to fetch checkpoint tree: ${treeResponse.status}`);
  const tree = await treeResponse.json();
  const filePaths = tree.tree.filter((t) => t.type === "blob").map((t) => t.path);

  const files = await Promise.all(
    filePaths.map(async (path) => ({ path, content: await fetchFileFromRepo(owner, repo, path, ref) }))
  );
  return files;
}

/**
 * Rebuilds a project's files from the most recent (or a specific)
 * checkpoint. Returns plain data — server.js is responsible for putting
 * this into its in-memory PROJECTS map under a (possibly new) projectId.
 */
async function spawnFromCheckpoint(checkpointId) {
  const cp = await checkpoint.getCheckpoint(checkpointId);
  const files = await fetchAllFiles(cp.repo_owner, cp.repo_name, cp.commit_sha);
  return {
    sourceProjectId: cp.project_id,
    sourceCheckpointId: checkpointId,
    files,
    resumedAt: Date.now()
  };
}

module.exports = { spawnFromCheckpoint };

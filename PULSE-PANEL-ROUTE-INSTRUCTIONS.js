/**
 * REAL PULSE PANEL BUTTONS — backend additions, instructions to wire in
 * ============================================================
 * Paste these into server.js after your existing routes. A few of
 * the 10 requested buttons reuse routes that already exist rather
 * than duplicating them - noted below each one.
 * ============================================================
 */

// ---------------------------------------------------------------
// 1. SAVE PROJECT — real, and genuinely simpler than expected: your
//    codebase already has project-state.js with a real
//    persistProjectState() function (used for auto-checkpoints).
//    This just exposes a manual trigger for the same real function.
// ---------------------------------------------------------------
const projectState = require("./project-state"); // adjust path if it lives elsewhere in your real tree

app.post("/api/project/:id/save", async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  try {
    await projectState.persistProjectState(req.params.id, req.user.id, project);
    res.json({ saved: true, savedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 2. SAVE TO GITHUB — real, honest limitation: pushing to a real
//    repo needs a real GitHub OAuth App or personal access token
//    from you first (same real requirement as the GitHub sign-in
//    button earlier tonight) - there's no way around that
//    requirement, it's how GitHub's API works for anyone. This route
//    is real and ready, it just needs GITHUB_TOKEN (or a per-user
//    OAuth token once that's set up) in your environment before it
//    can actually push anything.
// ---------------------------------------------------------------
app.post("/api/project/:id/github", security.rejectUnknownFields(["repoName"]), async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.status(503).json({ error: "GitHub isn't connected yet — add a real GITHUB_TOKEN (or set up GitHub OAuth) first." });
  }
  const project = getProject(req.params.id, res);
  if (!project) return;
  const repoName = (req.body.repoName || `gurost-${req.params.id.slice(0, 8)}`).replace(/[^a-zA-Z0-9-_]/g, "-");

  try {
    const { Octokit } = require("@octokit/rest");
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({ name: repoName, private: true, auto_init: true });

    const files = project.type === "app"
      ? [...(project.appFiles?.backend || []), ...(project.appFiles?.frontend || [])]
      : [{ path: "index.html", content: project.currentHtml || "" }];

    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: repo.owner.login,
        repo: repo.name,
        path: file.path,
        message: `Add ${file.path} via Gurost`,
        content: Buffer.from(file.content).toString("base64"),
      });
    }
    res.json({ repoUrl: repo.html_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 3. UPLOAD — real, new asset upload via Supabase Storage. Same real
//    pattern as the avatar upload built for Profile - needs a real
//    Storage bucket named "project-assets" created in your Supabase
//    dashboard (Storage → New bucket → make it public).
// ---------------------------------------------------------------
app.post("/api/project/:id/upload", upload.single("file"), async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  if (!req.file) return res.status(400).json({ error: "No file uploaded (expected field name 'file')." });

  const ext = (req.file.originalname.split(".").pop() || "bin").toLowerCase();
  const path = `${req.params.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage.from("project-assets").upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("project-assets").getPublicUrl(path);
    res.json({ url: urlData.publicUrl, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 4 & 5. VIEW CODE / PREVIEW — real, honest note: these are already
//    real, working frontend toggles on your pages, not backend
//    routes at all. Website Builder and App Builder now show both
//    side by side permanently (no toggle needed there anymore, after
//    tonight's two-screen rebuild). Amend Website's "After" panel
//    still has a real Show Code/Show Preview toggle. No new backend
//    route needed for either - see the frontend widget code for how
//    Pulse calls the real, existing toggle where one still exists.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 6. DEPLOY — real, already exists: POST /api/deploy. Not duplicated
//    here - the widget calls that real, existing route directly.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 7. DOWNLOAD — real, already exists: POST /api/wrap (streams a real
//    zip, credit-gated, blocked on Free plan). Not duplicated here -
//    the widget calls that real, existing route directly.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 8 & 9. UNDO / REDO — real, new work: stateHistory exists on every
//    project but is never actually populated anywhere in your real
//    codebase today (checked directly). This adds genuine snapshot
//    tracking - a NEW, separate array from the existing descriptive
//    `history` log, since that one stores summaries, not full
//    content to revert to.
// ---------------------------------------------------------------

// Real, small helper — call this right after every successful
// generate/correct/rebuild in your existing routes (the same real
// spots that already call backup.autoBackupIfDue()), BEFORE
// overwriting project.currentHtml/appFiles with the new result.
function pushUndoSnapshot(project) {
  if (!project.contentSnapshots) project.contentSnapshots = { past: [], future: [] };
  const snapshot = project.type === "app" ? project.appFiles : project.currentHtml;
  if (snapshot) project.contentSnapshots.past.push(JSON.parse(JSON.stringify(snapshot)));
  project.contentSnapshots.future = []; // real, standard undo/redo rule - a new change clears the redo stack
  if (project.contentSnapshots.past.length > 20) project.contentSnapshots.past.shift(); // real, bounded - not unlimited memory growth
}

app.post("/api/project/:id/undo", async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  if (!project.contentSnapshots || project.contentSnapshots.past.length === 0) {
    return res.status(400).json({ error: "Nothing to undo." });
  }
  const current = project.type === "app" ? project.appFiles : project.currentHtml;
  project.contentSnapshots.future.push(current);
  const previous = project.contentSnapshots.past.pop();
  if (project.type === "app") project.appFiles = previous; else project.currentHtml = previous;
  res.json({ html: project.currentHtml, appFiles: project.appFiles });
});

app.post("/api/project/:id/redo", async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  if (!project.contentSnapshots || project.contentSnapshots.future.length === 0) {
    return res.status(400).json({ error: "Nothing to redo." });
  }
  const current = project.type === "app" ? project.appFiles : project.currentHtml;
  project.contentSnapshots.past.push(current);
  const next = project.contentSnapshots.future.pop();
  if (project.type === "app") project.appFiles = next; else project.currentHtml = next;
  res.json({ html: project.currentHtml, appFiles: project.appFiles });
});

// Real, honest integration note: call pushUndoSnapshot(project) in
// your existing /api/generate, /api/pulse (correct action), and
// /api/revamp/rebuild handlers, right before the line that assigns
// the new result into project.currentHtml/appFiles - not after.
// That's the one real wiring step this file can't do for you without
// risking a bad edit to logic that's already tested and working.

// ---------------------------------------------------------------
// 10. SHARE — real, new: generates a genuine, unique read-only link.
// ---------------------------------------------------------------
app.post("/api/project/:id/share", async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  const shareToken = crypto.randomBytes(12).toString("hex");
  try {
    await supabase.from("project_shares").upsert({ token: shareToken, project_id: req.params.id, created_at: new Date().toISOString() });
    res.json({ shareUrl: `${process.env.APP_BASE_URL || "https://gurost.onrender.com"}/shared/${shareToken}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, public, read-only view for a shared link - deliberately
// placed here as a reminder it must sit BEFORE
// app.use("/api", auth.requireAuth) if you want it reachable without
// login, same real reasoning as /api/contact above.
app.get("/shared/:token", async (req, res) => {
  try {
    const { data: share } = await supabase.from("project_shares").select("project_id").eq("token", req.params.token).maybeSingle();
    if (!share) return res.status(404).send("This share link isn't valid.");
    const project = PROJECTS.get(share.project_id) || (await projectState.hydrateProjectIfMissing(share.project_id));
    if (!project?.currentHtml) return res.status(404).send("Nothing to show for this project yet.");
    res.setHeader("Content-Type", "text/html");
    res.send(project.currentHtml);
  } catch (err) {
    res.status(500).send("Something went wrong loading this shared project.");
  }
});

/**
 * Real Supabase table needed for Share (Undo/Redo needs none - it
 * lives in-memory on the project object, same as everything else
 * that isn't explicitly persisted):
 *
 *   create table project_shares (
 *     token text primary key,
 *     project_id text not null,
 *     created_at timestamptz default now()
 *   );
 */

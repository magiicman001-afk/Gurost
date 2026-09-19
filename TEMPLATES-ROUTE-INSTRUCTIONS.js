/**
 * REAL TEMPLATES ROUTE — instructions to wire this in
 * ============================================================
 * 1. Copy templates-data.js into your bots/ (or lib/) folder.
 * 2. Add this line near your other require()s in server.js:
 *      const { REAL_TEMPLATES } = require("./templates-data");
 *    (adjust the path to wherever you put templates-data.js)
 * 3. Paste the two routes below into server.js, anywhere after
 *    `newProject` is defined and PROJECTS is declared.
 * ============================================================
 */

// GET /api/templates - real, honest list for the frontend to render,
// no HTML included (keeps the payload small - the full page only
// gets fetched when someone actually uses one).
app.get("/api/templates", (req, res) => {
  const list = Object.entries(REAL_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
  res.json({ templates: list });
});

// POST /api/templates/:id/use - the real, instant path. Clones the
// real, pre-built HTML into a genuine new project for the logged-in
// user. No AI call, no credit charged, no wait - same real project
// shape newProject() already produces everywhere else, so builder.html
// needs zero changes: it already knows how to load a project that has
// currentHtml set. Real auth already applies automatically here - this
// route sits under /api, which the global app.use("/api", auth.requireAuth)
// already covers, same as every other real route in this file.
app.post("/api/templates/:id/use", (req, res) => {
  const template = REAL_TEMPLATES[req.params.id];
  if (!template) {
    return res.status(404).json({ error: `No template found with id '${req.params.id}'.` });
  }

  const projectId = crypto.randomUUID();
  const project = newProject(template.description, req.user.id);
  project.type = "website";
  project.currentHtml = template.html;
  project.state = "READY";
  PROJECTS.set(projectId, project);

  res.json({ projectId });
});

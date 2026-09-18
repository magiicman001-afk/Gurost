/**
 * Every bot returns its own shape. The integrator's job is the one
 * place that knows how each shape lands in the shared project object,
 * so routes in server.js don't each reimplement it.
 */

function integrateWebsite(project, result) {
  project.type = "website";
  project.currentHtml = result.html;
  project.history.push({ type: "generate", summary: result.summary, ts: Date.now() });
  return project;
}

function integrateVariants(project, variants) {
  project.type = "website";
  project.variants = variants;
  project.history.push({ type: "variants", summary: `${variants.length} design directions generated`, ts: Date.now() });
  return project;
}

function integrateSelection(project, variantId) {
  const variant = project.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Variant not found on this project.");
  project.currentHtml = variant.html;
  project.selectedVariantId = variantId;
  project.history.push({ type: "select", summary: `Selected "${variant.label}"`, ts: Date.now() });
  return project;
}

function integrateApp(project, result) {
  project.type = "app";
  project.appFiles = { frontend: result.frontend.files, backend: result.backend.files, database: result.database };
  project.history.push({
    type: "generate-app",
    summary: `${result.backend.summary} — ${result.frontend.summary}`,
    ts: Date.now()
  });
  return project;
}

function integrateCorrection(project, result) {
  project.currentHtml = result.html;
  project.history.push({
    type: "correction",
    summary: result.summary,
    method: result.method,
    ts: Date.now()
  });
  return project;
}

function integrateRevampAudit(project, result) {
  project.lastAudit = { issues: result.issues, lighthouse: result.lighthouse, ts: Date.now() };
  project.history.push({ type: "audit", summary: `${result.issues.length} issues found`, ts: Date.now() });
  return project;
}

function integrateRevampRebuild(project, result) {
  project.type = "website";
  project.currentHtml = result.html;
  project.history.push({ type: "revamp", summary: result.summary, ts: Date.now() });
  return project;
}

function integrateAssistantTask(project, result, task) {
  project.assistantHistory = project.assistantHistory || [];
  project.assistantHistory.push({ task, type: result.output.type, ts: Date.now() });
  // Keep this bounded — it's session context for the suggestion prompt,
  // not a durable record.
  if (project.assistantHistory.length > 20) project.assistantHistory.shift();
  return project;
}

module.exports = {
  integrateWebsite,
  integrateVariants,
  integrateSelection,
  integrateApp,
  integrateCorrection,
  integrateRevampAudit,
  integrateRevampRebuild,
  integrateAssistantTask
};

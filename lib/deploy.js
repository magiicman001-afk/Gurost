/**
 * Two deploy targets:
 *  - deployToVercel: single static HTML file (website-mode projects).
 *    Unchanged from before, verify payload against https://vercel.com/docs/rest-api.
 *  - deployProjectToVercel: multi-file project deploy (app-mode frontend).
 *    Same endpoint, but ships the whole file set (including package.json)
 *    and lets Vercel's build system detect the framework and build it —
 *    this only works if app-bot's frontend output is a real buildable
 *    project (package.json + entry point), not a single HTML file.
 *  - deployApp: orchestrates the full app-mode deploy — frontend to
 *    Vercel, backend pushed to a fresh GitHub repo and deployed on
 *    Render, schema applied to Postgres. Three independent operations;
 *    partial success is possible and reported per-component rather than
 *    all-or-nothing, since e.g. a failed backend deploy shouldn't hide
 *    that the frontend deploy succeeded.
 */

const { pushGeneratedRepo } = require("./github");
const { deployBackend } = require("./render");
const { deploySchema } = require("./database");

function vercelHeaders() {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN not configured on server.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${VERCEL_TOKEN}` };
}

function vercelUrl() {
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || null;
  return VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`
    : "https://api.vercel.com/v13/deployments";
}

async function deployToVercel(html, projectId) {
  const response = await fetch(vercelUrl(), {
    method: "POST",
    headers: vercelHeaders(),
    body: JSON.stringify({
      name: `gurost-${projectId.slice(0, 8)}`,
      target: "production",
      files: [{ file: "index.html", data: Buffer.from(html, "utf-8").toString("base64"), encoding: "base64" }],
      projectSettings: { framework: null }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Vercel deployment failed: ${JSON.stringify(data).slice(0, 300)}`);
  return `https://${data.url}`;
}

async function deployProjectToVercel(files, projectId) {
  const response = await fetch(vercelUrl(), {
    method: "POST",
    headers: vercelHeaders(),
    body: JSON.stringify({
      name: `gurost-${projectId.slice(0, 8)}-frontend`,
      target: "production",
      files: files.map((f) => ({
        file: f.path,
        data: Buffer.from(f.content, "utf-8").toString("base64"),
        encoding: "base64"
      }))
      // No projectSettings.framework override here — letting Vercel
      // auto-detect from package.json is the point of this function.
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Vercel project deployment failed: ${JSON.stringify(data).slice(0, 300)}`);
  return `https://${data.url}`;
}

/**
 * Full app-mode deploy. Returns per-component results rather than
 * throwing on the first failure, so e.g. a working frontend deploy isn't
 * hidden behind a Render timeout.
 *
 * Order matters here in a way it didn't before: database provisioning
 * now runs BEFORE the backend deploy, because the backend needs the
 * real connection string as an env var to actually reach its database
 * once live — provisioning a database nobody can connect to would be a
 * real, silent gap, not a cosmetic ordering choice. Frontend deploy is
 * independent of both and still runs in parallel with database
 * provisioning. If database provisioning fails, the backend still
 * deploys (without a working DATABASE_URL) rather than blocking on it —
 * a live backend that can't reach its DB is still more useful to debug
 * than no backend at all.
 */
async function deployApp(project, projectId) {
  const results = { frontend: null, backend: null, database: null };

  const [frontendOutcome, databaseOutcome] = await Promise.allSettled([
    deployProjectToVercel(project.appFiles.frontend, projectId),
    deploySchema(project.appFiles.database.schema, project.appFiles.database.engine, projectId)
  ]);

  results.frontend =
    frontendOutcome.status === "fulfilled"
      ? { url: frontendOutcome.value, status: "deployed" }
      : { status: "failed", error: frontendOutcome.reason.message };

  let dbResult = null;
  if (databaseOutcome.status === "fulfilled") {
    dbResult = databaseOutcome.value;
    results.database = dbResult.deployed
      ? {
          status: "deployed",
          provider: dbResult.provider,
          schemaName: dbResult.schemaName,       // present for the shared-schema path
          neonProjectId: dbResult.neonProjectId,  // present for the Neon path
          consoleUrl: dbResult.consoleUrl         // present for the Neon path
        }
      : { status: "skipped", reason: dbResult.reason };
  } else {
    results.database = { status: "failed", error: databaseOutcome.reason.message };
  }

  try {
    const { repoUrl } = await pushGeneratedRepo(project.appFiles.backend, projectId);
    const envVars = dbResult?.connectionString
      ? [{ key: "DATABASE_URL", value: dbResult.connectionString }]
      : [];
    const backendDeploy = await deployBackend(repoUrl, projectId, { envVars });
    results.backend = { url: backendDeploy.url, repoUrl, status: "deployed", databaseConnected: envVars.length > 0 };
  } catch (err) {
    results.backend = { status: "failed", error: err.message };
  }

  return results;
}

module.exports = { deployToVercel, deployProjectToVercel, deployApp };

/**
 * Render deployment for the App Builder's backend.
 *
 * Chosen over Railway for this implementation: Render has a stable,
 * documented REST API (api-docs.render.com). Railway's public API is
 * GraphQL, and its exact mutation/field names weren't something I could
 * verify against current docs with confidence — rather than guess at a
 * GraphQL schema and risk shipping calls that silently don't match,
 * Railway support is left as a documented gap (see README) instead of
 * unverified code. Render's REST shape below is my best-confidence read
 * of their current docs, not something run against a live account —
 * verify field names against https://api-docs.render.com/reference/create-service
 * before trusting this in production, same caveat as the Vercel payload
 * elsewhere in this repo. The envVars field (added for automatic
 * database provisioning, see deployApp() in lib/deploy.js) carries the
 * same caveat — verify its exact shape against current docs too.
 */

const RENDER_API = "https://api.render.com/v1";

function headers() {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY not configured on server.");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function renderFetch(path, options = {}) {
  const response = await fetch(`${RENDER_API}${path}`, { ...options, headers: headers() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Render API error (${response.status}) on ${path}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function getOwnerId() {
  const owners = await renderFetch("/owners");
  if (!owners.length) throw new Error("No Render workspace found for this API key.");
  return owners[0].owner.id;
}

async function createWebService(repoUrl, { name, startCommand = "node index.js", envVars = [] }) {
  const ownerId = await getOwnerId();
  return renderFetch("/services", {
    method: "POST",
    body: JSON.stringify({
      type: "web_service",
      name,
      ownerId,
      repo: repoUrl,
      branch: "main",
      autoDeploy: "yes",
      serviceDetails: {
        runtime: "node",
        envSpecificDetails: {
          buildCommand: "npm install",
          startCommand
        },
        plan: "starter",
        region: "oregon"
      },
      envVars // [{ key, value }, ...] — e.g. DATABASE_URL for a provisioned Neon database
    })
  });
}

async function getLatestDeployStatus(serviceId) {
  const deploys = await renderFetch(`/services/${serviceId}/deploys?limit=1`);
  return deploys[0]?.deploy?.status || deploys[0]?.status || "unknown";
}

async function getServiceUrl(serviceId) {
  const service = await renderFetch(`/services/${serviceId}`);
  return service.serviceDetails?.url || `https://${service.slug}.onrender.com`;
}

/**
 * Creates the service and polls until it's live or the timeout elapses.
 * Render builds take a couple of minutes — this is a real wait, not
 * instant like the Vercel static deploy.
 */
async function deployBackend(repoUrl, projectId, { timeoutMs = 6 * 60 * 1000, pollIntervalMs = 10000, envVars = [] } = {}) {
  const name = `gurost-${projectId.slice(0, 8)}`;
  const service = await createWebService(repoUrl, { name, envVars });
  const serviceId = service.id || service.service?.id;
  if (!serviceId) throw new Error("Render did not return a service id — check the response shape against current docs.");

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getLatestDeployStatus(serviceId);
    if (status === "live") {
      const url = await getServiceUrl(serviceId);
      return { serviceId, url, status };
    }
    if (["build_failed", "update_failed", "canceled", "deactivated"].includes(status)) {
      throw new Error(`Render deploy failed with status: ${status}`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`Render deploy timed out after ${timeoutMs / 1000}s — check the Render dashboard, it may still be building.`);
}

module.exports = { deployBackend, createWebService, getServiceUrl };

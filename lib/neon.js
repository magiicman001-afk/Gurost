/**
 * Neon API — automatic, per-app Postgres project provisioning.
 *
 * This is the genuine "one-click, no manual configuration" database
 * setup: given the operator's own NEON_API_KEY (a real credential the
 * operator has to obtain once — nothing can auto-generate someone's
 * own API key), every individual generated app gets its OWN real Neon
 * project automatically, with zero manual steps for that app.
 *
 * This is a different, more thorough approach than lib/database.js's
 * existing deploySchema() (schema-per-tenant on one shared Postgres
 * instance) — that one was kept deliberately simple because Neon/
 * Supabase's project-creation APIs weren't verified with confidence at
 * the time. Verified now: Neon's Management API
 * (https://api-docs.neon.tech) is well-documented, stable, and
 * genuinely designed for exactly this per-tenant-project use case —
 * their own docs describe platforms provisioning a project per
 * customer as a standard pattern, not an edge case.
 *
 * Base URL and auth confirmed against current docs: all requests to
 * https://console.neon.tech/api/v2, `Authorization: Bearer $NEON_API_KEY`.
 * Exact response field names below (connection_uris[0].connection_uri
 * etc.) match Neon's documented project-creation response shape as of
 * writing — not run against a live account from here, same standing
 * caveat as every other external API integration in this codebase
 * (Vercel, Render, Google Play). If a field name has drifted, check
 * https://api-docs.neon.tech/reference/createproject.
 */

const NEON_API_BASE = "https://console.neon.tech/api/v2";

function headers() {
  const key = process.env.NEON_API_KEY;
  if (!key) throw new Error("NEON_API_KEY not configured on server.");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function neonFetch(path, options = {}) {
  const response = await fetch(`${NEON_API_BASE}${path}`, { ...options, headers: headers() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Neon API error (${response.status}) on ${path}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function waitForOperations(projectId, operations, timeoutMs = 60000) {
  const start = Date.now();
  let pending = operations.map((op) => op.id);

  while (pending.length > 0) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Neon project ${projectId} operations still running after ${timeoutMs / 1000}s — check the Neon console.`);
    }
    await new Promise((r) => setTimeout(r, 2000));
    const { operations: current } = await neonFetch(`/projects/${projectId}/operations`);
    pending = (current || [])
      .filter((op) => pending.includes(op.id) && op.status !== "finished")
      .map((op) => op.id);
  }
}

/**
 * Creates a dedicated Neon project for one generated app, runs the
 * app's schema DDL against it, and returns a ready-to-use connection
 * string. One call from the caller's point of view — polling and DDL
 * execution happen inside.
 */
async function provisionNeonDatabase(schemaSql, projectId) {
  const orgId = process.env.NEON_ORG_ID || undefined; // only needed with a personal API key, not an org key

  const created = await neonFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      project: {
        name: `gurost-${projectId.slice(0, 8)}`,
        ...(orgId ? { org_id: orgId } : {})
      }
    })
  });

  const neonProjectId = created.project.id;
  if (created.operations?.length) {
    await waitForOperations(neonProjectId, created.operations);
  }

  const connectionUri = created.connection_uris?.[0]?.connection_uri;
  if (!connectionUri) {
    throw new Error("Neon project created but no connection URI was returned — check the Neon API response shape against current docs.");
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: connectionUri });
  await client.connect();
  try {
    await client.query(schemaSql);
  } finally {
    await client.end();
  }

  return {
    provider: "neon",
    neonProjectId,
    connectionString: connectionUri,
    consoleUrl: `https://console.neon.tech/app/projects/${neonProjectId}`
  };
}

module.exports = { provisionNeonDatabase };

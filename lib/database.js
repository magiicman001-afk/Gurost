/**
 * Deploys a generated schema. Two paths, chosen automatically:
 *
 *  - NEON_API_KEY set: each app gets its OWN real Neon Postgres
 *    project, provisioned automatically (lib/neon.js) — genuinely
 *    "no manual configuration" per app, once the operator has set that
 *    one key.
 *  - Otherwise: falls back to the original approach — a namespaced
 *    schema on one shared Postgres instance (DATABASE_URL). Simpler,
 *    no per-app isolation, but requires zero additional setup beyond
 *    what already existed.
 *
 * Neither path is "wrong" — schema-per-tenant is a legitimate, common
 * pattern for an early-stage multi-tenant platform; project-per-tenant
 * is more isolated but means real per-app cloud resources (and real
 * per-app cost) from day one. Pick based on what you actually want,
 * not because one sounds more impressive.
 */

const { Client } = require("pg");
const { provisionNeonDatabase } = require("./neon");

async function deploySchema(schemaSql, engine, projectId) {
  if (engine !== "postgres") {
    // Mongo is schemaless by design — there's no DDL to "deploy" the same
    // way. app-bot's generated Mongo schema is a document-shape reference
    // for the backend code to use directly; nothing to provision here.
    return { deployed: false, reason: `Engine "${engine}" has no schema deployment step — Mongo collections are created implicitly on first write.` };
  }

  if (process.env.NEON_API_KEY) {
    const result = await provisionNeonDatabase(schemaSql, projectId);
    return { deployed: true, provider: "neon", ...result };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Neither NEON_API_KEY nor DATABASE_URL is configured — set one of them to deploy a schema.");
  }

  const schemaName = `app_${projectId.slice(0, 8)}`;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(schemaSql);
    return { deployed: true, provider: "shared-schema", schemaName };
  } finally {
    await client.end();
  }
}

module.exports = { deploySchema };

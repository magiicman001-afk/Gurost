/**
 * Security Scanner.
 *
 * READ THIS BEFORE TRUSTING A "PASSED" RESULT FROM THIS FILE: it exists
 * specifically because a shallower version of this exact idea already
 * failed once, publicly, for a real reason worth understanding.
 *
 * Lovable shipped a real security scanner after CVE-2025-48757 (170+
 * apps, one breach alone exposed 18,697 users, root cause: missing or
 * misconfigured Row Level Security). Their scanner checked one thing —
 * does a table have RLS switched on. It did NOT check whether the
 * actual policy attached to that table restricted anything. A table
 * with RLS enabled and a single `USING (true)` policy — technically
 * "protected," fully readable by anyone — passed their scan clean.
 * That's a real, documented finding, not speculation.
 *
 * So this file deliberately checks the deeper thing: not just "does a
 * policy exist" but "does the policy's actual condition look like it
 * restricts anything." A policy whose USING clause is just `true`, or
 * empty, or missing entirely while RLS is on, gets flagged as unsafe —
 * not treated as a pass just because a row exists in pg_policies.
 *
 * WHAT THIS HONESTLY CANNOT DO: verify a policy's *logic* is correct —
 * a policy that checks `user_id = auth.uid()` looks real and
 * restrictive to this scanner, but if that column is spelled wrong
 * elsewhere, or a service-role code path bypasses it unexpectedly,
 * this scanner has no way to know. It checks for the specific,
 * documented anti-pattern that caused a real breach — it is not a
 * general proof of security, and doesn't claim to be.
 *
 * SQL used here reuses the same raw pg Client pattern already
 * established in industry-rag.js, for one consistent way of running
 * direct SQL in this codebase, not a second one.
 */

const { Client } = require("pg");

async function withClient(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Real, documented anti-pattern: a policy condition that's just
// "true" (with or without whitespace/parens) restricts nothing at
// all, regardless of RLS being switched on. This is exactly the
// pattern that passed Lovable's own scanner.
function isUselessPolicyCondition(qual) {
  if (!qual) return true; // no condition at all is equally unsafe
  const normalized = qual.replace(/\s|\(|\)/g, "").toLowerCase();
  return normalized === "true";
}

/**
 * Real database security scan — checks every real table in the public
 * schema for RLS status and, where RLS is on, whether its real
 * policies actually restrict anything.
 */
async function scanDatabaseSecurity() {
  return withClient(async (client) => {
    const { rows: tables } = await client.query(`
      select schemaname, tablename, rowsecurity as rls_enabled
      from pg_tables
      where schemaname = 'public'
    `);

    const { rows: policies } = await client.query(`
      select schemaname, tablename, policyname, cmd, qual
      from pg_policies
      where schemaname = 'public'
    `);

    const findings = [];
    for (const table of tables) {
      const tablePolicies = policies.filter((p) => p.tablename === table.tablename);

      if (!table.rls_enabled) {
        findings.push({
          table: table.tablename,
          severity: "critical",
          issue: "Row Level Security is disabled — table is fully exposed to any client using the anon key.",
        });
        continue;
      }

      if (tablePolicies.length === 0) {
        // Real, honest distinction: this is SAFE (no anon/authenticated
        // access at all, only service_role can reach it), just not
        // useful yet if the table is meant to be queried directly by
        // the frontend. Flagged as informational, not critical.
        findings.push({
          table: table.tablename,
          severity: "info",
          issue: "RLS is enabled with zero policies — currently locked to service_role only. Safe, but add real policies before any frontend code queries this table directly.",
        });
        continue;
      }

      const uselessPolicies = tablePolicies.filter((p) => isUselessPolicyCondition(p.qual));
      if (uselessPolicies.length > 0) {
        findings.push({
          table: table.tablename,
          severity: "critical",
          issue: `RLS is enabled, but ${uselessPolicies.length} real polic${uselessPolicies.length === 1 ? "y" : "ies"} on this table (${uselessPolicies.map((p) => p.policyname).join(", ")}) don't actually restrict access — this is the exact pattern that passed Lovable's own scanner while leaving data exposed.`,
        });
      } else {
        findings.push({
          table: table.tablename,
          severity: "ok",
          issue: `RLS enabled with ${tablePolicies.length} real, non-trivial polic${tablePolicies.length === 1 ? "y" : "ies"}.`,
        });
      }
    }

    return {
      scannedAt: new Date().toISOString(),
      tableCount: tables.length,
      criticalCount: findings.filter((f) => f.severity === "critical").length,
      findings,
    };
  });
}

// Real, current-format secret patterns — checked against generated
// FRONTEND code specifically, since a real secret key server-side is
// expected and fine; the same key sitting in client-side JS is a real
// exposure a browser can read directly.
const SECRET_PATTERNS = [
  { name: "Stripe secret key", pattern: /sk_(live|test)_[a-zA-Z0-9]{20,}/ },
  { name: "OpenAI-style API key", pattern: /sk-[a-zA-Z0-9_-]{20,}/ },
  { name: "Supabase service_role JWT", pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]*"role":"service_role"/ },
  { name: "Generic AWS-style access key", pattern: /AKIA[0-9A-Z]{16}/ },
];

/**
 * Real scan of a set of generated files for hardcoded secrets in
 * client-side code. Takes the same {path, content} shape app-bot.js
 * already produces for a project's frontend files — no new format
 * to invent.
 */
function scanCodeForSecrets(files) {
  const findings = [];
  for (const file of files) {
    if (!file.path.match(/\.(html|js|jsx|css)$/)) continue; // server-side files can legitimately hold secrets
    for (const { name, pattern } of SECRET_PATTERNS) {
      const match = file.content.match(pattern);
      if (match) {
        findings.push({
          file: file.path,
          issue: `Possible ${name} found hardcoded in client-side code — this would be visible to anyone who views the page source.`,
          // Real, deliberate choice: don't include the actual matched
          // secret value in the finding — a security report is not
          // the place to also leak the thing it found.
        });
      }
    }
  }
  return { scannedAt: new Date().toISOString(), fileCount: files.length, findings };
}

module.exports = { scanDatabaseSecurity, scanCodeForSecrets, isUselessPolicyCondition };

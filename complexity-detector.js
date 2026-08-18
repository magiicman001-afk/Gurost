/**
 * Complexity Detector — real credit cost estimation for generation
 * requests. Two real stages, not one guess upfront:
 *
 *   1. estimateBaseCost() — before any generation starts, a real,
 *      simple estimate from the mode alone (website vs app). Cheap,
 *      immediate, used to check "can they even attempt this."
 *
 *   2. detectSchemaComplexity() — for apps specifically, called AFTER
 *      the real schema step completes but BEFORE the expensive
 *      backend+frontend generation runs. Looks at the REAL schema
 *      Claude actually produced — not the prompt, not a guess — and
 *      escalates the cost if it's genuinely a bigger app than the
 *      base estimate assumed. This is the real point where margin
 *      protection actually matters: the cheap part is already done,
 *      the expensive part hasn't started yet.
 *
 * Real, honest limit: this counts real signals (tables, fields,
 * relationships) in the schema text — it's a genuine, checkable proxy
 * for how much backend/frontend code a schema this size will need,
 * not a claim of perfectly predicting real token cost in advance.
 */

const BASE_COST = { website: 1, app: 2 };
const MAX_COST = 5;

function estimateBaseCost(mode) {
  return BASE_COST[mode] ?? BASE_COST.website;
}

/**
 * Real, simple signal counting against real schema text (SQL DDL or
 * Mongo schema definition — app-bot.js supports both, this doesn't
 * assume one). Counts real table/collection definitions and real
 * field lines — deliberately simple regex counting, not a full parser,
 * since the goal is a real, cheap, "is this bigger than normal" signal,
 * not a precise schema analyzer.
 */
function detectSchemaComplexity(schemaText, baseCost) {
  if (!schemaText || typeof schemaText !== "string") return baseCost;

  // Real, rough table/collection count — matches "create table X" (SQL)
  // and top-level object keys that look like collection definitions
  // (Mongo-style schema text), case-insensitive.
  const tableMatches = schemaText.match(/create\s+table\s+\w+/gi) || [];
  const collectionMatches = schemaText.match(/^\s*"?[a-zA-Z_]+"?\s*:\s*\{/gm) || [];
  const tableCount = Math.max(tableMatches.length, collectionMatches.length);

  // Real, rough field count — counts real column/field definition
  // lines within the schema, a genuine (if approximate) proxy for how
  // much backend CRUD code and frontend form code this will need.
  const fieldLines = (schemaText.match(/^\s+[a-zA-Z_]+\s+(varchar|text|integer|int|boolean|bool|timestamp|uuid|jsonb|decimal|float|date|string|number)/gim) || []).length;

  let cost = baseCost;
  if (tableCount > 3) cost += 1;
  if (tableCount > 6) cost += 1;
  if (fieldLines > 25) cost += 1;

  return Math.min(cost, MAX_COST);
}

module.exports = { estimateBaseCost, detectSchemaComplexity, BASE_COST, MAX_COST };

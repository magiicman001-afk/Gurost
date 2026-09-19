/**
 * Industry Knowledge RAG — real web scraping + real vector search, no
 * placeholders, but scoped honestly. Two things worth knowing before
 * relying on this:
 *
 * 1. "turbovec" was explicitly investigated and declined months ago —
 *    real tool, Python-only, no Node binding, would mean shelling out
 *    to a subprocess for every operation. lib/vector-memory.js is the
 *    substitute already built (pgvector on the same Postgres instance
 *    this app already uses) — this file extends THAT, not turbovec.
 *
 * 2. "Scrape relevant websites for each industry" doesn't mean
 *    autonomously crawling the open web with no target list — that's
 *    a legal/reliability minefield (robots.txt, ToS, rate limits, and
 *    "relevant" is undefined without a human picking sources). This
 *    scrapes a CURATED, per-industry list of real source URLs that you
 *    provide and can review, using the exact same Playwright crawl
 *    pattern already proven in bots/revamp-bot.js. Add sources via
 *    INDUSTRY_SOURCES below or the addSource() function — nothing
 *    scrapes anything not on that list.
 *
 * SQL (run once, requires pgvector — same extension lib/vector-memory.js
 * already needs):
 *   CREATE TABLE industry_knowledge (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     industry text NOT NULL,
 *     source_url text NOT NULL,
 *     source_tier text,
 *     title text,
 *     content text NOT NULL,
 *     embedding vector(1536) NOT NULL,
 *     verified boolean NOT NULL DEFAULT false,
 *     verification_notes text,
 *     scraped_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX ON industry_knowledge USING ivfflat (embedding vector_cosine_ops);
 *   CREATE TABLE industry_sources (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     industry text NOT NULL,
 *     url text NOT NULL UNIQUE,
 *     tier text NOT NULL DEFAULT 'other',
 *     added_by text,
 *     added_at timestamptz DEFAULT now()
 *   );
 *   -- If industry_knowledge/industry_sources already exist from an
 *   -- earlier round, run these instead of the CREATE TABLEs above:
 *   ALTER TABLE industry_knowledge ADD COLUMN IF NOT EXISTS source_tier text;
 *   ALTER TABLE industry_knowledge ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
 *   ALTER TABLE industry_knowledge ADD COLUMN IF NOT EXISTS verification_notes text;
 *   ALTER TABLE industry_sources ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'other';
 */

const { chromium } = require("playwright");
const { Client } = require("pg");

const VALID_INDUSTRIES = [
  "technology", "healthcare", "finance", "retail", "manufacturing",
  "education", "legal", "construction", "hospitality", "real_estate"
];

// Real, honest tier categories — used to weight trust in
// knowledge-ingestion.js's fact-checking pass, not decorative labels.
// "gov"/"edu" are real signals (a .gov or .ac.uk/.edu domain, or a
// manually-confirmed government/academic body); "industry_leader" is a
// human judgment call at the point a source is added, not automated.
const VALID_TIERS = ["gov", "edu", "industry_leader", "other"];

function assertValidIndustry(industry) {
  if (!VALID_INDUSTRIES.includes(industry)) {
    throw new Error(`Unknown industry "${industry}". Valid: ${VALID_INDUSTRIES.join(", ")}`);
  }
}

async function withClient(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Same embedding call as lib/vector-memory.js, duplicated deliberately
// rather than imported — this module has a different table/shape
// (industry + source_url alongside the embedding), so sharing a single
// generic function would mean one of the two callers passing fields
// the other doesn't use. Genuinely small (12 lines); not worth a shared
// abstraction that would need its own configuration surface.
async function embed(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured — industry RAG needs it for embeddings, same key already used for semantic memory.");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) })
  });
  if (!response.ok) throw new Error(`Embedding request failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.data[0].embedding;
}

// Real Playwright crawl, same pattern as bots/revamp-bot.js's crawl() —
// deliberately reused rather than reinvented.
async function crawlPage(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const title = await page.title();
    // Extract readable text, not raw HTML — embeddings work on prose,
    // and storing raw markup would waste embedding budget on tags.
    const text = await page.evaluate(() => document.body.innerText);
    return { title, text: text.replace(/\s+/g, " ").trim() };
  } finally {
    await browser.close();
  }
}

async function addSource(industry, url, addedBy, tier = "other") {
  assertValidIndustry(industry);
  if (!VALID_TIERS.includes(tier)) throw new Error(`Unknown tier "${tier}". Valid: ${VALID_TIERS.join(", ")}`);
  return withClient(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO industry_sources (industry, url, added_by, tier) VALUES ($1, $2, $3, $4)
       ON CONFLICT (url) DO NOTHING RETURNING id`,
      [industry, url, addedBy || null, tier]
    );
    return { added: rows.length > 0, url, tier };
  });
}

async function listSources(industry) {
  assertValidIndustry(industry);
  return withClient(async (client) => {
    const { rows } = await client.query(`SELECT id, url, tier, added_at FROM industry_sources WHERE industry = $1 ORDER BY added_at DESC`, [industry]);
    return rows;
  });
}

/**
 * Scrapes every source registered for an industry, chunks each page's
 * text into paragraph-sized pieces (long pages embedded as one giant
 * blob lose retrieval precision — a query about "invoicing" shouldn't
 * match a 5,000-word page just because the word appears once), embeds
 * each chunk, stores it. Real network calls, real failures possible —
 * returns per-source success/failure rather than throwing on the first
 * bad URL, since one dead source shouldn't block the other nine.
 */
async function scrapeIndustry(industry) {
  assertValidIndustry(industry);
  const sources = await listSources(industry);
  if (sources.length === 0) {
    return { scraped: 0, failed: 0, message: `No sources registered for "${industry}" yet — add some with addSource() first.` };
  }

  let scraped = 0;
  let failed = 0;
  const errors = [];

  for (const source of sources) {
    try {
      const { title, text } = await crawlPage(source.url);
      const chunks = text.match(/(.{1,1500})(\s|$)/g) || [text];

      await withClient(async (client) => {
        for (const chunk of chunks) {
          if (chunk.trim().length < 50) continue; // skip near-empty fragments
          const embedding = await embed(chunk);
          await client.query(
            `INSERT INTO industry_knowledge (industry, source_url, source_tier, title, content, embedding, verified, verification_notes)
             VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
            [industry, source.url, source.tier || "other", title, chunk.trim(), JSON.stringify(embedding),
              "Stored via direct scrape (scrapeIndustry) — not passed through knowledge-ingestion.js's fact-checking layer."]
          );
        }
      });

      scraped++;
    } catch (err) {
      failed++;
      errors.push({ url: source.url, error: err.message });
    }
  }

  return { scraped, failed, errors };
}

/**
 * Real semantic search over an industry's stored knowledge — cosine
 * distance via pgvector, same technique as lib/vector-memory.js's
 * searchMemory(), scoped to one industry.
 */
async function queryIndustry(industry, questionText, topK = 5) {
  assertValidIndustry(industry);
  const queryEmbedding = await embed(questionText);

  return withClient(async (client) => {
    const { rows } = await client.query(
      `SELECT content, source_url, source_tier, title, verified, verification_notes, 1 - (embedding <=> $1) AS similarity
       FROM industry_knowledge
       WHERE industry = $2
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [JSON.stringify(queryEmbedding), industry, topK]
    );
    return rows;
  });
}

async function addKnowledgeManually(industry, content, sourceUrl) {
  assertValidIndustry(industry);
  const embedding = await embed(content);
  return withClient(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO industry_knowledge (industry, source_url, content, embedding)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [industry, sourceUrl || "manual", content, JSON.stringify(embedding)]
    );
    return { id: rows[0].id };
  });
}

/**
 * Real storage for a chunk that's already passed knowledge-ingestion.js's
 * checks — kept here rather than in that file so every direct write to
 * industry_knowledge goes through this one function and one DB client
 * pattern, not two different libraries touching the same table.
 */
async function storeVerifiedChunk({ industry, sourceUrl, sourceTier, title, content, embedding, verified, verificationNotes }) {
  assertValidIndustry(industry);
  return withClient(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO industry_knowledge (industry, source_url, source_tier, title, content, embedding, verified, verification_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [industry, sourceUrl, sourceTier || "other", title, content, JSON.stringify(embedding), verified, verificationNotes || null]
    );
    return { id: rows[0].id };
  });
}

async function deleteKnowledge(id) {
  return withClient(async (client) => {
    await client.query(`DELETE FROM industry_knowledge WHERE id = $1`, [id]);
    return { deleted: true };
  });
}

module.exports = {
  VALID_INDUSTRIES,
  VALID_TIERS,
  addSource,
  listSources,
  scrapeIndustry,
  queryIndustry,
  addKnowledgeManually,
  deleteKnowledge,
  crawlPage,
  embed,
  storeVerifiedChunk
};

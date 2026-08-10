/**
 * Semantic memory via pgvector, on the same Postgres instance already
 * configured for schema deployment (DATABASE_URL). This is a deliberate
 * substitute for Zvec: Zvec is real, but it's a Python package with no
 * Node.js binding found anywhere — using it from this Node backend
 * would mean shelling out to a Python subprocess for every memory
 * operation, which is worse than just using Postgres, which is already
 * in this stack and already has a proper Node driver (`pg`).
 *
 * pgvector is a Postgres extension, not a separate service — if your
 * Postgres instance doesn't have it enabled, `CREATE EXTENSION` below
 * will fail. Supabase supports pgvector natively (enable it from the
 * dashboard's Database > Extensions page); Neon supports it too.
 *
 * Embeddings come from OpenAI (same OPENAI_API_KEY already used for
 * Business Transformer sketches) — text-embedding-3-small, 1536 dims.
 *
 * SQL (run once, requires pgvector extension enabled first):
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   CREATE TABLE semantic_memory (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     content text NOT NULL,
 *     metadata jsonb DEFAULT '{}',
 *     embedding vector(1536) NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX ON semantic_memory USING ivfflat (embedding vector_cosine_ops);
 */

const { Client } = require("pg");

async function embed(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured — semantic memory needs it for embeddings.");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Embedding request failed: ${JSON.stringify(data).slice(0, 300)}`);
  return data.data[0].embedding;
}

async function withClient(fn) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not configured.");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function storeMemory(userId, content, metadata = {}) {
  const vector = await embed(content);
  await withClient((client) =>
    client.query(
      "INSERT INTO semantic_memory (user_id, content, metadata, embedding) VALUES ($1, $2, $3, $4)",
      [userId, content, metadata, `[${vector.join(",")}]`]
    )
  );
}

async function searchMemory(userId, queryText, topK = 5) {
  const vector = await embed(queryText);
  const result = await withClient((client) =>
    client.query(
      `SELECT content, metadata, 1 - (embedding <=> $2) AS similarity
       FROM semantic_memory
       WHERE user_id = $1
       ORDER BY embedding <=> $2
       LIMIT $3`,
      [userId, `[${vector.join(",")}]`, topK]
    )
  );
  return result.rows;
}

module.exports = { storeMemory, searchMemory };

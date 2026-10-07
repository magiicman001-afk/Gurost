/**
 * Web search through the Brave Search API. Only offered to the model when
 * BRAVE_SEARCH_API_KEY is set. Results are untrusted web text: titles and
 * snippets are returned as plain data, with markup stripped.
 */
const { getJson } = require("./http");

const stripTags = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();

module.exports = {
  name: "web_search",
  description: "Search the web for current information (news, prices, competitors, facts that change). Returns the top results with title, link and a short snippet. Say which results you used.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for" },
      count: { type: "number", description: "How many results, 1 to 8. Defaults to 5." }
    },
    required: ["query"]
  },
  needsApproval: false,
  isAvailable: () => !!process.env.BRAVE_SEARCH_API_KEY,
  async execute({ query, count }, ctx = {}) {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    if (!key) throw new Error("Web search is not set up yet.");
    const q = String(query).trim().slice(0, 300);
    if (!q) throw new Error("There is nothing to search for.");
    const n = Math.min(8, Math.max(1, Math.trunc(count || 5)));
    let json;
    try {
      json = await getJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${n}`, { headers: { "X-Subscription-Token": key }, fetchFn: ctx.fetch });
    } catch (err) {
      throw new Error(err.status === 429 ? "Web search is busy right now. Try again shortly." : "Web search is not answering right now.");
    }
    const results = ((json && json.web && json.web.results) || []).slice(0, n)
      .map((r) => ({ title: stripTags(r.title).slice(0, 150), url: String(r.url || "").slice(0, 300), snippet: stripTags(r.description).slice(0, 300) }))
      .filter((r) => /^https?:\/\//.test(r.url));
    return { query: q, results, note: results.length ? undefined : "No results found." };
  }
};

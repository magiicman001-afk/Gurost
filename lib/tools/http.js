/** Small fetch helper for tools: timeout, JSON, and a fetch that tests can replace (ctx.fetch). */
const TIMEOUT_MS = 8000;

async function getJson(url, { headers = {}, fetchFn } = {}) {
  const doFetch = fetchFn || globalThis.fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await doFetch(url, { headers: { Accept: "application/json", ...headers }, signal: ctl.signal });
    if (!res.ok) { const e = new Error(`The service answered ${res.status}.`); e.status = res.status; throw e; }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The service took too long to answer.");
    throw err;
  } finally { clearTimeout(timer); }
}

module.exports = { getJson };

// Gurost — shared API client, included on every wired page.
// Attaches whichever credential signup.html/login stored (API key or
// JWT) to every request, and centralizes the base URL.
//
// REAL FIX: this used to be `const GurostAPI = (function(){...})();` —
// a top-level const/let in a plain <script> tag creates a shared
// script-scope binding other <script> tags on the same page can see
// as a bare `GurostAPI` reference, but it does NOT become a property
// of `window`. That broke every real place in this codebase that
// checked `window.GurostAPI` explicitly (copilot-indicator.js,
// pulse-voice.js) — those checks silently evaluated to undefined and
// fell back to sending zero auth headers, forever, with no error
// thrown. Explicitly assigning to window.GurostAPI fixes both the
// bare-reference case and the window-property case at once.

window.GurostAPI = (function () {
  const API_BASE = window.location.origin;

  function authHeaders() {
    const apiKey = localStorage.getItem('gurost_api_key');
    const jwt = localStorage.getItem('gurost_jwt');
    if (jwt) return { Authorization: `Bearer ${jwt}` };
    if (apiKey) return { 'x-api-key': apiKey };
    return {};
  }

  function isLoggedIn() {
    return !!(localStorage.getItem('gurost_api_key') || localStorage.getItem('gurost_jwt'));
  }

  function requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = 'signup.html';
      return false;
    }
    return true;
  }

  async function call(path, { method = 'GET', body, headers = {} } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Real, deliberately server-checked - not decoded from a JWT client-side,
  // since some users authenticate with a real API key instead of a JWT,
  // and an API key has no payload to decode at all. Reuses the real,
  // existing /api/me endpoint rather than adding a new one.
  let cachedPlan = null;
  async function getMyPlan() {
    if (cachedPlan) return cachedPlan;
    try {
      const me = await call('/api/me');
      cachedPlan = me.plan;
      return cachedPlan;
    } catch {
      return null; // real, honest fallback - if this fails, callers should treat it as "don't show the gated feature," not crash the page
    }
  }

  return { call, authHeaders, isLoggedIn, requireLogin, getMyPlan, API_BASE };
})();

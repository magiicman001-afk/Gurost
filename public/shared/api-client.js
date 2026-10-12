// Gurost — shared API client, included on every wired page.
// Login (S3d): the server keeps it in httpOnly cookies this page cannot
// read; every request carries them (credentials: 'include'), and a 401
// gets one silent refresh before anyone is sent to the login page.
// gurost_li=1 (a readable cookie) only says such a login exists.
// Credentials stored by older logins (JWT or API key) are still sent
// until they expire. Also centralizes the base URL.
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

  // Real, honest escaping for any server value (email, prompt text, etc.)
  // that gets interpolated into innerHTML — those values are user-supplied
  // and aren't validated for HTML-safe characters at the point they're
  // stored, so every render site is responsible for escaping them itself.
  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  function hasLoginCookie() {
    try { return /(?:^|;\s*)gurost_li=1(?:;|$)/.test(document.cookie); } catch { return false; }
  }

  // Only credentials an older login stored in this browser; a cookie login needs no header.
  function authHeaders() {
    const apiKey = localStorage.getItem('gurost_api_key');
    const jwt = localStorage.getItem('gurost_jwt');
    if (jwt) return { Authorization: `Bearer ${jwt}` };
    if (apiKey) return { 'x-api-key': apiKey };
    return {};
  }

  function isLoggedIn() {
    return hasLoginCookie() || !!(localStorage.getItem('gurost_api_key') || localStorage.getItem('gurost_jwt'));
  }

  let cachedPlan = null;

  function forgetStoredLogin() {
    localStorage.removeItem('gurost_jwt');
    localStorage.removeItem('gurost_api_key');
    localStorage.removeItem('gurost_user_id');
    cachedPlan = null;
  }

  function goToLogin() {
    if (!/\/(login|signup|reset-password|index)?(\.html)?$/.test(window.location.pathname)) {
      window.location.href = 'login.html?expired=1';
    }
  }

  // One refresh at a time, however many calls hit a 401 together.
  // true = refreshed; false = the session is over (log in again); null = server unreachable (try later).
  let refreshing = null;
  function refreshSession() {
    if (!hasLoginCookie()) return Promise.resolve(false);
    if (!refreshing) {
      refreshing = fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then((r) => (r.ok ? true : r.status === 401 || r.status === 403 ? false : null))
        .catch(() => null)
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  const LOGIN_FAILED = new Set(['token_expired', 'token_invalid', 'no_credentials']);

  // fetch() with the login attached. On a 401 for a login that ran out: an old stored token is dropped
  // (the cookie is tried instead), or the cookie login is refreshed once; then the request is sent again.
  // Returns the Response (audio, CSV and other non-JSON calls use it); call() below is the JSON version.
  async function authFetch(url, init = {}, attempt = 0) {
    const sent = authHeaders();
    const res = await fetch(url, { ...init, credentials: 'include', headers: { ...sent, ...(init.headers || {}) } });
    if (res.status !== 401 || attempt >= 2) return res;
    let code = null;
    try { code = (await res.clone().json())?.code; } catch { /* not JSON */ }
    if (!LOGIN_FAILED.has(code)) return res;
    if (sent.Authorization && code !== 'no_credentials') {
      // An old stored login that ran out (or is no longer valid): forget it, as before.
      localStorage.removeItem('gurost_jwt');
      localStorage.removeItem('gurost_user_id');
      if (hasLoginCookie()) return authFetch(url, init, attempt + 1);
      goToLogin();
      return res;
    }
    if (sent['x-api-key']) return res; // API-key users are not sent anywhere
    const refreshed = await refreshSession();
    if (refreshed) return authFetch(url, init, attempt + 1);
    if (refreshed === false) { forgetStoredLogin(); goToLogin(); }
    return res;
  }

  // Sign out of this browser: the server ends the session and clears the cookies.
  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } catch { /* offline: the local copy is still cleared */ }
    forgetStoredLogin();
  }

  // Sign out on every device (other phones, other browsers) - this one too.
  async function logoutEverywhere() {
    await call('/api/auth/logout-all', { method: 'POST', body: {} });
    forgetStoredLogin();
  }

  // The /ws/guide socket's first message. With a cookie login it carries no token: the server reads the cookie.
  function socketAuthMessage() {
    const h = authHeaders();
    return JSON.stringify({ type: 'auth', token: (h.Authorization || '').replace(/^Bearer /, '') || undefined, apiKey: h['x-api-key'] });
  }

  // A socket closed with 4401 (login missing or expired). Resolves true when the page should reconnect
  // (refreshed, or the server was unreachable - reconnect with back-off), false once it has been sent to
  // log in. Another 4401 within a minute of a refresh means the refresh didn't help: log in again.
  let lastSocketRefresh = 0;
  async function socketLoginExpired() {
    if (authHeaders().Authorization) {
      localStorage.removeItem('gurost_jwt');
      localStorage.removeItem('gurost_user_id');
    }
    if (hasLoginCookie() && Date.now() - lastSocketRefresh > 60000) {
      const refreshed = await refreshSession();
      if (refreshed) { lastSocketRefresh = Date.now(); return true; }
      if (refreshed === null) return true;
    }
    forgetStoredLogin();
    goToLogin();
    return false;
  }

  function requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = 'signup.html';
      return false;
    }
    return true;
  }

  async function call(path, { method = 'GET', body, headers = {} } = {}) {
    // A form upload (a voice recording) must go as-is: the browser sets its own content type.
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await authFetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
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

  return { call, fetch: authFetch, authHeaders, isLoggedIn, requireLogin, getMyPlan, logout, logoutEverywhere, refreshSession, socketAuthMessage, socketLoginExpired, API_BASE, escapeHtml };
})();

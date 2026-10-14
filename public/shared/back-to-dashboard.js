// Gurost: a signed-in visitor on a public page (Home, Pricing, Templates, ...) gets one clear way back.
// The public header only offers "Log in" and "Start Building", and on a phone the menu is hidden,
// so a signed-in person had nowhere to go but the login page. When a login exists, swap those two
// links for ONE small "Dashboard" button. Its size, colours and wording are set here, inline, so it
// is identical on every page whatever each page's own CSS does. Signed-out visitors see no change.
// Works with or without shared/api-client.js. Text is set with textContent only.
(function () {
  function signedIn() {
    var api = window.GurostAPI;
    if (api && typeof api.isLoggedIn === 'function') return !!api.isLoggedIn();
    try { return /(?:^|;\s*)gurost_li=1(?:;|$)/.test(document.cookie); } catch (e) { return false; }
  }
  function run() {
    if (!signedIn()) return;
    var header = document.querySelector('header');
    if (!header || header.querySelector('[data-back-to-dashboard]')) return;
    var login = header.querySelector('a[href="login.html"]');
    var start = header.querySelector('a[href="signup.html"]');
    var back = document.createElement('a');
    back.href = 'dashboard.html';
    back.setAttribute('data-back-to-dashboard', '');
    back.textContent = '\u2190 Dashboard';
    var s = back.style;
    s.display = 'inline-block';
    s.background = 'linear-gradient(135deg, #FEB246 0%, #FF8C00 100%)';
    s.color = '#fff';
    s.fontSize = '13px';
    s.fontWeight = '600';
    s.lineHeight = '1';
    s.padding = '9px 14px';
    s.borderRadius = '999px';
    s.whiteSpace = 'nowrap';
    s.textDecoration = 'none';
    if (login) login.remove();
    if (start) start.replaceWith(back);
    else if (header.lastElementChild) header.lastElementChild.appendChild(back);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

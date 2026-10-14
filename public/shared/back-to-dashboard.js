// Gurost: ONE "Dashboard" button, identical on every page that has a header.
//  - Public pages (Home, Pricing, Templates, Help, Privacy, ...): the header offers "Log in" and
//    "Start Building" and, on a phone, no menu, so a signed-in person had nowhere to go but the login
//    page. When a login exists those two links are swapped for the button. Signed-out visitors see no change.
//  - Signed-in pages (Builder, Settings, Profile, ...): they already had a "Dashboard" link, each styled a
//    little differently. That link is restyled to the same button.
// Size, colours and wording are set inline here, so no page's own CSS can make it differ.
// Works with or without shared/api-client.js. Text is set with textContent only.
(function () {
  function signedIn() {
    var api = window.GurostAPI;
    if (api && typeof api.isLoggedIn === 'function') return !!api.isLoggedIn();
    try { return /(?:^|;\s*)gurost_li=1(?:;|$)/.test(document.cookie); } catch (e) { return false; }
  }
  function style(a) {
    a.href = 'dashboard.html';
    a.setAttribute('data-back-to-dashboard', '');
    a.removeAttribute('class');
    a.textContent = '\u2190 Dashboard';
    var s = a.style;
    s.display = 'inline-block';
    s.boxSizing = 'content-box';
    s.background = 'linear-gradient(135deg, #FEB246 0%, #FF8C00 100%)';
    s.color = '#fff';
    s.border = '0';
    s.fontFamily = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    s.letterSpacing = 'normal';
    s.fontSize = '13px';
    s.fontWeight = '600';
    s.lineHeight = '1';
    s.padding = '9px 14px';
    s.borderRadius = '999px';
    s.whiteSpace = 'nowrap';
    s.textDecoration = 'none';
    s.flexShrink = '0';
  }
  function run() {
    var header = document.querySelector('header');
    if (!header || header.querySelector('[data-back-to-dashboard]')) return;
    var login = header.querySelector('a[href="login.html"]');
    var start = header.querySelector('a[href="signup.html"]');
    if (login || start) { // public page
      if (!signedIn()) return;
      var back = document.createElement('a');
      style(back);
      if (login) login.remove();
      if (start) start.replaceWith(back);
      else if (header.lastElementChild) header.lastElementChild.appendChild(back);
      return;
    }
    var existing = header.querySelector('a[href="dashboard.html"]'); // signed-in page
    if (existing) style(existing);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

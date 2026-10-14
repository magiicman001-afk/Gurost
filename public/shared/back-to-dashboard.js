// Gurost: a signed-in visitor on a public page (Templates, Showcase, ...) gets one clear way back.
// The public header only offers "Log in" and "Start Building", and on a phone the menu is hidden,
// so a signed-in person had nowhere to go but the login page. When a login exists, swap those two
// links for "Back to Dashboard". Signed-out visitors see the page exactly as before.
// Needs shared/api-client.js first. Text is set with textContent only.
(function () {
  function run() {
    var api = window.GurostAPI;
    if (!api || typeof api.isLoggedIn !== 'function' || !api.isLoggedIn()) return;
    var header = document.querySelector('header.gurost-chrome');
    if (!header || header.querySelector('[data-back-to-dashboard]')) return;
    var login = header.querySelector('a[href="login.html"]');
    var start = header.querySelector('a[href="signup.html"]');
    var back = document.createElement('a');
    back.href = 'dashboard.html';
    back.setAttribute('data-back-to-dashboard', '');
    back.className = 'gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full whitespace-nowrap';
    back.textContent = '← Back to Dashboard';
    if (login) login.remove();
    if (start) start.replaceWith(back);
    else if (header.lastElementChild) header.lastElementChild.appendChild(back);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

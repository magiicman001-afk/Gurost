(function () {
  var d = document;
  d.documentElement.classList.add("g-js");
  var n = d.querySelector('[data-gurost-section="navbar"]');
  if (!n) return;
  if (n.hasAttribute("data-g-nav-solid")) {
    var upd = function () {
      n.classList.toggle("is-solid", (window.scrollY || d.documentElement.scrollTop) > 40);
    };
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }
  var b = n.querySelector(".g-navbar__menu-btn");
  if (!b) return;
  function set(open) {
    n.classList.toggle("is-open", open);
    b.setAttribute("aria-expanded", open ? "true" : "false");
  }
  b.addEventListener("click", function () {
    set(!n.classList.contains("is-open"));
  });
  n.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && n.classList.contains("is-open")) {
      set(false);
      b.focus();
    }
  });
  n.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".g-navbar__panel a")) set(false);
  });
})();

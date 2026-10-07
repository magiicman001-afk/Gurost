// The small suggestion card at the top of the Business Assistant page:
// "[Yes] [No] [Not now]". Yes opens the right bot with a starter message typed
// in (nothing is sent). Everything shown is put on the page with textContent.
// renderCard() takes the document and the page actions as inputs so it can be
// tested with pretend ones; the page wiring at the bottom only runs in a browser.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostProactive = factory();
})(typeof self !== "undefined" ? self : this, function () {
  /** One card. hooks = { answer(id, "accepted"|"declined"|"snoozed") -> Promise, open(action), onGone() } */
  function renderCard(doc, s, hooks) {
    function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    var wrap = el("div", "proactive-card");
    wrap.setAttribute("data-suggestion-id", s.id);
    wrap.appendChild(el("div", "text-xs font-semibold text-gray-500 mb-1", "A suggestion"));
    wrap.appendChild(el("div", "text-sm", s.content));
    var note = el("div", "text-xs mt-1");
    var bar = el("div", "proactive-bar");
    var busy = false;
    function btn(label, kind) {
      var b = el("button", "dept-copy", label); b.type = "button"; b.style.marginRight = "8px";
      b.addEventListener("click", function () { decide(kind); });
      return b;
    }
    var buttons = [btn("Yes", "accepted"), btn("No", "declined"), btn("Not now", "snoozed")];
    buttons.forEach(function (b) { bar.appendChild(b); });
    wrap.appendChild(bar); wrap.appendChild(note);
    async function decide(kind) {
      if (busy) return; busy = true; buttons.forEach(function (b) { b.disabled = true; });
      try {
        await hooks.answer(s.id, kind);
        wrap.classList.add("proactive-gone");
        if (kind === "accepted" && hooks.open && s.action) hooks.open(s.action);
        if (hooks.onGone) hooks.onGone(wrap);
      } catch (err) {
        busy = false; buttons.forEach(function (b) { b.disabled = false; });
        // 404 = already answered somewhere else: the card is done either way.
        if (err && err.status === 404) { wrap.classList.add("proactive-gone"); if (hooks.onGone) hooks.onGone(wrap); return; }
        note.textContent = (err && err.message) || "That did not work. Please try again."; note.style.color = "#b91c1c";
      }
    }
    return wrap;
  }

  // ---- page wiring (browser only) ----
  function start() {
    var slot = document.getElementById("proactiveCard");
    if (!slot || !window.GurostAPI) return;
    var tz; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { tz = "UTC"; }

    // Opens the bot and types the starter message. The bot list loads a moment after the page does.
    function openBot(action) {
      if (!action || action.kind !== "prefill") return;
      var tries = 0;
      (function attempt() {
        var sel = document.getElementById("deptSelect"), input = document.getElementById("deptInput");
        var has = sel && Array.prototype.some.call(sel.options, function (o) { return o.value === action.bot; });
        if (!has && tries++ < 20) return setTimeout(attempt, 150);
        if (!has) return;
        sel.value = action.bot; sel.dispatchEvent(new Event("change"));
        if (input) input.value = String(action.text || "").slice(0, 500);
        var target = document.getElementById("deptBots"); if (target && target.scrollIntoView) target.scrollIntoView({ block: "start" });
      })();
    }

    GurostAPI.call("/api/proactive?tz=" + encodeURIComponent(tz)).then(function (r) {
      var list = (r && r.suggestions) || [];
      list.forEach(function (s) {
        slot.appendChild(renderCard(document, s, {
          answer: function (id, kind) { return GurostAPI.call("/api/proactive/" + id + "/respond", { method: "POST", body: { action: kind } }); },
          open: openBot,
          onGone: function (card) { setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); if (!slot.children.length) slot.hidden = true; }, 400); }
        }));
      });
      slot.hidden = !slot.children.length;
    }).catch(function () { /* no suggestions is a normal state; stay hidden */ });
  }
  if (typeof document !== "undefined" && document.getElementById) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  }

  return { renderCard: renderCard };
});

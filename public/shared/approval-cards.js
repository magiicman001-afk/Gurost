// [Approve] [Edit] [Cancel] cards for actions a bot wants to take. The card is
// built from the server's description (summary + fields). Everything shown is
// put on the page with textContent, never as HTML. The page passes in `api`
// (approve(id, args), cancel(id)) so this file never talks to the network itself.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostApprovals = factory();
})(typeof self !== "undefined" ? self : this, function () {
  /** The arguments to send after an edit: only the fields the user filled in, numbers as numbers. */
  function collectArgs(fields, values) {
    var args = {};
    fields.forEach(function (f) {
      var raw = values[f.name];
      if (raw === undefined || raw === null || String(raw).trim() === "") return;
      if (f.type === "number" || f.type === "integer") { var n = Number(raw); if (!isNaN(n)) args[f.name] = n; return; }
      if (f.type === "boolean") { args[f.name] = raw === true || raw === "true"; return; }
      args[f.name] = String(raw);
    });
    return args;
  }

  function show(v) { return v === undefined || v === null || v === "" ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v); }

  /**
   * Build one card. `doc` is the document, `card` the server's description,
   * `hooks` = { approve(id, args|undefined) -> Promise, cancel(id) -> Promise, onDone() }.
   */
  function renderCard(doc, card, hooks) {
    function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    var wrap = el("div", "dept-bubble dept-bot dept-approval");
    wrap.setAttribute("data-approval-id", card.id);
    wrap.appendChild(el("div", "text-xs font-semibold text-gray-500 mb-1", "Waiting for your OK - nothing has been done yet"));
    wrap.appendChild(el("div", "text-sm font-semibold", card.summary || "Action waiting"));
    var body = el("div", "dept-approval-fields"); wrap.appendChild(body);
    var note = el("div", "text-xs mt-1"); wrap.appendChild(note);
    var bar = el("div", "dept-approval-bar"); wrap.appendChild(bar);
    var editing = false, busy = false, inputs = {};

    function drawFields() {
      body.textContent = ""; inputs = {};
      (card.fields || []).forEach(function (f) {
        var row = el("div", "text-sm");
        row.appendChild(el("span", "font-semibold", f.name + ": "));
        if (editing) {
          var inp = f.long ? el("textarea", "dept-approval-input") : el("input", "dept-approval-input");
          if (!f.long) inp.type = f.type === "number" || f.type === "integer" ? "number" : "text";
          inp.value = f.value == null ? "" : typeof f.value === "object" ? JSON.stringify(f.value) : String(f.value);
          inp.setAttribute("aria-label", f.name);
          inputs[f.name] = inp; row.appendChild(inp);
        } else if (f.long) { row.appendChild(el("pre", "dept-draft", show(f.value))); }
        else row.appendChild(el("span", null, show(f.value)));
        body.appendChild(row);
      });
    }
    function button(label, fn) { var b = el("button", "dept-copy", label); b.type = "button"; b.addEventListener("click", fn); return b; }
    function drawButtons() {
      bar.textContent = "";
      var approve = button(editing ? "Approve with my changes" : "Approve", function () { decide("approve"); });
      var edit = button(editing ? "Back" : "Edit", function () { editing = !editing; drawFields(); drawButtons(); note.textContent = ""; });
      var cancel = button("Cancel", function () { decide("cancel"); });
      [approve, edit, cancel].forEach(function (b) { b.disabled = busy; b.style.marginRight = "8px"; bar.appendChild(b); });
    }
    function finish(text, isErr) {
      note.textContent = text; note.style.color = isErr ? "#b91c1c" : "#15803d";
      if (!isErr) { bar.textContent = ""; wrap.classList.add("dept-approval-closed"); if (hooks.onDone) hooks.onDone(); }
    }
    async function decide(kind) {
      if (busy) return; busy = true; drawButtons(); note.style.color = ""; note.textContent = "Working…";
      try {
        if (kind === "cancel") { await hooks.cancel(card.id); finish("Cancelled. Nothing was done."); }
        else {
          var values = {}; Object.keys(inputs).forEach(function (k) { values[k] = inputs[k].value; });
          await hooks.approve(card.id, editing ? collectArgs(card.fields || [], values) : undefined);
          finish("Approved and done.");
        }
      } catch (err) {
        busy = false; drawButtons();
        // 409/410 (already decided / expired) end the card; anything else can be retried.
        var gone = err && (err.status === 409 || err.status === 410 || err.status === 404);
        note.textContent = (err && err.message) || "That did not work. Please try again.";
        note.style.color = "#b91c1c";
        if (gone) { bar.textContent = ""; wrap.classList.add("dept-approval-closed"); }
        return;
      }
      busy = false;
    }
    drawFields(); drawButtons();
    return wrap;
  }

  return { renderCard: renderCard, collectArgs: collectArgs };
});

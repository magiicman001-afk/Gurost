/* Settings > Calendar. All text goes in with textContent (never HTML). The server decides everything; this only shows it. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostCalendarSettings = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function describe(st) {
    if (!st || st.error) return { line: (st && st.error) || "Could not check Calendar just now.", mode: "error" };
    if (!st.configured) return { line: "Calendar is not switched on for this server yet.", mode: "off" };
    if (!st.connected) return { line: "Not connected. You choose what it may do: show your upcoming events to your assistants, and/or add an event after you approve it. Nobody is ever invited, and nothing is changed or deleted.", mode: "disconnected" };
    const can = [st.canCreate ? "adding events you approve" : null, st.viewing ? "showing your upcoming events" : null].filter(Boolean);
    return { line: "Connected. " + (can.length ? "Allowed: " + can.join(" and ") + "." : "Nothing is switched on right now."), mode: "connected" };
  }

  const NOTICE = { connected: "Calendar is connected.", denied: "You chose not to give access, so nothing was connected.", error: "Calendar could not be connected. Please try again." };

  function mount(box, api) {
    if (!box) return;
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const msg = mk("p", "text-xs text-red-600 mt-2");
    const btn = (label, fn) => { const b = mk("button", "text-sm font-semibold px-4 py-2 rounded-full border border-[var(--line)]", label); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; try { await fn(); } catch (e) { msg.textContent = (e && e.message) || "That did not work."; } b.disabled = false; }); return b; };
    const status = mk("p", "text-xs text-[var(--muted)]", "Checking…");
    const row = mk("div", "flex flex-wrap gap-2 mt-3");
    box.append(status, row, msg);
    const params = new URLSearchParams(location.search);
    if (params.get("calendar") && NOTICE[params.get("calendar")]) msg.textContent = NOTICE[params.get("calendar")];

    async function go(view, create) { const r = await api.call("/api/calendar/connect", { method: "POST", body: { view: !!view, create: !!create } }); if (r && /^https:\/\/accounts\.google\.com\//.test(r.url)) location.href = r.url; else throw new Error("Could not start the connection."); }

    async function refresh() {
      let st; try { st = await api.call("/api/calendar/status"); } catch (e) { st = { error: (e && e.message) || "" }; }
      const d = describe(st);
      status.textContent = d.line; row.textContent = "";
      if (d.mode === "disconnected") {
        const view = mk("input"); view.type = "checkbox"; view.id = "calView";
        const create = mk("input"); create.type = "checkbox"; create.id = "calCreate";
        const l1 = mk("label", "text-sm flex items-center gap-2 w-full"), l2 = mk("label", "text-sm flex items-center gap-2 w-full");
        l1.append(view, mk("span", null, "Let my assistants see my upcoming events")); l2.append(create, mk("span", null, "Let my assistants add an event, only after I approve it"));
        row.append(l1, l2, btn("Connect Calendar", async () => { if (!view.checked && !create.checked) throw new Error("Tick at least one thing it may do."); await go(view.checked, create.checked); }));
      }
      if (d.mode === "connected") {
        if (st.viewing) row.append(btn("Turn viewing off", async () => { await api.call("/api/calendar/viewing", { method: "POST", body: { on: false } }); await refresh(); }));
        else row.append(btn("Allow viewing my events", async () => { await api.call("/api/calendar/viewing", { method: "POST", body: { on: true } }); await refresh(); }));
        row.append(btn("Disconnect Calendar", async () => { await api.call("/api/calendar/disconnect", { method: "POST", body: {} }); msg.textContent = "Disconnected. Your access key was deleted here and revoked at Google."; await refresh(); }));
      }
    }
    refresh();
  }

  return { describe, mount, NOTICE };
}));

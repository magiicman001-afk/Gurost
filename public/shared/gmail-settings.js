/* Settings > Gmail. All text goes in with textContent (never HTML). The server decides everything; this only shows it. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostGmailSettings = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Plain-words state for a status object from GET /api/gmail/status. */
  function describe(st) {
    if (!st || st.error) return { line: (st && st.error) || "Could not check Gmail just now.", mode: "error" };
    if (!st.configured) return { line: "Gmail is not switched on for this server yet.", mode: "off" };
    if (!st.connected) return { line: "Not connected. Connecting lets your assistants save drafts in your Gmail and send an email only after you approve it. Nothing is ever deleted or archived.", mode: "disconnected" };
    return { line: "Connected as " + (st.email || "your Gmail") + ". " + (st.readInbox ? "Inbox reading is ON: recent senders, subjects and short previews can be read when you ask." : "Inbox reading is off."), mode: "connected" };
  }

  const NOTICE = {
    connected: "Gmail is connected.",
    denied: "You chose not to give access, so nothing was connected.",
    error: "Gmail could not be connected. Please try again."
  };

  function mount(box, api) {
    if (!box) return;
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const btn = (label, fn) => { const b = mk("button", "text-sm font-semibold px-4 py-2 rounded-full border border-[var(--line)]", label); b.type = "button"; b.addEventListener("click", async () => { b.disabled = true; try { await fn(); } catch (e) { msg.textContent = (e && e.message) || "That did not work."; } b.disabled = false; }); return b; };
    const status = mk("p", "text-xs text-[var(--muted)]", "Checking…");
    const msg = mk("p", "text-xs text-red-600 mt-2");
    const row = mk("div", "flex flex-wrap gap-2 mt-3");
    box.append(status, row, msg);
    const params = new URLSearchParams(location.search);
    if (params.get("gmail") && NOTICE[params.get("gmail")]) msg.textContent = NOTICE[params.get("gmail")];

    async function go(readInbox) { const r = await api.call("/api/gmail/connect", { method: "POST", body: { readInbox: !!readInbox } }); if (r && /^https:\/\/accounts\.google\.com\//.test(r.url)) location.href = r.url; else throw new Error("Could not start the connection."); }

    async function refresh() {
      let st; try { st = await api.call("/api/gmail/status"); } catch (e) { st = { error: (e && e.message) || "" }; }
      const d = describe(st);
      status.textContent = d.line; row.textContent = "";
      if (d.mode === "disconnected") row.append(btn("Connect Gmail", () => go(false)));
      if (d.mode === "connected") {
        if (st.readInbox) row.append(btn("Turn inbox reading off", async () => { await api.call("/api/gmail/read-inbox", { method: "POST", body: { on: false } }); await refresh(); }));
        else row.append(btn("Allow reading my inbox", async () => { try { await api.call("/api/gmail/read-inbox", { method: "POST", body: { on: true } }); await refresh(); } catch (e) { await go(true); } }));
        row.append(btn("Disconnect Gmail", async () => { await api.call("/api/gmail/disconnect", { method: "POST", body: {} }); msg.textContent = "Disconnected. Your access key was deleted here and revoked at Google."; await refresh(); }));
      }
    }
    refresh();
  }

  return { describe, mount, NOTICE };
}));

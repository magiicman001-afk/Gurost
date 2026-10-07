// Run: node --test test/proactive-card.test.js
// The suggestion card with a pretend document.
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderCard } = require("../public/shared/proactive-card");

function fakeDoc() {
  const make = (tag) => {
    const e = { tag, className: "", children: [], listeners: {}, attrs: {}, style: {}, disabled: false, _text: "",
      classList: { add(c) { e.className += " " + c; } },
      setAttribute(k, v) { e.attrs[k] = v; }, appendChild(c) { e.children.push(c); return c; },
      addEventListener(t, f) { e.listeners[t] = f; }, click() { return e.listeners.click(); } };
    Object.defineProperty(e, "textContent", { get() { return e._text + e.children.map((c) => c.textContent).join(""); }, set(v) { e._text = v; e.children = []; } });
    return e;
  };
  return { createElement: make };
}
const find = (n, pred, out = []) => { if (pred(n)) out.push(n); n.children.forEach((c) => find(c, pred, out)); return out; };
const btn = (c, label) => find(c, (n) => n.tag === "button" && n.textContent === label)[0];
const tick = () => new Promise((r) => setImmediate(r));
const s = { id: "s1", content: "You drafted 6 emails <b>this</b> week.", action: { kind: "prefill", bot: "sales", text: "Help me." } };

test("the card shows the text as plain text with Yes, No and Not now", () => {
  const c = renderCard(fakeDoc(), s, {});
  assert.match(c.textContent, /6 emails <b>this<\/b> week/);
  assert.deepEqual(find(c, (n) => n.tag === "button").map((b) => b.textContent), ["Yes", "No", "Not now"]);
});

test("Yes records the answer, then opens the bot with the starter message", async () => {
  const log = [];
  const c = renderCard(fakeDoc(), s, { answer: async (id, k) => log.push(["answer", id, k]), open: (a) => log.push(["open", a.bot, a.text]), onGone: () => log.push(["gone"]) });
  btn(c, "Yes").click(); await tick();
  assert.deepEqual(log, [["answer", "s1", "accepted"], ["open", "sales", "Help me."], ["gone"]]);
});

test("No and Not now record the answer and do NOT open a bot", async () => {
  for (const [label, kind] of [["No", "declined"], ["Not now", "snoozed"]]) {
    const log = [];
    const c = renderCard(fakeDoc(), s, { answer: async (id, k) => log.push(k), open: () => log.push("open"), onGone: () => log.push("gone") });
    btn(c, label).click(); await tick();
    assert.deepEqual(log, [kind, "gone"]);
  }
});

test("a double click answers once; a failure shows the error and allows a retry", async () => {
  let n = 0;
  const c = renderCard(fakeDoc(), s, { answer: async () => { n++; if (n === 1) throw new Error("Server hiccup"); } });
  btn(c, "No").click(); btn(c, "No").click(); await tick();
  assert.equal(n, 1, "second click ignored while busy");
  assert.match(c.textContent, /Server hiccup/);
  btn(c, "No").click(); await tick();
  assert.equal(n, 2);
});

test("an answer given on another device (404) just closes the card", async () => {
  let gone = 0;
  const c = renderCard(fakeDoc(), s, { answer: async () => { throw Object.assign(new Error("no longer waiting"), { status: 404 }); }, onGone: () => gone++ });
  btn(c, "Yes").click(); await tick();
  assert.equal(gone, 1);
});

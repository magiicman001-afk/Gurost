// Run: node --test test/approval-cards.test.js
// The [Approve] [Edit] [Cancel] card, with a tiny pretend document.
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderCard, collectArgs } = require("../public/shared/approval-cards");

function fakeDoc() {
  const make = (tag) => {
    const e = { tag, className: "", children: [], listeners: {}, attrs: {}, style: {}, disabled: false, value: "", _text: "",
      classList: { add(c) { e.className += " " + c; } },
      setAttribute(k, v) { e.attrs[k] = v; },
      appendChild(c) { e.children.push(c); return c; },
      addEventListener(t, f) { e.listeners[t] = f; },
      click() { return e.listeners.click && e.listeners.click(); } };
    Object.defineProperty(e, "textContent", { get() { return e._text + e.children.map((c) => c.textContent).join(""); }, set(v) { e._text = v; if (v === "") e.children = []; else e.children = []; } });
    return e;
  };
  return { createElement: make };
}
const find = (n, pred, out = []) => { if (pred(n)) out.push(n); n.children.forEach((c) => find(c, pred, out)); return out; };
const btn = (card, label) => find(card, (n) => n.tag === "button" && n.textContent === label)[0];
const tick = () => new Promise((r) => setImmediate(r));
const data = { id: "a1", summary: "Send to bob", fields: [{ name: "to", type: "string", value: "bob" }, { name: "body", type: "string", long: true, value: "Hello <b>bob</b>" }, { name: "count", type: "number", value: 2 }] };

test("collectArgs keeps filled fields, turns numbers into numbers, drops blanks", () => {
  assert.deepEqual(collectArgs(data.fields, { to: "carol", body: "  ", count: "5" }), { to: "carol", count: 5 });
});

test("the card shows the summary and fields as text, with three buttons", () => {
  const c = renderCard(fakeDoc(), data, {});
  assert.match(c.textContent, /Send to bob/);
  assert.match(c.textContent, /Hello <b>bob<\/b>/, "shown as plain text");
  assert.deepEqual(find(c, (n) => n.tag === "button").map((b) => b.textContent), ["Approve", "Edit", "Cancel"]);
});

test("Approve sends no edits and closes the card", async () => {
  const calls = []; let done = 0;
  const c = renderCard(fakeDoc(), data, { approve: async (id, args) => { calls.push([id, args]); }, onDone: () => done++ });
  btn(c, "Approve").click(); await tick();
  assert.deepEqual(calls, [["a1", undefined]]);
  assert.equal(done, 1);
  assert.match(c.textContent, /Approved and done/);
  assert.equal(find(c, (n) => n.tag === "button").length, 0);
});

test("Edit shows inputs; Approve with my changes sends the edited values", async () => {
  const calls = [];
  const c = renderCard(fakeDoc(), data, { approve: async (id, args) => { calls.push(args); } });
  btn(c, "Edit").click();
  const inputs = find(c, (n) => n.tag === "input" || n.tag === "textarea");
  assert.equal(inputs.length, 3);
  inputs.find((i) => i.attrs["aria-label"] === "to").value = "carol";
  inputs.find((i) => i.attrs["aria-label"] === "count").value = "7";
  btn(c, "Approve with my changes").click(); await tick();
  assert.deepEqual(calls, [{ to: "carol", body: "Hello <b>bob</b>", count: 7 }]);
});

test("Cancel tells the server and says nothing was done", async () => {
  const calls = [];
  const c = renderCard(fakeDoc(), data, { cancel: async (id) => { calls.push(id); } });
  btn(c, "Cancel").click(); await tick();
  assert.deepEqual(calls, ["a1"]);
  assert.match(c.textContent, /Nothing was done/);
});

test("a failed approval shows the error and can be retried", async () => {
  let n = 0;
  const c = renderCard(fakeDoc(), data, { approve: async () => { if (!n++) throw Object.assign(new Error("Server hiccup"), { status: 500 }); } });
  btn(c, "Approve").click(); await tick();
  assert.match(c.textContent, /Server hiccup/);
  btn(c, "Approve").click(); await tick();
  assert.match(c.textContent, /Approved and done/);
});

test("an expired or already-decided action ends the card instead of offering a retry", async () => {
  const c = renderCard(fakeDoc(), data, { approve: async () => { throw Object.assign(new Error("That action has expired."), { status: 410 }); } });
  btn(c, "Approve").click(); await tick();
  assert.match(c.textContent, /expired/);
  assert.equal(find(c, (n) => n.tag === "button").length, 0);
});

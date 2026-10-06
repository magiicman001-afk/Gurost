// Run: node --test test/submissions.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { shapeRow, parseListQuery, buildCsv, csvCell } = require("../lib/submissions");

test("an order row is flattened for the owner's table", () => {
  const r = shapeRow({ id: "1", created_at: "2026-10-06T10:00:00Z", kind: "order", read_at: null,
    fields: { name: "Ann", email: "a@x.com", phone: "0117", item: "Sourdough", quantity: "2", pickup_time: "2026-10-10T10:00", notes: "No seeds" } });
  assert.equal(r.name, "Ann");
  assert.equal(r.phone, "0117");
  assert.equal(r.read, false);
  assert.equal(r.preview, "2 x Sourdough - pickup 2026-10-10 10:00 - No seeds");
});

test("a contact row previews the message; read_at means read", () => {
  const r = shapeRow({ id: "2", created_at: "x", kind: "contact", read_at: "2026-10-06T11:00:00Z", fields: { name: "Bob", message: "Hi there" } });
  assert.equal(r.preview, "Hi there");
  assert.equal(r.read, true);
});

test("a row with no usable fields object does not crash", () => {
  assert.equal(shapeRow({ id: "3", kind: "contact", fields: null }).name, "");
});

test("list query: unknown values fall back, a bare 'to' date covers the whole day", () => {
  const f = parseListQuery({ type: "weird", status: "new", sort: "nope", from: "2026-10-01", to: "2026-10-02" });
  assert.equal(f.type, null);
  assert.equal(f.status, "new");
  assert.equal(f.sort, "newest");
  assert.equal(f.order.ascending, false);
  assert.equal(f.to.toISOString(), "2026-10-02T23:59:59.999Z");
  assert.equal(parseListQuery({ sort: "name" }).order.column, "fields->>name");
  assert.equal(parseListQuery({ from: "garbage" }).from, null);
});

test("CSV quotes commas and quotes and neutralises spreadsheet formulas", () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(csvCell("+44 117"), "'+44 117");
  assert.equal(csvCell("line1\nline2"), "line1 line2");
  const csv = buildCsv([shapeRow({ id: "1", created_at: "t", kind: "contact", fields: { name: "A, B", email: "a@x.com", message: "hi" } })]);
  assert.equal(csv.split("\r\n")[0], "Received,Name,Email,Phone,Type,Details,Status");
  assert.equal(csv.split("\r\n")[1], 't,"A, B",a@x.com,,contact,hi,new');
});

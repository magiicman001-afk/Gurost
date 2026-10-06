/**
 * Form submissions from generated sites, shaped for the owner's page:
 * a flat row (name, email, phone, type, preview, read state), the list
 * query's filters, and CSV export. Pure functions, no database here.
 */

const TYPES = new Set(["order", "contact"]);
const SORTS = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  name: { column: "fields->>name", ascending: true }
};

const first = (f, keys) => { for (const k of keys) if (f[k]) return String(f[k]); return ""; };

function previewOf(kind, f) {
  if (kind === "order") {
    const bits = [f.item && (f.quantity ? `${f.quantity} x ${f.item}` : f.item), f.pickup_time && `pickup ${String(f.pickup_time).replace("T", " ")}`, f.notes].filter(Boolean);
    return bits.join(" - ");
  }
  return first(f, ["message", "notes", "subject"]);
}

function shapeRow(row) {
  const f = row.fields && typeof row.fields === "object" ? row.fields : {};
  return {
    id: row.id,
    received: row.created_at,
    name: first(f, ["name", "full_name", "fullName"]),
    email: first(f, ["email"]),
    phone: first(f, ["phone", "tel"]),
    type: row.kind,
    preview: previewOf(row.kind, f),
    read: !!row.read_at,
    fields: f
  };
}

// Query-string -> safe filter object. Unknown values fall back to defaults.
function parseListQuery(q = {}) {
  const date = (v) => { const d = new Date(v); return v && !isNaN(d) ? d : null; };
  const type = TYPES.has(q.type) ? q.type : null;
  const status = q.status === "new" || q.status === "read" ? q.status : null;
  const from = date(q.from);
  let to = date(q.to);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(q.to))) to = new Date(to.getTime() + 86399999); // a bare date means the whole day
  const sort = SORTS[q.sort] ? q.sort : "newest";
  return { type, status, from, to, sort, order: SORTS[sort] };
}

// CSV with quoting, and formula-injection protection: a visitor controls these
// cells, and a leading = + - @ would run as a formula when the owner opens
// the file in Excel or Sheets.
function csvCell(v) {
  let s = String(v ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows) {
  const head = ["Received", "Name", "Email", "Phone", "Type", "Details", "Status"];
  const lines = rows.map((r) => [r.received, r.name, r.email, r.phone, r.type, r.preview, r.read ? "read" : "new"].map(csvCell).join(","));
  return [head.join(","), ...lines].join("\r\n");
}

module.exports = { shapeRow, parseListQuery, buildCsv, csvCell };

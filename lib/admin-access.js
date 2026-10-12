"use strict";
/**
 * Admin Area access rules (docs/ADMIN_AREA_SPEC.md section 1).
 *
 * DENY BY DEFAULT: a role that is not listed for a section gets nothing, an unknown role gets nothing, and an
 * unknown section gets nothing. Reads need "r" or "rw"; anything that changes data needs "rw".
 * The server enforces this on every route; hiding a tab in the page is cosmetic only.
 */

const ROLES = ["owner", "admin", "team_lead", "engineer", "viewer"];

// section -> role -> "r" | "rw". Missing = no access.
const MATRIX = {
  dashboard: { owner: "rw", admin: "r", team_lead: "r", engineer: "r", viewer: "r" },
  report: { owner: "r", admin: "r", team_lead: "r", viewer: "r" },
  inventory: { owner: "rw", admin: "r", team_lead: "r", engineer: "r", viewer: "r" },
  models: { owner: "rw", admin: "r" },
  projects: { owner: "rw", admin: "rw", team_lead: "r", engineer: "r" },
  builds: { owner: "r", admin: "r", team_lead: "r", engineer: "r" },
  bots: { owner: "r", admin: "r", team_lead: "r", engineer: "r" },
  security: { owner: "rw", admin: "r" },
  code: { owner: "rw", admin: "r", team_lead: "r", engineer: "r" },
  docs: { owner: "r", admin: "r", team_lead: "r", engineer: "r", viewer: "r" },
  team: { owner: "rw", admin: "rw" },
  ops: { owner: "rw" },
  // Existing admin tabs, mapped onto the same rules:
  users: { owner: "rw", admin: "rw" }, // user personal data: never Viewer, Engineer or Team Lead
  revenue: { owner: "r" }, // payments: Owner only (hidden from Admin by the spec)
};

function level(role, section) {
  const row = MATRIX[section];
  if (!row || !ROLES.includes(role)) return null;
  return row[role] || null;
}

/** can("admin", "projects") -> read; can("admin", "projects", true) -> write */
function can(role, section, write = false) {
  const l = level(role, section);
  return write ? l === "rw" : l === "r" || l === "rw";
}

function sectionsFor(role) {
  return Object.keys(MATRIX).filter((s) => can(role, s));
}

/**
 * Express middleware factory. GET/HEAD need read; every other method needs write.
 * req.admin.role must already be set by requireAdminAuth.
 */
function needs(section) {
  return (req, res, next) => {
    const role = req.admin && req.admin.role;
    const write = !(req.method === "GET" || req.method === "HEAD");
    if (!can(role, section, write)) {
      return res.status(403).json({ error: "Your role does not have access to this section." });
    }
    next();
  };
}

/**
 * Dashboard cards, filtered by role. `data` holds the raw numbers; a card the role may not see is simply absent
 * (not zero). Owner sees everything; Admin everything except revenue; Team Lead and Engineer only build/error
 * numbers; Viewer only the headline numbers (counts, no money, no error detail).
 */
const CARDS = {
  buildsWeek: ["owner", "admin", "team_lead", "engineer", "viewer"],
  failedWeek: ["owner", "admin", "team_lead", "engineer"],
  activeUsers: ["owner", "admin", "viewer"],
  errorsHour: ["owner", "admin", "team_lead", "engineer"],
  spend: ["owner", "admin"],
  revenue: ["owner"],
};

function dashboardFor(role, data) {
  const out = {};
  for (const [card, roles] of Object.entries(CARDS)) {
    if (roles.includes(role) && Object.prototype.hasOwnProperty.call(data, card)) out[card] = data[card];
  }
  return out;
}

module.exports = { ROLES, MATRIX, level, can, sectionsFor, needs, dashboardFor, CARDS };

"use strict";
/**
 * Original vector bakery art for the template library. Every motif is drawn here with plain SVG shapes (no photo, no outside
 * file, no licence to track). A template picks one palette and one drawing style, so the same eight motifs look different in
 * every template:  line (hairline outlines on the page colour), flat (bright fills and a chunky outline), duo (two flat inks).
 *
 *   art("croissant", P)  ->  '<svg viewBox="0 0 240 240" ...>...</svg>'
 *
 * P = { ink, bg, crust, crustDark, light, cream, accent, accent2, sw }   (sw = outline width, 0 for no outline)
 * Where a real photo exists it replaces the art in the same frame; the art is what is shown when there is no photo.
 */
const f = (n) => Math.round(n * 10) / 10;

const hexMix = (hex, to, amt) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v + (to - v) * amt))));
  return "#" + c.map((v) => (v < 16 ? "0" : "") + v.toString(16)).join("");
};

function maker(P, uid = "") {
  const sw = P.sw || 0;
  // P.soft3d: every flat colour becomes a soft gradient (light from the top left), so the art looks lit and rounded, like a clay render
  const defs = [], seen = {};
  const paint = (c) => {
    if (!P.soft3d || typeof c !== "string" || !/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (!seen[c]) {
      const id = uid + "g" + defs.length;
      seen[c] = id;
      defs.push(`<radialGradient id="${id}" cx=".32" cy=".26" r=".95"><stop offset="0" stop-color="${hexMix(c, 255, 0.34)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${hexMix(c, 0, 0.26)}"/></radialGradient>`);
    }
    return `url(#${seen[c]})`;
  };
  const stroke = sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : "";
  return {
    P,
    sw,
    defs,
    // a closed shape with the template's outline
    shape: (d, fill, extra = "") => `<path d="${d}" fill="${paint(fill)}"${stroke} ${extra}/>`,
    ell: (cx, cy, rx, ry, fill, rot = 0, extra = "") => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${paint(fill)}"${stroke}${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ""} ${extra}/>`,
    // fill only, never outlined (light patches, shadows, sprinkles)
    soft: (d, fill, extra = "") => `<path d="${d}" fill="${paint(fill)}" ${extra}/>`,
    softEll: (cx, cy, rx, ry, fill, rot = 0, extra = "") => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${paint(fill)}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ""} ${extra}/>`,
    // a line (score marks, steam, stitches)
    line: (d, color, w, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`,
  };
}

const wrap = (inner, label) => `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" focusable="false">${inner}</svg>`;
const shadow = (m, cx, cy, rx, ry) => m.softEll(cx, cy, rx, ry, m.P.shadow || "rgba(0,0,0,.10)", 0, m.P.soft3d ? 'filter="url(#blur)"' : "");

const MOTIFS = {
  croissant(m) {
    const { P } = m;
    const cx = 120, cy = 150, R = 72;
    const lobes = [[-82, 14, 19], [82, 14, 19], [-60, 20, 26], [60, 20, 26], [-34, 26, 32], [34, 26, 32], [-12, 30, 36], [12, 30, 36], [0, 31, 38]];
    let out = shadow(m, 120, 190, 82, 11);
    for (const [a, rx, ry] of lobes) {
      const rad = (a * Math.PI) / 180;
      const x = cx + R * Math.sin(rad), y = cy - R * Math.cos(rad);
      out += m.ell(x, y, rx, ry, P.crust, a);
    }
    for (const [a, rx, ry] of lobes) { // a soft highlight on the upper edge and a fold line in each lobe
      const rad = (a * Math.PI) / 180;
      const x = cx + (R + ry * 0.45) * Math.sin(rad), y = cy - (R + ry * 0.45) * Math.cos(rad);
      out += m.softEll(x, y, rx * 0.55, ry * 0.22, P.light, a, 'opacity=".9"');
      const x1 = cx + (R - ry * 0.55) * Math.sin(rad), y1 = cy - (R - ry * 0.55) * Math.cos(rad);
      out += m.line(`M${f(x1 - rx * 0.4 * Math.cos(rad))} ${f(y1 - rx * 0.4 * Math.sin(rad))} q${f(rx * 0.4)} ${f(-ry * 0.25)} ${f(rx * 0.8 * Math.cos(rad))} ${f(rx * 0.8 * Math.sin(rad))}`, P.crustDark, Math.max(1.4, m.sw * 0.5));
    }
    return wrap(out, "A butter croissant");
  },

  loaf(m) {
    const { P } = m;
    let out = shadow(m, 120, 192, 92, 11);
    out += m.shape("M30 146 C30 96 72 66 120 66 C168 66 210 96 210 146 C210 176 176 190 120 190 C64 190 30 176 30 146 Z", P.crust);
    out += m.soft("M52 128 C58 98 86 80 120 78 C100 88 78 104 70 132 Z", P.light, 'opacity=".75"');
    for (const [x, y, r] of [[96, 100, -20], [128, 92, -8], [158, 104, 12]]) {
      out += `<g transform="rotate(${r} ${x} ${y})">${m.shape(`M${x - 24} ${y} Q${x} ${y - 16} ${x + 24} ${y} Q${x} ${y + 9} ${x - 24} ${y} Z`, P.cream)}</g>`;
    }
    for (const [x, y] of [[74, 150], [104, 160], [136, 162], [170, 150], [150, 132], [90, 132]]) out += m.softEll(x, y, 2, 2, P.light, 0, 'opacity=".8"');
    return wrap(out, "A sourdough loaf");
  },

  baguettes(m) {
    const { P } = m;
    let out = shadow(m, 120, 196, 90, 10);
    const one = (cx, cy, rot, fill) => {
      let g = `<g transform="rotate(${rot} ${cx} ${cy})">`;
      g += m.shape(`M${cx - 92} ${cy} q0 -19 19 -19 h146 q19 0 19 19 q0 19 -19 19 h-146 q-19 0 -19 -19 Z`, fill);
      for (let i = 0; i < 5; i++) g += m.shape(`M${cx - 60 + i * 30} ${cy - 8} l18 -4 l-6 16 Z`, P.cream);
      g += m.soft(`M${cx - 78} ${cy - 11} h130`, "none") + m.line(`M${cx - 80} ${cy - 13} h140`, P.light, 3, 'opacity=".7"');
      return g + "</g>";
    };
    out += one(112, 168, -18, P.crustDark || P.crust) + one(120, 130, -18, P.crust) + one(128, 92, -18, P.crust);
    return wrap(out, "Fresh baguettes");
  },

  cupcake(m) {
    const { P } = m;
    let out = shadow(m, 120, 204, 62, 8);
    out += m.shape("M72 138 H168 L154 204 Q120 212 86 204 Z", P.accent2);
    for (const x of [92, 106, 120, 134, 148]) out += m.line(`M${x} 142 L${x < 120 ? x + 1 : x - 1} 202`, P.light, 2.4, 'opacity=".7"');
    out += m.ell(120, 134, 56, 20, P.cream);
    out += m.ell(120, 112, 44, 19, P.light);
    out += m.ell(120, 91, 31, 16, P.cream);
    out += m.shape("M104 84 Q120 50 132 80 Q124 70 116 74 Z", P.light);
    out += m.softEll(120, 68, 10, 10, P.accent, 0, "");
    if (m.sw) out += `<circle cx="120" cy="68" r="10" fill="none" stroke="${P.ink}" stroke-width="${m.sw}"/>`;
    out += m.line("M122 60 q6 -12 14 -14", P.ink, Math.max(2, m.sw * 0.7));
    for (const [x, y, r, c] of [[96, 130, 30, P.accent], [138, 124, -40, P.accent2], [112, 110, 70, P.accent2], [128, 104, 10, P.accent], [102, 92, -20, P.accent], [138, 90, 50, P.accent2]]) out += `<rect x="${x}" y="${y}" width="9" height="3.6" rx="1.8" fill="${c}" transform="rotate(${r} ${x + 4} ${y + 2})"/>`;
    return wrap(out, "A frosted cupcake");
  },

  slice(m) {
    const { P } = m;
    let out = shadow(m, 120, 198, 88, 12);
    out += m.ell(120, 190, 92, 15, P.plate || P.cream);
    out += m.shape("M170 130 L206 112 V170 L170 190 Z", P.crustDark || P.crust);
    out += m.shape("M58 130 H170 V190 H58 Z", P.crust);
    out += m.soft("M58 150 H170 V160 H58 Z", P.cream);
    out += m.line("M58 150 H170 M58 160 H170", P.ink, m.sw || 0.01, m.sw ? "" : 'opacity="0"');
    out += m.shape("M58 130 L94 112 H206 L170 130 Z", P.light);
    out += m.shape("M58 130 q10 20 18 2 q6 14 14 0 q8 18 16 0 q8 12 16 -2 q8 14 16 0 q6 -2 12 0 V130 Z", P.accent2);
    out += m.softEll(138, 108, 9, 9, P.accent);
    if (m.sw) out += `<circle cx="138" cy="108" r="9" fill="none" stroke="${P.ink}" stroke-width="${m.sw}"/>`;
    out += m.line("M140 100 q5 -10 13 -12", P.ink, Math.max(2, m.sw * 0.7));
    return wrap(out, "A slice of layer cake");
  },

  coffee(m) {
    const { P } = m;
    let out = shadow(m, 120, 202, 84, 9);
    out += m.ell(120, 190, 84, 15, P.cream);
    out += m.shape("M184 112 q34 -4 30 22 q-4 24 -42 22", P.cream, 'fill="none"');
    out += m.shape("M184 112 q22 -2 20 16 q-2 14 -28 14", "none");
    out += m.shape("M58 100 H182 Q182 176 120 184 Q58 176 58 100 Z", P.accent2);
    out += m.ell(120, 100, 62, 13, P.crustDark || P.crust);
    out += m.softEll(120, 100, 40, 6, P.crust, 0, 'opacity=".85"');
    out += m.soft("M72 114 Q72 150 96 168 Q80 150 80 118 Z", P.light, 'opacity=".6"');
    for (const [x, d] of [[98, 0], [124, 10], [150, 0]]) out += m.line(`M${x} 74 q-9 -10 0 -20 q9 -10 0 -20`.replace(/q-9 -10 0 -20/, d ? "q9 -10 0 -20" : "q-9 -10 0 -20"), P.ink, Math.max(2, m.sw * 0.7), 'opacity=".6"');
    return wrap(out, "A cup of coffee");
  },

  roll(m) {
    const { P } = m;
    let out = shadow(m, 120, 196, 84, 10);
    out += m.ell(120, 130, 82, 66, P.crust);
    let d = "";
    for (let i = 0; i <= 60; i++) { // a spiral of cinnamon
      const t = (i / 60) * Math.PI * 4.2, r = 5 + t * 4.2;
      d += (i ? "L" : "M") + f(120 + r * Math.cos(t) * 1.16) + " " + f(130 + r * Math.sin(t) * 0.92);
    }
    out += m.line(d, P.crustDark || P.ink, Math.max(3, m.sw * 1.4), 'opacity=".85"');
    out += m.line(d, P.light, 2, 'opacity=".7" transform="translate(0,-2)"');
    out += m.soft("M70 106 q20 -14 36 -2 q14 -18 34 -4 q22 -10 34 8 q-12 12 -28 4 q-12 14 -30 2 q-22 10 -46 -8 Z", P.cream, 'opacity=".95"');
    return wrap(out, "A cinnamon roll");
  },

  wheat(m) {
    const { P } = m;
    let out = m.line("M120 214 C118 170 122 110 120 52", P.ink, Math.max(3, m.sw * 1.1));
    const grain = (x, y, rot) => m.ell(x, y, 8.6, 17, P.crust, rot);
    for (let i = 0; i < 6; i++) {
      const y = 62 + i * 22;
      out += grain(120 - 15, y + 8, -32) + grain(120 + 15, y + 8, 32);
    }
    out += grain(120, 38, 0);
    out += m.line("M120 22 V4 M110 28 L100 10 M130 28 L140 10", P.ink, 2.2);
    out += m.line("M120 214 q-26 -10 -44 -34 M120 196 q22 -6 38 -26", P.ink, Math.max(2.4, m.sw), P.accent ? "" : "");
    return wrap(out, "A stalk of wheat");
  },
};

/** Styles: a template gives its own palette; these add the drawing rules. */
function art(name, P) {
  const fn = MOTIFS[name];
  if (!fn) throw new Error("unknown art motif: " + name);
  const m = maker(P, name + "-");
  let svg = fn(m);
  if (P.soft3d) m.defs.push('<filter id="blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>');
  if (m.defs.length) svg = svg.replace('focusable="false">', `focusable="false"><defs>${m.defs.join("")}</defs>`);
  return svg;
}

/** Other industries add their own motifs (templates/_src/illustrations-animals.js) with the same helpers. */
const register = (more) => Object.assign(MOTIFS, more);
module.exports = { art, MOTIFS: Object.keys(MOTIFS), register, kit: { f, wrap, shadow, hexMix } };

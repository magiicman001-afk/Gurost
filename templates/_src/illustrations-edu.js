"use strict";
/**
 * Original vector art for the tutoring and education templates (soft 3D look, plain SVG, nothing borrowed). Motifs: book, pencil,
 * atom, calc (calculator), trophy, backpack. Paper, brass and graphite are fixed colours; the palette tints covers, bags and keys.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", PAPER = "#FBF8F1", PAPER2 = "#E6E0D0", BRASS = "#C99A3E", BRASS2 = "#EBC56E", WOOD = "#E7B979", GRAPH = "#3A3F4A", GRAPH2 = "#6C7482";

register({
  book(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 86, 7);
    o += m.shape("M46 44 H170 Q180 44 180 54 V190 Q180 200 170 200 H46 Q38 200 38 192 V52 Q38 44 46 44 Z", P.accent);
    o += m.shape("M38 52 H56 V200 H46 Q38 200 38 192 Z", P.crustDark, 'opacity=".35"');
    o += m.shape("M184 52 H196 V196 H184 Z", PAPER2) + m.line("M186 62 V190 M190 62 V190", WHITE, 1.6);
    o += m.shape("M74 70 H156 V104 H74 Z", P.accent2) + m.line("M84 120 H146 M84 134 H132", WHITE, 4, 'opacity=".8"');
    o += m.shape("M142 200 H156 V222 L149 214 L142 222 Z", P.accent2) + m.softEll(66, 120, 3, 56, WHITE, 0, 'opacity=".35"');
    return wrap(o, "A hardback book");
  },

  pencil(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 84, 6);
    o += `<g transform="rotate(-42 120 120)">`;
    o += m.shape("M98 40 H142 V176 H98 Z", P.accent) + m.shape("M98 40 H112 V176 H98 Z", WHITE, 'opacity=".28"');
    o += m.shape("M98 176 L120 214 L142 176 Z", WOOD) + m.shape("M112 200 L120 214 L128 200 Z", GRAPH);
    o += m.shape("M96 28 H144 V42 H96 Z", BRASS) + m.shape("M96 28 H144 V32 H96 Z", BRASS2) + m.shape("M100 12 H140 Q144 12 144 20 V28 H96 V20 Q96 12 100 12 Z", "#E88C9C");
    o += `</g>`;
    return wrap(o, "A pencil");
  },

  atom(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 6);
    o += `<g fill="none" stroke="${P.accent}" stroke-width="5">`;
    o += `<ellipse cx="120" cy="116" rx="86" ry="30" transform="rotate(0 120 116)"/><ellipse cx="120" cy="116" rx="86" ry="30" transform="rotate(60 120 116)"/><ellipse cx="120" cy="116" rx="86" ry="30" transform="rotate(-60 120 116)"/></g>`;
    o += m.ell(120, 116, 22, 22, P.accent2) + m.softEll(112, 108, 7, 7, WHITE, 0, 'opacity=".7"');
    o += m.ell(206, 116, 9, 9, P.crustDark) + m.ell(77, 41, 9, 9, P.crustDark) + m.ell(77, 191, 9, 9, P.crustDark);
    return wrap(o, "An atom");
  },

  calc(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 7);
    o += m.shape("M62 28 H178 Q190 28 190 40 V204 Q190 214 178 214 H62 Q50 214 50 204 V40 Q50 28 62 28 Z", GRAPH);
    o += m.shape("M66 44 H174 V84 H66 Z", "#CFE7D6") + m.line("M150 66 H166", GRAPH, 5);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o += m.shape(`M${70 + c * 27} ${98 + r * 27} h20 q4 0 4 4 v16 q0 4 -4 4 h-20 q-4 0 -4 -4 v-16 q0 -4 4 -4 z`, c === 3 ? P.accent : GRAPH2);
    o += m.softEll(58, 120, 3, 70, WHITE, 0, 'opacity=".18"');
    return wrap(o, "A calculator");
  },

  trophy(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 7);
    o += m.shape("M78 40 H162 Q162 120 120 140 Q78 120 78 40 Z", BRASS) + m.shape("M78 40 H96 Q98 112 120 140 Q78 120 78 40 Z", BRASS2, 'opacity=".6"');
    o += `<path d="M78 56 Q42 56 46 92 Q50 112 84 112" fill="none" stroke="${BRASS}" stroke-width="9" stroke-linecap="round"/><path d="M162 56 Q198 56 194 92 Q190 112 156 112" fill="none" stroke="${BRASS}" stroke-width="9" stroke-linecap="round"/>`;
    o += m.shape("M112 140 H128 V176 H112 Z", BRASS) + m.ell(120, 144, 14, 8, BRASS2);
    o += m.shape("M84 176 H156 V190 H84 Z", BRASS2) + m.shape("M68 190 H172 V212 H68 Z", P.accent) + m.shape("M96 196 H144 V206 H96 Z", P.accent2, 'opacity=".8"');
    o += m.ell(120, 82, 14, 14, WHITE, 0, 'opacity=".9"') + m.softEll(96, 66, 5, 20, WHITE, 0, 'opacity=".5"');
    return wrap(o, "A winner's trophy");
  },

  backpack(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 76, 7);
    o += m.shape("M98 28 Q98 14 120 14 Q142 14 142 28 V38 H134 V28 Q134 22 120 22 Q106 22 106 28 V38 H98 Z", P.crustDark);
    o += m.shape("M58 60 Q58 34 90 34 H150 Q182 34 182 60 V206 Q182 216 172 216 H68 Q58 216 58 206 Z", P.accent);
    o += m.shape("M72 138 H168 V200 Q168 206 162 206 H78 Q72 206 72 200 Z", P.accent2, 'opacity=".9"') + m.line("M72 138 H168", P.crustDark, 3);
    o += m.shape("M104 150 H136 V166 H104 Z", P.crustDark, 'opacity=".5"') + m.ell(120, 158, 4, 4, WHITE);
    o += m.shape("M72 66 H168 Q172 66 172 70 V118 H68 V70 Q68 66 72 66 Z", P.accent, 'opacity=".0"') + m.line("M88 70 V118 M152 70 V118", P.crustDark, 4, 'opacity=".25"');
    o += m.softEll(70, 100, 4, 44, WHITE, 0, 'opacity=".35"');
    return wrap(o, "A school backpack");
  },
});

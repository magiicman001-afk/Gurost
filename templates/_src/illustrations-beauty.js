"use strict";
/**
 * Original vector art for the beauty and tanning salon templates (same soft 3D look as the bakery and sanctuary art, plain SVG,
 * nothing borrowed). Motifs: scissors, polish, lipstick, sun, mirror, flower. Metals and glass are set here so each piece looks
 * right on any palette; the palette only tints the accent parts.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const INK = "#2A1522", WHITE = "#FFFFFF", GOLD = "#D9B25A", GOLD2 = "#A67C2E", STEEL = "#D2D9E2", STEEL2 = "#9AA6B5";
/** A ring (outer minus inner ellipse) as one even-odd path. */
const ring = (cx, cy, rx, ry, rx2, ry2) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z M${cx - rx2} ${cy} a${rx2} ${ry2} 0 1 0 ${2 * rx2} 0 a${rx2} ${ry2} 0 1 0 ${-2 * rx2} 0 Z`;

register({
  scissors(m) {
    const { P } = m;
    let o = shadow(m, 120, 226, 70, 8);
    o += m.shape("M98 168 L172 34 L184 42 L112 180 Z", STEEL);
    o += m.shape("M142 168 L68 34 L56 42 L128 180 Z", STEEL2);
    o += m.line("M108 160 L170 44", WHITE, 2.4, 'opacity=".7"');
    o += m.shape(ring(92, 200, 24, 27, 14, 17), P.accent, 'fill-rule="evenodd"');
    o += m.shape(ring(148, 200, 24, 27, 14, 17), P.accent, 'fill-rule="evenodd"');
    o += m.softEll(80, 184, 8, 5, WHITE, -40, 'opacity=".5"') + m.softEll(136, 184, 8, 5, WHITE, -40, 'opacity=".5"');
    o += m.ell(120, 142, 8, 8, GOLD) + m.softEll(118, 139, 2.6, 2.6, WHITE);
    return wrap(o, "A pair of hairdressing scissors");
  },

  polish(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 66, 8);
    o += m.shape("M84 118 H156 Q170 118 170 132 V196 Q170 218 148 218 H92 Q70 218 70 196 V132 Q70 118 84 118 Z", P.accent);
    o += m.softEll(94, 150, 8, 28, WHITE, 0, 'opacity=".38"');
    o += m.softEll(120, 205, 36, 6, P.accent2, 0, 'opacity=".55"');
    o += m.shape("M104 96 H136 V120 H104 Z", INK);
    o += m.shape("M99 26 H141 Q148 26 148 34 V98 H92 V34 Q92 26 99 26 Z", INK);
    o += m.line("M99 74 H141 M99 82 H141", GOLD, 3);
    o += m.softEll(106, 52, 4, 18, WHITE, 0, 'opacity=".25"');
    return wrap(o, "A bottle of nail polish");
  },

  lipstick(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 56, 8);
    o += m.shape("M88 152 H152 V204 Q152 216 140 216 H100 Q88 216 88 204 Z", GOLD);
    o += m.softEll(100, 184, 5, 24, WHITE, 0, 'opacity=".4"');
    o += m.shape("M92 128 H148 V152 H92 Z", INK);
    o += m.shape("M104 128 V80 Q104 64 118 58 L140 48 Q148 46 148 56 V128 Z", P.accent);
    o += m.softEll(114, 96, 4, 20, WHITE, 0, 'opacity=".3"');
    o += m.line("M92 128 H148", GOLD2, 2.4);
    return wrap(o, "A lipstick");
  },

  sun(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 62, 7);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180, long = i % 2 === 0;
      const x1 = 120 + Math.sin(a) * 66, y1 = 118 - Math.cos(a) * 66, x2 = 120 + Math.sin(a) * (long ? 102 : 90), y2 = 118 - Math.cos(a) * (long ? 102 : 90);
      o += m.line(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, P.accent2, long ? 9 : 6);
    }
    o += m.ell(120, 118, 54, 54, "#F7B733");
    o += m.softEll(100, 96, 20, 12, WHITE, -35, 'opacity=".5"');
    o += m.softEll(132, 150, 30, 14, "#F0902A", -20, 'opacity=".45"');
    return wrap(o, "A glowing sun");
  },

  mirror(m) {
    let o = shadow(m, 120, 226, 52, 7);
    o += m.shape("M108 168 H132 L136 212 Q120 226 104 212 Z", GOLD);
    o += m.ell(120, 100, 66, 76, GOLD);
    o += m.ell(120, 100, 53, 63, "#E4F0F6");
    o += m.softEll(98, 70, 16, 34, WHITE, 22, 'opacity=".65"');
    o += m.softEll(142, 136, 22, 10, "#BBD7E6", -30, 'opacity=".7"');
    o += m.softEll(86, 56, 6, 20, WHITE, 28, 'opacity=".35"');
    return wrap(o, "A hand mirror");
  },

  flower(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 54, 7);
    o += m.shape("M120 226 Q118 180 120 150", "#6FA77A", 'stroke-width="0"') + m.line("M120 226 Q116 180 120 140", "#5E9669", 7);
    o += m.shape("M120 200 Q84 190 76 160 Q112 160 120 200 Z", "#7DB487") + m.shape("M120 190 Q158 182 168 152 Q130 150 120 190 Z", "#7DB487");
    for (let i = 0; i < 6; i++) o += m.ell(120, 62, 22, 44, i % 2 ? P.accent2 : P.accent, i * 60, "").replace(/transform="rotate\(([\d.-]+) 120 62\)"/, `transform="rotate($1 120 112)"`);
    o += m.ell(120, 112, 16, 16, GOLD) + m.softEll(115, 107, 5, 5, WHITE, 0, 'opacity=".6"');
    return wrap(o, "A flower");
  },
});

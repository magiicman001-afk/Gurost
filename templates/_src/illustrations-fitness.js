"use strict";
/**
 * Original vector art for the gym and fitness templates (same soft 3D look as the other industries, plain SVG, nothing borrowed).
 * Motifs: dumbbell, bolt, lotus, kettlebell, stopwatch, glove. Steel and ink are fixed so each piece reads on any palette; the
 * palette tints the accent parts.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const INK = "#161A1F", WHITE = "#FFFFFF", STEEL = "#D5DBE3", STEEL2 = "#98A3B2", GOLD = "#E9B949";

register({
  dumbbell(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 92, 8);
    o += m.shape("M52 112 H188 V130 H52 Z", STEEL2) + m.line("M56 116 H184", WHITE, 2.4, 'opacity=".6"');
    o += m.shape("M44 82 Q44 74 52 74 H68 Q76 74 76 82 V160 Q76 168 68 168 H52 Q44 168 44 160 Z", P.accent);
    o += m.shape("M164 82 Q164 74 172 74 H188 Q196 74 196 82 V160 Q196 168 188 168 H172 Q164 168 164 160 Z", P.accent);
    o += m.shape("M78 92 Q78 86 84 86 H96 Q102 86 102 92 V150 Q102 156 96 156 H84 Q78 156 78 150 Z", INK);
    o += m.shape("M138 92 Q138 86 144 86 H156 Q162 86 162 92 V150 Q162 156 156 156 H144 Q138 156 138 150 Z", INK);
    o += m.softEll(52, 100, 3.6, 20, WHITE, 0, 'opacity=".45"') + m.softEll(172, 100, 3.6, 20, WHITE, 0, 'opacity=".45"');
    return wrap(o, "A dumbbell");
  },

  bolt(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 54, 7);
    o += m.shape("M148 14 L62 132 H112 L90 226 L180 100 H130 Z", P.accent);
    o += m.softEll(104, 90, 5, 34, WHITE, 28, 'opacity=".4"');
    return wrap(o, "A lightning bolt");
  },

  lotus(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 70, 8);
    const petal = (a, fill) => m.ell(120, 128, 20, 58, fill, a, "").replace(/transform="rotate\(([\d.-]+) 120 128\)"/, `transform="rotate($1 120 190)"`);
    o += petal(-62, P.accent2) + petal(62, P.accent2) + petal(-31, P.accent) + petal(31, P.accent) + petal(0, P.accent2);
    o += m.ell(120, 190, 34, 14, "#6FA77A") + m.softEll(112, 108, 5, 24, WHITE, 0, 'opacity=".4"');
    o += m.ell(120, 196, 54, 9, "#5E9669", 0, 'opacity=".55"');
    return wrap(o, "A lotus flower");
  },

  kettlebell(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 70, 8);
    o += m.shape("M78 112 Q78 38 120 38 Q162 38 162 112 H142 Q142 62 120 62 Q98 62 98 112 Z", INK);
    o += m.ell(120, 156, 66, 62, P.accent);
    o += m.shape("M82 196 Q120 214 158 196 Q150 220 120 222 Q90 220 82 196 Z", P.accent2, 'opacity=".5"');
    o += m.softEll(94, 134, 11, 28, WHITE, 18, 'opacity=".45"');
    o += m.ell(120, 160, 22, 22, INK) + m.shape("M110 160 H130", INK, 'stroke-width="0"');
    o += m.softEll(113, 153, 5, 5, WHITE, 0, 'opacity=".4"');
    return wrap(o, "A kettlebell");
  },

  stopwatch(m) {
    const { P } = m;
    let o = shadow(m, 120, 226, 62, 7);
    o += m.shape("M106 20 H134 V44 H106 Z", INK) + m.shape("M154 54 L170 40 L182 52 L166 68 Z", INK);
    o += m.ell(120, 134, 82, 82, P.accent) + m.ell(120, 134, 66, 66, WHITE);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180, r1 = 52, r2 = i % 3 === 0 ? 40 : 46;
      o += m.line(`M${(120 + Math.sin(a) * r1).toFixed(1)} ${(134 - Math.cos(a) * r1).toFixed(1)} L${(120 + Math.sin(a) * r2).toFixed(1)} ${(134 - Math.cos(a) * r2).toFixed(1)}`, INK, i % 3 === 0 ? 3.4 : 2);
    }
    o += m.line("M120 134 L120 92", INK, 4.4) + m.line("M120 134 L152 150", P.accent, 4.4);
    o += m.ell(120, 134, 7, 7, INK);
    o += m.softEll(86, 96, 22, 10, WHITE, -35, 'opacity=".55"');
    return wrap(o, "A stopwatch");
  },

  glove(m) {
    const { P } = m;
    let o = shadow(m, 120, 226, 62, 7);
    o += m.shape("M68 112 Q66 46 128 44 Q188 44 190 104 Q192 150 170 170 V204 Q170 216 158 216 H102 Q90 216 90 204 V172 Q70 160 68 112 Z", P.accent);
    o += m.ell(92, 128, 22, 32, P.accent2, -18, 'opacity=".7"');
    o += m.shape("M90 190 H170 V214 Q170 218 160 218 H100 Q90 218 90 212 Z", WHITE) + m.line("M90 192 H170", STEEL2, 2);
    o += m.line("M118 70 Q150 66 168 82", P.accent2, 4, 'opacity=".6"');
    o += m.softEll(134, 72, 18, 7, WHITE, -8, 'opacity=".5"');
    return wrap(o, "A boxing glove");
  },
});

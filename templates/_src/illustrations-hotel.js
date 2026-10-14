"use strict";
/**
 * Original vector art for the hotel and travel templates (soft 3D look, plain SVG, nothing borrowed). Motifs: bed, suitcase, compass,
 * lamp, boat, shell. Linen, brass and wood are fixed colours; the palette tints blankets, cases and sails.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", LINEN = "#F7F2E8", LINEN2 = "#E3DAC8", BRASS = "#C99A3E", BRASS2 = "#EBC56E", WOOD = "#8A5A3A", WOOD2 = "#B07A52", SEA = "#6FB3C8", STEEL2 = "#8E98A6";

register({
  bed(m) {
    const { P } = m;
    let o = shadow(m, 120, 216, 94, 8);
    o += m.shape("M30 70 H210 V190 H30 Z", WOOD) + m.shape("M30 70 H210 V84 H30 Z", WOOD2);
    o += m.shape("M30 128 H210 V196 H30 Z", LINEN2) + m.shape("M30 124 H210 Q214 124 214 132 V168 H26 V132 Q26 124 30 124 Z", P.accent);
    o += m.shape("M26 156 H214 V176 H26 Z", P.crustDark, 'opacity=".25"');
    o += m.shape("M40 98 H104 Q112 98 112 106 V124 H32 V106 Q32 98 40 98 Z", WHITE) + m.shape("M128 98 H192 Q200 98 200 106 V124 H120 V106 Q120 98 128 98 Z", LINEN);
    o += m.shape("M26 190 H42 V210 H26 Z", WOOD) + m.shape("M198 190 H214 V210 H198 Z", WOOD);
    o += m.softEll(70, 106, 22, 3.4, WHITE, 0, 'opacity=".6"');
    return wrap(o, "A made-up hotel bed");
  },

  suitcase(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 84, 7);
    o += m.shape("M92 60 Q92 36 120 36 Q148 36 148 60 H140 Q140 46 120 46 Q100 46 100 60 Z", STEEL2);
    o += m.shape("M44 62 H196 Q206 62 206 72 V196 Q206 206 196 206 H44 Q34 206 34 196 V72 Q34 62 44 62 Z", P.accent);
    o += m.shape("M44 62 H196 Q206 62 206 72 H34 Q34 62 44 62 Z", P.accent2, 'opacity=".4"');
    o += m.shape("M72 62 H82 V206 H72 Z", BRASS) + m.shape("M158 62 H168 V206 H158 Z", BRASS);
    o += m.shape("M104 110 H136 V128 H104 Z", BRASS2) + m.line("M110 119 H130", BRASS, 3);
    o += m.ell(100, 168, 11, 11, LINEN) + m.ell(146, 160, 9, 9, SEA);
    o += m.softEll(52, 130, 3, 40, WHITE, 0, 'opacity=".4"') + m.shape("M54 206 H70 V214 H54 Z", P.crustDark) + m.shape("M170 206 H186 V214 H170 Z", P.crustDark);
    return wrap(o, "A travel suitcase");
  },

  compass(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 82, 7);
    o += m.ell(120, 120, 92, 92, BRASS) + m.ell(120, 120, 80, 80, BRASS2) + m.ell(120, 120, 70, 70, LINEN);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, l = i % 4 === 0 ? 14 : 7; o += m.line(`M${(120 + Math.cos(a) * 68).toFixed(1)} ${(120 + Math.sin(a) * 68).toFixed(1)} L${(120 + Math.cos(a) * (68 - l)).toFixed(1)} ${(120 + Math.sin(a) * (68 - l)).toFixed(1)}`, P.crustDark, 2); }
    o += m.shape("M120 52 L132 120 L120 188 L108 120 Z", LINEN2) + m.shape("M120 52 L132 120 L108 120 Z", P.accent) + m.shape("M120 188 L132 120 L108 120 Z", P.crustDark);
    o += m.ell(120, 120, 7, 7, BRASS2) + m.shape("M112 22 H128 V32 H112 Z", BRASS) + m.softEll(80, 70, 4, 30, WHITE, 40, 'opacity=".4"');
    return wrap(o, "A brass compass");
  },

  lamp(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 62, 6);
    o += m.shape("M96 196 H144 V212 H96 Z", BRASS) + m.shape("M114 112 H126 V198 H114 Z", BRASS) + m.shape("M114 112 H119 V198 H114 Z", BRASS2);
    o += m.shape("M72 112 L92 38 H148 L168 112 Z", P.accent) + m.shape("M72 112 L92 38 H104 L90 112 Z", WHITE, 'opacity=".25"');
    o += m.shape("M76 106 H164 V112 H76 Z", BRASS2) + m.ell(120, 38, 28, 6, P.accent2) + m.ell(120, 120, 14, 14, BRASS2, 0, 'opacity=".0"');
    o += m.ell(120, 116, 10, 4, P.accent2, 0, 'opacity=".7"');
    return wrap(o, "A bedside lamp");
  },

  boat(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 90, 7);
    o += m.shape("M20 190 Q120 232 220 190 Q216 168 200 164 H40 Q24 168 20 190 Z", P.crustDark);
    o += m.shape("M34 176 H206 Q214 176 218 186 Q120 216 22 186 Q26 176 34 176 Z", WHITE);
    o += m.shape("M118 36 V160 H72 Z", LINEN) + m.shape("M124 52 V160 H178 Q166 100 124 52 Z", P.accent) + m.line("M121 28 V164", WOOD, 4);
    o += m.shape("M121 28 L141 34 L121 40 Z", P.accent2) + m.line("M24 196 Q50 206 80 196 T140 196 T210 196", SEA, 3, 'opacity=".7"');
    return wrap(o, "A little sailing boat");
  },

  shell(m) {
    const { P } = m;
    let o = shadow(m, 120, 216, 80, 6);
    o += m.shape("M120 36 Q196 40 204 130 Q206 190 140 202 Q120 206 100 202 Q34 190 36 130 Q44 40 120 36 Z", P.accent);
    for (let i = -3; i <= 3; i++) o += m.line(`M120 200 Q${120 + i * 26} 120 ${120 + i * 28} 54`, P.accent2, 3.4, 'opacity=".75"');
    o += m.shape("M96 200 H144 Q148 214 120 216 Q92 214 96 200 Z", LINEN2) + m.softEll(84, 90, 6, 30, WHITE, 24, 'opacity=".45"');
    return wrap(o, "A seashell");
  },
});

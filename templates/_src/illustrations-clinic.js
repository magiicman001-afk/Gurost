"use strict";
/**
 * Original vector art for the dental and health clinic templates (soft 3D look, plain SVG, nothing borrowed). Motifs: tooth, brush,
 * smile, chair, shield, plant. Enamel, bristles and metal are fixed colours; the palette tints handles, cushions and badges.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", ENAMEL = "#F7FAFB", ENAMEL2 = "#DDE8EC", STEEL = "#D7DDE5", STEEL2 = "#9AA5B3", GUM = "#F2A7A0", GUM2 = "#E0867F", LEAF = "#5E9B5A", LEAF2 = "#7DB874", POT = "#C97B4A";

register({
  tooth(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 74, 8);
    o += m.shape("M56 62 Q56 32 90 38 Q108 42 120 40 Q132 42 150 38 Q184 32 184 62 Q184 96 168 122 Q160 150 156 190 Q154 208 142 208 Q130 208 128 176 Q124 150 120 150 Q116 150 112 176 Q110 208 98 208 Q86 208 84 190 Q80 150 72 122 Q56 96 56 62 Z", ENAMEL);
    o += m.shape("M56 62 Q56 32 90 38 Q76 60 80 100 Q82 130 90 160 Q86 150 84 190 Q80 150 72 122 Q56 96 56 62 Z", ENAMEL2, 'opacity=".7"');
    o += m.softEll(86, 64, 9, 20, WHITE, 14, 'opacity=".9"') + m.softEll(152, 58, 6, 10, WHITE, -10, 'opacity=".6"');
    o += m.shape("M112 50 Q120 60 128 50 Q120 70 112 50 Z", ENAMEL2);
    o += m.ell(180, 40, 7, 7, P.accent2) + m.line("M173 40 H187 M180 33 V47", WHITE, 3);
    return wrap(o, "A healthy tooth");
  },

  brush(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 7);
    o += `<g transform="rotate(32 120 120)">`;
    o += m.shape("M104 120 H136 V200 Q136 214 120 214 Q104 214 104 200 Z", P.accent) + m.shape("M104 120 H114 V212 Q104 208 104 200 Z", P.crustDark, 'opacity=".4"');
    o += m.shape("M108 70 H132 V124 H108 Z", P.accent);
    o += m.shape("M98 22 H142 Q146 22 146 28 V72 Q146 76 142 76 H98 Q94 76 94 72 V28 Q94 22 98 22 Z", WHITE);
    for (let i = 0; i < 6; i++) o += m.shape(`M${100 + i * 7} 8 h4 v18 h-4 Z`, i % 2 ? P.accent2 : P.accent);
    o += m.softEll(112, 150, 3, 30, WHITE, 0, 'opacity=".5"');
    o += `</g>`;
    o += m.ell(54, 60, 10, 10, P.accent2, 0, 'opacity=".5"') + m.ell(34, 90, 6, 6, P.accent2, 0, 'opacity=".4"') + m.ell(72, 36, 5, 5, WHITE, 0, 'opacity=".9"');
    return wrap(o, "A toothbrush");
  },

  smile(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 90, 8);
    o += m.ell(120, 116, 98, 92, WHITE) + m.ell(120, 116, 88, 82, P.light);
    o += m.shape("M52 104 Q120 188 188 104 Q184 156 120 168 Q56 156 52 104 Z", GUM2) + m.shape("M60 106 Q120 176 180 106 Q172 142 120 150 Q68 142 60 106 Z", "#FFFFFF");
    for (let i = 0; i < 6; i++) o += m.line(`M${80 + i * 16} ${116 + (i < 3 ? i : 5 - i) * 8} V${142 + (i < 3 ? i : 5 - i) * 6}`, ENAMEL2, 2.4);
    o += m.ell(86, 80, 11, 8, P.accent, 0, 'opacity=".22"') + m.ell(154, 80, 11, 8, P.accent, 0, 'opacity=".22"');
    o += m.ell(92, 78, 8, 10, P.crustDark) + m.ell(148, 78, 8, 10, P.crustDark) + m.softEll(90, 74, 2.4, 3, WHITE, 0, 'opacity=".9"') + m.softEll(146, 74, 2.4, 3, WHITE, 0, 'opacity=".9"');
    o += m.softEll(78, 56, 24, 7, WHITE, -20, 'opacity=".5"');
    return wrap(o, "A happy smile");
  },

  chair(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 92, 8);
    o += m.shape("M58 196 H182 V210 H58 Z", STEEL) + m.shape("M112 150 H128 V198 H112 Z", STEEL2);
    o += m.shape("M44 120 Q44 100 66 100 H150 Q176 100 184 128 L190 150 Q192 160 180 160 H62 Q44 160 44 140 Z", P.accent) + m.shape("M44 120 Q44 100 66 100 H96 Q64 112 62 160 H62 Q44 160 44 140 Z", P.crustDark, 'opacity=".35"');
    o += m.shape("M150 100 Q170 60 176 34 Q190 36 192 50 Q190 90 176 124 Z", P.accent) + m.shape("M162 52 H190 V76 H162 Z", P.crustDark, 'opacity=".4"');
    o += m.softEll(96, 112, 30, 5, WHITE, 0, 'opacity=".45"');
    o += m.line("M60 100 Q40 60 70 42 Q94 30 112 46", STEEL2, 5) + m.shape("M104 38 H130 V52 H104 Z", WHITE) + m.shape("M104 38 H116 V52 H104 Z", ENAMEL2) + m.ell(118, 58, 22, 5, P.accent2, 0, 'opacity=".7"');
    return wrap(o, "A dental treatment chair");
  },

  shield(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 70, 7);
    o += m.shape("M120 28 L196 52 V112 Q196 172 120 212 Q44 172 44 112 V52 Z", P.accent) + m.shape("M120 28 L44 52 V112 Q44 172 120 212 Z", P.crustDark, 'opacity=".4"');
    o += m.shape("M120 44 L180 62 V110 Q180 160 120 194 Q60 160 60 110 V62 Z", WHITE);
    o += m.shape("M108 80 H132 V102 H154 V126 H132 V148 H108 V126 H86 V102 H108 Z", P.accent2) + m.shape("M108 80 H120 V148 H108 Z", WHITE, 'opacity=".35"');
    o += m.softEll(84, 70, 6, 24, WHITE, 18, 'opacity=".55"');
    return wrap(o, "A protective health shield");
  },

  plant(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 62, 7);
    o += m.shape("M88 160 H152 L144 214 H96 Z", POT) + m.shape("M84 152 H156 V166 H84 Z", "#DE9566");
    o += m.shape("M120 152 Q96 110 84 70 Q112 90 120 152 Z", LEAF) + m.shape("M120 152 Q140 100 156 60 Q134 96 120 152 Z", LEAF2);
    o += m.shape("M120 152 Q108 90 118 36 Q132 90 120 152 Z", LEAF) + m.shape("M120 152 Q70 130 56 104 Q94 112 120 152 Z", LEAF2) + m.shape("M120 152 Q170 130 184 108 Q148 112 120 152 Z", LEAF);
    o += m.softEll(96, 188, 4, 18, WHITE, 8, 'opacity=".4"') + m.softEll(114, 54, 3, 14, WHITE, 6, 'opacity=".4"');
    return wrap(o, "A house plant");
  },
});

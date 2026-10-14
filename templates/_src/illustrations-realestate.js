"use strict";
/**
 * Original vector art for the estate agent templates (soft 3D look, plain SVG, nothing borrowed). Motifs: key, flat, sign, villa,
 * door, plant. Glass, brick and metal are fixed colours; the palette tints roofs, doors and signs.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", STEEL = "#D7DDE5", STEEL2 = "#9AA5B3", GLASS = "#DDEBF3", BRASS = "#D9A441", BRASS2 = "#F0C569", BRICK = "#B9563A", LEAF = "#5E9B5A", LEAF2 = "#7DB874", POT = "#C97B4A";

register({
  key(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 84, 8);
    o += `<g transform="rotate(-40 120 120)">`;
    o += m.ell(120, 56, 40, 40, BRASS) + m.ell(120, 56, 20, 20, "#FFF6E0") + m.softEll(104, 42, 12, 6, WHITE, -30, 'opacity=".6"');
    o += m.shape("M110 92 H130 V196 H110 Z", BRASS) + m.shape("M110 92 H118 V196 H110 Z", BRASS2);
    o += m.shape("M130 150 H152 V162 H130 Z", BRASS) + m.shape("M130 174 H146 V186 H130 Z", BRASS) + m.shape("M130 124 H142 V134 H130 Z", BRASS);
    o += `</g>`;
    o += m.shape("M156 26 H214 V70 H156 Z", P.accent) + m.shape("M156 26 H214 V36 H156 Z", P.crustDark);
    o += m.ell(170, 50, 6, 6, WHITE);
    return wrap(o, "A house key on a tag");
  },

  flat(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 76, 7);
    o += m.shape("M72 50 H168 V204 H72 Z", WHITE) + m.shape("M72 50 H92 V204 H72 Z", "#E3E6EB");
    o += m.shape("M64 44 H176 V54 H64 Z", P.accent);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) { const x = 86 + c * 26, y = 66 + r * 26; o += m.shape(`M${x} ${y} h16 v16 h-16 Z`, (r + c) % 4 === 0 ? P.accent2 : GLASS); }
    o += m.shape("M108 184 H132 V204 H108 Z", P.crustDark);
    o += m.softEll(80, 130, 3, 50, WHITE, 0, 'opacity=".5"');
    o += m.shape("M44 150 H72 V204 H44 Z", "#E8EAEE") + m.shape("M168 130 H196 V204 H168 Z", "#E8EAEE");
    return wrap(o, "An apartment block");
  },

  sign(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 70, 7);
    o += m.shape("M112 70 H126 V212 H112 Z", "#8C6B4E") + m.shape("M112 70 H118 V212 H112 Z", "#A8845F");
    o += m.shape("M56 48 H190 V120 H56 Z", WHITE) + m.shape("M56 48 H190 V64 H56 Z", P.accent);
    o += m.shape("M56 48 H66 V120 H56 Z", "#E3E6EB");
    o += m.line("M76 84 H170 M76 98 H150", STEEL2, 5) + m.softEll(98, 56, 20, 2.4, WHITE, 0, 'opacity=".5"');
    o += m.shape("M72 126 H174 V146 H72 Z", P.crustDark) + m.line("M84 136 H162", WHITE, 4);
    o += m.line("M126 48 V32 M104 48 V36", STEEL2, 3);
    return wrap(o, "A for-sale sign");
  },

  villa(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 98, 8);
    o += m.shape("M34 120 H206 V204 H34 Z", "#F6EBDD") + m.shape("M34 120 H54 V204 H34 Z", "#E8D9C6");
    o += m.shape("M24 124 L70 70 H170 L216 124 Z", P.crustDark) + m.shape("M24 124 L70 70 H96 L56 124 Z", P.accent, 'opacity=".5"');
    o += m.shape("M98 150 H142 V204 H98 Z", P.accent) + m.shape("M98 150 Q120 128 142 150 Z", P.crustDark) + m.ell(134, 180, 3, 3, BRASS);
    o += m.shape("M50 136 H82 V170 H50 Z", GLASS) + m.shape("M158 136 H190 V170 H158 Z", GLASS);
    o += m.line("M66 136 V170 M50 153 H82 M174 136 V170 M158 153 H190", STEEL2, 2);
    o += m.shape("M140 52 H158 V84 L140 70 Z", BRICK);
    o += m.ell(40, 196, 22, 14, LEAF) + m.ell(206, 198, 20, 12, LEAF2);
    return wrap(o, "A family house");
  },

  door(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 7);
    o += m.shape("M58 60 Q58 36 120 36 Q182 36 182 60 V212 H58 Z", "#EFE6D8") + m.shape("M58 60 Q58 36 120 36 H72 Q58 40 58 60 V212 H58 Z", "#D9CDB9");
    o += m.shape("M74 70 H166 V212 H74 Z", P.accent) + m.shape("M74 70 H90 V212 H74 Z", P.crustDark, 'opacity=".5"');
    o += m.shape("M90 86 H150 V120 H90 Z", P.crustDark, 'opacity=".55"') + m.shape("M90 132 H150 V196 H90 Z", P.crustDark, 'opacity=".4"');
    o += m.shape("M96 92 H144 V114 H96 Z", GLASS, 'opacity=".9"');
    o += m.ell(152, 150, 6, 6, BRASS) + m.ell(150, 148, 2.2, 2.2, BRASS2);
    o += m.shape("M104 52 H136 V62 H104 Z", BRASS) + m.line("M112 57 H128", P.crustDark, 2.4);
    o += m.shape("M50 212 H190 V220 H50 Z", STEEL);
    return wrap(o, "A front door");
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

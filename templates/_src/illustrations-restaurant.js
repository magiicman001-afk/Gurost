"use strict";
/**
 * Original vector art for the restaurant and bistro templates (soft 3D look, plain SVG, nothing borrowed). Motifs: cloche, wineglass,
 * pizza, cocktail, bowl, tart. Glass, steel and herbs are fixed colours; the palette tints sauces, wine, crust and fruit.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", STEEL = "#D7DDE5", STEEL2 = "#9AA5B3", GLASS = "#E8F2F7", GOLD = "#E2B14C", HERB = "#5E9B5A", HERB2 = "#78B56F", INK = "#2A1A14";

register({
  cloche(m) {
    let o = shadow(m, 120, 214, 96, 9);
    o += m.ell(120, 176, 104, 20, WHITE) + m.ell(120, 170, 86, 13, "#EEF1F5");
    o += m.shape("M38 166 Q38 66 120 66 Q202 66 202 166 Q120 184 38 166 Z", STEEL);
    o += m.shape("M38 166 Q120 184 202 166 L202 172 Q120 192 38 172 Z", STEEL2);
    o += m.softEll(84, 112, 12, 40, WHITE, 24, 'opacity=".6"') + m.softEll(160, 138, 26, 8, WHITE, -12, 'opacity=".28"');
    o += m.ell(120, 58, 11, 11, GOLD) + m.shape("M112 66 H128 L124 72 H116 Z", GOLD) + m.softEll(116, 54, 3.6, 3.6, WHITE, 0, 'opacity=".7"');
    return wrap(o, "A silver serving cloche");
  },

  wineglass(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 60, 7);
    o += m.shape("M82 26 H158 Q166 108 120 128 Q74 108 82 26 Z", GLASS, 'opacity=".95"');
    o += m.shape("M84 70 H156 Q158 108 120 122 Q82 108 84 70 Z", P.accent);
    o += m.softEll(120, 70, 36, 5, P.accent2, 0, 'opacity=".55"');
    o += m.softEll(98, 52, 5, 24, WHITE, 8, 'opacity=".7"') + m.softEll(98, 96, 3.6, 12, WHITE, 18, 'opacity=".4"');
    o += m.shape("M116 126 H124 V198 H116 Z", GLASS) + m.ell(120, 206, 42, 9, GLASS) + m.softEll(110, 204, 14, 2.6, WHITE, 0, 'opacity=".7"');
    return wrap(o, "A glass of red wine");
  },

  pizza(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 88, 9);
    o += m.ell(120, 122, 90, 90, P.crust) + m.ell(120, 122, 76, 76, P.accent);
    o += m.softEll(120, 122, 70, 70, P.light, 0, 'opacity=".82"');
    [[84, 96], [150, 88], [172, 134], [128, 160], [80, 150], [118, 118]].forEach(([x, y]) => { o += m.ell(x, y, 15, 15, P.accent) + m.softEll(x - 4, y - 4, 4, 3, WHITE, 0, 'opacity=".35"'); });
    [[104, 80, 20], [160, 112, 70], [100, 138, -30], [140, 142, 50]].forEach(([x, y, r]) => { o += m.ell(x, y, 12, 6, HERB, r) + m.softEll(x - 2, y - 2, 4, 1.6, HERB2, r, 'opacity=".8"'); });
    o += m.softEll(88, 62, 28, 9, WHITE, -30, 'opacity=".25"');
    return wrap(o, "A wood-fired pizza");
  },

  cocktail(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 62, 7);
    o += m.shape("M44 52 H196 L124 138 H116 Z", GLASS, 'opacity=".95"');
    o += m.shape("M60 68 H180 L122 130 H118 Z", P.accent2);
    o += m.softEll(120, 68, 60, 5, WHITE, 0, 'opacity=".4"') + m.softEll(82, 66, 4, 18, WHITE, -34, 'opacity=".6"');
    o += m.shape("M117 136 H123 V204 H117 Z", GLASS) + m.ell(120, 212, 44, 8, GLASS) + m.softEll(108, 210, 14, 2.4, WHITE, 0, 'opacity=".7"');
    o += m.line("M142 28 L112 98", INK, 3.2) + m.ell(118, 86, 11, 11, "#7C9A3A") + m.ell(118, 86, 4, 4, P.accent);
    return wrap(o, "A cocktail in a coupe glass");
  },

  bowl(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 90, 9);
    o += m.shape("M40 108 H200 Q200 190 120 202 Q40 190 40 108 Z", WHITE);
    o += m.shape("M40 108 H200 Q198 126 190 138 Q120 158 50 138 Q42 126 40 108 Z", P.accent, 'opacity=".25"');
    o += m.ell(120, 108, 80, 19, "#F3F4F6") + m.ell(120, 110, 70, 14, P.accent2);
    o += m.line("M82 110 Q100 100 120 110 T158 110", WHITE, 4, 'opacity=".75"') + m.softEll(100, 106, 12, 3, WHITE, 0, 'opacity=".5"');
    o += m.ell(140, 108, 8, 4, HERB, 20) + m.ell(94, 114, 6, 3, HERB2, -10);
    o += m.softEll(70, 150, 8, 28, WHITE, 18, 'opacity=".55"');
    o += m.line("M98 74 Q92 58 100 46 M122 70 Q116 52 126 38 M146 74 Q140 60 148 50", "#FFFFFF", 5, 'opacity=".5"');
    return wrap(o, "A bowl of soup");
  },

  tart(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 90, 9);
    o += m.ell(120, 178, 104, 20, WHITE);
    o += m.shape("M50 126 H190 V168 Q120 192 50 168 Z", P.crust) + m.ell(120, 126, 70, 24, P.light);
    o += m.ell(120, 124, 60, 19, P.accent2);
    [[96, 118], [124, 112], [148, 122], [112, 130], [136, 132], [86, 126], [158, 112]].forEach(([x, y]) => { o += m.ell(x, y, 9, 8, P.accent) + m.softEll(x - 2.4, y - 2.4, 2.8, 2.2, WHITE, 0, 'opacity=".55"'); });
    o += m.ell(128, 106, 6, 3, HERB, 20) + m.softEll(80, 150, 6, 18, WHITE, 8, 'opacity=".4"');
    o += m.softEll(120, 100, 40, 5, WHITE, 0, 'opacity=".25"');
    return wrap(o, "A fruit tart");
  },
});

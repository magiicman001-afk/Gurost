"use strict";
/**
 * Original vector art for the fashion and online shop templates (soft 3D look, plain SVG, nothing borrowed). Motifs: dress, tee,
 * handbag, glasses, sneaker, hat. Leather, glass and stitching are fixed colours; the palette tints cloth, straps and soles.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", BLACK = "#24262B", LEATHER = "#8A5A3C", LEATHER2 = "#6B4329", GOLD = "#D7A93E", GLASS = "#3A4658", CREAM = "#F6EFE4", SOLE = "#F3EFE8";

register({
  dress(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 70, 6);
    o += m.shape("M86 28 H102 L120 56 L138 28 H154 L148 92 Q184 150 200 214 Q120 232 40 214 Q56 150 92 92 Z", P.accent);
    o += m.shape("M86 28 H102 L98 70 L90 92 Z", WHITE, 'opacity=".14"') + m.shape("M92 92 Q120 106 148 92 L150 104 Q120 118 90 104 Z", P.accent2);
    o += m.shape("M40 214 Q56 150 92 92 L100 110 Q76 160 70 222 Q52 220 40 214 Z", P.crustDark, 'opacity=".28"');
    o += m.softEll(104, 150, 4, 40, WHITE, 8, 'opacity=".3"') + m.line("M120 106 V222", WHITE, 1.4, 'opacity=".22"');
    return wrap(o, "A dress");
  },

  tee(m) {
    const { P } = m;
    let o = shadow(m, 120, 216, 84, 7);
    o += m.shape("M82 40 Q120 62 158 40 L206 62 L190 108 L168 98 V204 H72 V98 L50 108 L34 62 Z", P.accent);
    o += m.shape("M82 40 Q120 62 158 40 Q148 78 120 78 Q92 78 82 40 Z", P.crustDark, 'opacity=".35"') + m.shape("M72 98 L50 108 L34 62 L52 54 Z", WHITE, 'opacity=".12"');
    o += m.shape("M98 120 H142 V158 H98 Z", P.accent2, 'opacity=".9"') + m.line("M104 132 H136 M104 144 H128", WHITE, 4);
    o += m.softEll(88, 140, 4, 36, WHITE, 0, 'opacity=".3"');
    return wrap(o, "A t-shirt");
  },

  handbag(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 84, 7);
    o += `<path d="M84 100 Q84 46 120 46 Q156 46 156 100" fill="none" stroke="${LEATHER2}" stroke-width="10" stroke-linecap="round"/>`;
    o += m.shape("M44 100 H196 L210 206 Q210 218 198 218 H42 Q30 218 30 206 Z", P.accent);
    o += m.shape("M44 100 H196 L198 120 H42 Z", P.crustDark, 'opacity=".3"') + m.shape("M30 206 Q30 218 42 218 H60 L48 100 H44 Z", P.crustDark, 'opacity=".28"');
    o += m.shape("M104 108 H136 V134 Q136 142 128 142 H112 Q104 142 104 134 Z", GOLD) + m.ell(120, 122, 5, 5, "#FFF1BF");
    o += m.line("M52 160 H188", WHITE, 2, 'opacity=".4"') + m.softEll(70, 160, 3, 34, WHITE, 0, 'opacity=".35"');
    return wrap(o, "A handbag");
  },

  glasses(m) {
    const { P } = m;
    let o = shadow(m, 120, 200, 90, 6);
    o += m.line("M26 112 L52 108 M214 112 L188 108", P.accent, 7);
    o += m.shape("M52 100 H112 Q122 100 120 112 L112 146 Q108 158 94 158 H70 Q56 158 54 146 Z", GLASS) + m.shape("M128 112 Q126 100 136 100 H196 L186 146 Q184 158 170 158 H146 Q132 158 128 146 Z", GLASS);
    o += m.shape("M52 100 H112 Q122 100 120 112 L120 118 H50 Z", P.accent) + m.shape("M120 112 Q126 100 136 100 H196 L196 106 L128 118 Z", P.accent);
    o += m.line("M114 106 Q124 96 134 106", P.accent, 6) + m.softEll(76, 126, 3, 18, WHITE, 24, 'opacity=".5"') + m.softEll(150, 126, 3, 18, WHITE, 24, 'opacity=".5"');
    return wrap(o, "A pair of sunglasses");
  },

  sneaker(m) {
    const { P } = m;
    let o = shadow(m, 120, 204, 92, 7);
    o += m.shape("M28 150 Q28 120 56 112 L86 66 Q92 56 104 60 L118 72 Q140 100 176 108 Q214 116 214 150 V172 H28 Z", WHITE);
    o += m.shape("M28 166 H214 V182 Q214 192 204 192 H38 Q28 192 28 182 Z", SOLE) + m.shape("M28 172 H214 V178 H28 Z", P.accent2);
    o += m.shape("M86 66 L118 72 Q132 94 150 104 L100 112 Z", P.accent) + m.shape("M28 134 Q40 124 60 122 L72 150 H28 Z", P.accent, 'opacity=".9"');
    o += m.line("M98 78 L112 86 M104 90 L118 98 M110 102 L124 108", BLACK, 3.4, 'opacity=".55"') + m.softEll(160, 128, 3, 20, P.crustDark, 70, 'opacity=".12"');
    o += m.softEll(80, 140, 3, 18, WHITE, 0, 'opacity=".6"');
    return wrap(o, "A sneaker");
  },

  hat(m) {
    const { P } = m;
    let o = shadow(m, 120, 204, 92, 7);
    o += m.ell(120, 160, 98, 30, P.crustDark, 'opacity=".25"') + m.ell(120, 152, 98, 30, CREAM);
    o += m.shape("M64 152 Q60 76 120 70 Q180 76 176 152 Q120 176 64 152 Z", CREAM) + m.shape("M64 152 Q62 112 78 90 Q72 120 82 156 Z", P.crustDark, 'opacity=".12"');
    o += m.shape("M65 138 Q120 160 175 138 L176 152 Q120 178 64 152 Z", P.accent) + m.ell(120, 100, 28, 6, WHITE, 'opacity=".4"');
    o += m.softEll(96, 100, 4, 18, WHITE, 20, 'opacity=".5"');
    return wrap(o, "A sun hat");
  },
});

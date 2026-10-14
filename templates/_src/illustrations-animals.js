"use strict";
/**
 * Original vector animals for the sanctuary templates (same soft 3D look as the bakery art, plain SVG, nothing borrowed).
 * Motifs: dog, cat, rabbit, owl, paw, heart. Fur colours are set here so each animal looks right on any palette.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const INK = "#3A2418", PINK = "#F2A3A3", WHITE = "#FFFFFF";

register({
  dog(m) {
    const { P } = m;
    const FUR = "#C98B52", EAR = "#8E5A2E", LIGHT = "#F3D5A8", CREAM = "#FFF1DC";
    let o = shadow(m, 120, 218, 72, 9);
    o += m.ell(120, 196, 54, 40, FUR);
    o += m.shape("M76 166 Q120 190 164 166 L162 180 Q120 204 78 180 Z", P.accent);
    o += m.ell(120, 194, 8, 8, "#F5C542");
    o += m.ell(64, 112, 19, 42, EAR, 12) + m.ell(176, 112, 19, 42, EAR, -12);
    o += m.ell(120, 116, 57, 53, FUR);
    o += m.softEll(120, 88, 13, 26, LIGHT, 0, 'opacity=".75"');
    o += m.ell(120, 142, 31, 25, CREAM);
    o += m.ell(120, 158, 8, 11, PINK);
    o += m.ell(96, 110, 7, 8, INK) + m.ell(144, 110, 7, 8, INK);
    o += m.softEll(98, 107, 2.5, 2.5, WHITE) + m.softEll(146, 107, 2.5, 2.5, WHITE);
    o += m.softEll(94, 96, 7, 3, LIGHT, -8, 'opacity=".9"') + m.softEll(146, 96, 7, 3, LIGHT, 8, 'opacity=".9"');
    o += m.ell(120, 131, 12.5, 8.5, INK) + m.softEll(116, 128.5, 4, 2, "#7a5646");
    o += m.line("M120 139 v10 M120 149 q-9 8 -17 1 M120 149 q9 8 17 1", INK, 2.6);
    return wrap(o, "A friendly dog");
  },

  cat(m) {
    const { P } = m;
    const FUR = "#A7B0BC", DARK = "#7B8594", CREAM = "#EEF1F4";
    let o = shadow(m, 120, 218, 66, 9);
    o += m.ell(120, 200, 50, 38, FUR);
    o += m.ell(120, 186, 12, 10, P.accent) + m.ell(120, 192, 5, 5, "#F5C542");
    o += m.shape("M62 100 L70 38 L112 74 Z", FUR) + m.shape("M178 100 L170 38 L128 74 Z", FUR);
    o += m.shape("M72 90 L76 54 L98 76 Z", PINK) + m.shape("M168 90 L164 54 L142 76 Z", PINK);
    o += m.ell(120, 122, 63, 52, FUR);
    o += m.line("M120 72 v17 M103 75 l3 14 M137 75 l-3 14", DARK, 4.2);
    o += m.ell(94, 144, 23, 16, CREAM) + m.ell(146, 144, 23, 16, CREAM);
    o += m.ell(94, 118, 11, 13, "#CDE7A0") + m.ell(146, 118, 11, 13, "#CDE7A0");
    o += m.ell(94, 118, 4, 10, INK) + m.ell(146, 118, 4, 10, INK);
    o += m.softEll(97, 112, 2.6, 2.6, WHITE) + m.softEll(149, 112, 2.6, 2.6, WHITE);
    o += m.shape("M112 134 h16 l-8 9 Z", PINK);
    o += m.line("M120 143 v6 M120 149 q-8 7 -15 1 M120 149 q8 7 15 1", INK, 2.4);
    o += m.line("M72 140 l-34 -7 M72 148 l-36 4 M168 140 l34 -7 M168 148 l36 4", "#B9A99A", 1.8, 'opacity=".9"');
    return wrap(o, "A curious cat");
  },

  rabbit(m) {
    const FUR = "#CDBBA8", INNER = "#F2B1B1", WHITEFUR = "#F4ECE2";
    let o = shadow(m, 120, 218, 68, 9);
    o += m.ell(92, 62, 15, 52, FUR, -9) + m.ell(148, 62, 15, 52, FUR, 9);
    o += m.ell(93, 66, 7, 38, INNER, -9) + m.ell(147, 66, 7, 38, INNER, 9);
    o += m.ell(120, 200, 52, 38, WHITEFUR);
    o += m.ell(120, 144, 51, 45, FUR);
    o += m.ell(100, 160, 23, 17, WHITEFUR) + m.ell(140, 160, 23, 17, WHITEFUR);
    o += m.ell(98, 136, 7, 8, INK) + m.ell(142, 136, 7, 8, INK);
    o += m.softEll(100, 133, 2.6, 2.6, WHITE) + m.softEll(144, 133, 2.6, 2.6, WHITE);
    o += m.ell(120, 150, 7, 5, "#E98E8E");
    o += m.line("M120 154 v6 M120 160 q-7 7 -13 1 M120 160 q7 7 13 1", INK, 2.4);
    o += m.line("M82 156 l-28 -4 M82 163 l-28 5 M158 156 l28 -4 M158 163 l28 5", "#A8978A", 1.8, 'opacity=".9"');
    return wrap(o, "A gentle rabbit");
  },

  owl(m) {
    const BODY = "#B98B5E", WING = "#8F6A44", BELLY = "#F0DDBF", DISC = "#F7E8CF", BEAK = "#E8892B";
    let o = m.line("M30 222 H210", WING, 7) + shadow(m, 120, 226, 60, 6);
    o += m.ell(120, 142, 62, 76, BODY);
    o += m.ell(64, 150, 20, 54, WING, 12) + m.ell(176, 150, 20, 54, WING, -12);
    o += m.ell(120, 168, 41, 50, BELLY);
    for (const [x, y] of [[104, 150], [136, 150], [120, 170], [104, 190], [136, 190]]) o += m.line(`M${x - 8} ${y} q8 8 16 0`, "#C9A678", 2.6);
    o += m.shape("M72 72 L64 34 L98 58 Z", WING) + m.shape("M168 72 L176 34 L142 58 Z", WING);
    o += m.ell(94, 106, 27, 27, DISC) + m.ell(146, 106, 27, 27, DISC);
    o += m.ell(94, 106, 15.5, 15.5, "#F2B544") + m.ell(146, 106, 15.5, 15.5, "#F2B544");
    o += m.ell(94, 106, 7.5, 7.5, INK) + m.ell(146, 106, 7.5, 7.5, INK);
    o += m.softEll(97, 102, 3, 3, WHITE) + m.softEll(149, 102, 3, 3, WHITE);
    o += m.shape("M111 114 L129 114 L120 134 Z", BEAK);
    o += m.ell(104, 220, 11, 5.5, BEAK) + m.ell(136, 220, 11, 5.5, BEAK);
    return wrap(o, "A wise owl");
  },

  paw(m) {
    const { P } = m;
    const c = P.accent2;
    let o = shadow(m, 120, 214, 62, 8);
    o += m.shape("M120 118 C152 118 176 148 168 172 C162 192 140 186 120 186 C100 186 78 192 72 172 C64 148 88 118 120 118 Z", c);
    for (const [x, y, rot] of [[66, 112, -22], [98, 82, -7], [142, 82, 7], [174, 112, 22]]) o += m.ell(x, y, 16, 23, c, rot);
    return wrap(o, "A paw print");
  },

  heart(m) {
    let o = shadow(m, 120, 220, 60, 8);
    o += m.shape("M120 208 C38 150 34 90 74 72 C98 62 114 76 120 92 C126 76 142 62 166 72 C206 90 202 150 120 208 Z", "#E8705F");
    o += m.softEll(86, 92, 14, 9, "#FFB4A8", -35, 'opacity=".7"');
    return wrap(o, "A heart");
  },
});

"use strict";
/**
 * Original vector art for the law firm templates (soft 3D look, plain SVG, nothing borrowed). Motifs: scales, contract, pen, gavel,
 * folder, scroll. Paper, brass and wood are fixed colours; the palette tints seals, ribbons and covers.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", PAPER = "#FBF8F1", PAPER2 = "#E9E2D2", BRASS = "#C99A3E", BRASS2 = "#EBC56E", WOOD = "#8A5A3A", WOOD2 = "#B07A52", STEEL2 = "#9AA5B3";

register({
  scales(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 80, 7);
    o += m.shape("M78 204 H162 V218 H78 Z", P.crustDark) + m.shape("M104 196 H136 V206 H104 Z", BRASS);
    o += m.shape("M115 46 H125 V198 H115 Z", BRASS) + m.shape("M115 46 H120 V198 H115 Z", BRASS2) + m.ell(120, 40, 10, 10, BRASS2);
    o += m.shape("M44 62 H196 V70 H44 Z", BRASS) + m.shape("M44 62 H196 V65 H44 Z", BRASS2);
    o += m.line("M52 70 L30 138 M52 70 L74 138 M188 70 L166 138 M188 70 L210 138", STEEL2, 2.4);
    o += m.shape("M24 138 H80 Q76 160 52 162 Q28 160 24 138 Z", BRASS) + m.shape("M160 138 H216 Q212 160 188 162 Q164 160 160 138 Z", BRASS);
    o += m.ell(52, 138, 28, 5, BRASS2) + m.ell(188, 138, 28, 5, BRASS2) + m.softEll(40, 148, 6, 2.4, WHITE, 0, 'opacity=".5"') + m.softEll(176, 148, 6, 2.4, WHITE, 0, 'opacity=".5"');
    return wrap(o, "The scales of justice");
  },

  contract(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 76, 7);
    o += m.shape("M62 28 H178 V206 H62 Z", PAPER) + m.shape("M62 28 H78 V206 H62 Z", PAPER2);
    o += m.line("M90 54 H156 M90 72 H156 M90 90 H140 M90 108 H156 M90 126 H132", PAPER2, 4);
    o += m.shape("M90 150 H150 V156 H90 Z", P.crustDark, 'opacity=".5"') + m.line("M92 172 Q104 156 112 172 T134 168", P.accent, 3.4);
    o += m.ell(158, 176, 20, 20, P.accent) + m.ell(158, 176, 13, 13, P.accent2) + m.shape("M148 190 L142 214 L158 204 L174 214 L168 190 Z", P.accent);
    o += m.softEll(80, 70, 4, 26, WHITE, 0, 'opacity=".6"');
    return wrap(o, "A signed contract with a seal");
  },

  pen(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 84, 6);
    o += `<g transform="rotate(-38 120 120)">`;
    o += m.shape("M104 26 H136 V158 H104 Z", P.crustDark) + m.shape("M104 26 H114 V158 H104 Z", P.accent, 'opacity=".5"');
    o += m.shape("M100 150 H140 V168 H100 Z", BRASS) + m.shape("M106 168 H134 L124 206 H116 Z", BRASS2);
    o += m.shape("M117 206 H123 L120 220 Z", P.crustDark) + m.line("M120 176 V204", P.crustDark, 1.8);
    o += m.shape("M112 14 H128 V28 H112 Z", BRASS) + m.softEll(110, 80, 3, 36, WHITE, 0, 'opacity=".5"');
    o += `</g>`;
    o += m.ell(58, 196, 22, 6, P.accent, 0, 'opacity=".25"');
    return wrap(o, "A fountain pen");
  },

  gavel(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 84, 8);
    o += m.ell(120, 206, 62, 12, WOOD) + m.ell(120, 200, 62, 12, WOOD2);
    o += `<g transform="rotate(-30 120 100)">`;
    o += m.shape("M114 80 H126 V196 H114 Z", WOOD) + m.shape("M114 80 H120 V196 H114 Z", WOOD2);
    o += m.shape("M58 40 H182 Q192 40 192 52 V86 Q192 98 182 98 H58 Q48 98 48 86 V52 Q48 40 58 40 Z", WOOD2);
    o += m.shape("M58 40 H182 Q192 40 192 52 H48 Q48 40 58 40 Z", WOOD, 'opacity=".4"');
    o += m.shape("M66 36 H80 V102 H66 Z", BRASS) + m.shape("M160 36 H174 V102 H160 Z", BRASS) + m.softEll(110, 52, 30, 3.4, WHITE, 0, 'opacity=".45"');
    o += `</g>`;
    return wrap(o, "A judge's gavel on a block");
  },

  folder(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 86, 7);
    o += m.shape("M40 70 H100 L114 86 H200 V198 H40 Z", P.crustDark);
    o += m.shape("M52 62 H190 V188 H52 Z", PAPER2) + m.shape("M60 54 H182 V180 H60 Z", PAPER);
    o += m.line("M76 82 H160 M76 98 H150 M76 114 H160", PAPER2, 4);
    o += m.shape("M40 100 H210 L200 198 H40 Z", P.accent) + m.shape("M40 100 H210 V108 H40 Z", P.accent2, 'opacity=".55"');
    o += m.shape("M96 138 H152 V158 H96 Z", PAPER) + m.line("M104 148 H144", P.crustDark, 3);
    o += m.softEll(60, 160, 4, 22, WHITE, 0, 'opacity=".4"');
    return wrap(o, "A case file folder");
  },

  scroll(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 84, 7);
    o += m.shape("M52 56 H188 V182 H52 Z", PAPER);
    o += m.ell(52, 119, 14, 63, PAPER2) + m.ell(52, 119, 8, 56, PAPER) + m.ell(188, 119, 14, 63, PAPER) + m.ell(188, 119, 8, 56, PAPER2);
    o += m.line("M76 82 H166 M76 98 H166 M76 114 H150 M76 130 H166", PAPER2, 4);
    o += m.line("M82 160 Q96 142 106 160 T128 154", P.crustDark, 3.2);
    o += m.shape("M138 130 H152 L152 196 L145 188 L138 196 Z", P.accent) + m.ell(145, 128, 13, 13, P.accent) + m.ell(145, 128, 7, 7, P.accent2);
    return wrap(o, "A will and a ribbon");
  },
});

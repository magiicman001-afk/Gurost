"use strict";
/**
 * Original vector art for the photography and wedding templates (soft 3D look, plain SVG, nothing borrowed). Motifs: camera, ring,
 * bouquet, lens, polaroid, cake. Glass, metal and petals are fixed colours; the palette tints bodies, ribbons and frames.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", BLACK = "#24262B", BLACK2 = "#3D4048", STEEL = "#C3CAD3", STEEL2 = "#8E98A6", GLASS = "#6F9BC4", GLASS2 = "#2E4F78", GOLD = "#D7A93E", GOLD2 = "#F2D27C", PETAL = "#FBE3E6", PETAL2 = "#F4B9C4", LEAF = "#7FA877", LEAF2 = "#5B8656", ICING = "#FFF7EE", ICING2 = "#EADCCB";

register({
  camera(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 92, 8);
    o += m.shape("M30 90 Q30 80 40 80 H72 L84 62 H156 L168 80 H200 Q210 80 210 90 V176 Q210 186 200 186 H40 Q30 186 30 176 Z", P.accent);
    o += m.shape("M30 120 H210 V176 Q210 186 200 186 H40 Q30 186 30 176 Z", BLACK, 'opacity=".28"');
    o += m.shape("M30 90 Q30 80 40 80 H72 L84 62 H96 V80 H30 Z", WHITE, 'opacity=".14"');
    o += m.ell(120, 128, 46, 46, BLACK) + m.ell(120, 128, 38, 38, BLACK2) + m.ell(120, 128, 28, 28, GLASS2) + m.ell(120, 128, 20, 20, GLASS) + m.ell(120, 128, 8, 8, GLASS2);
    o += m.softEll(108, 114, 8, 5, WHITE, -30, 'opacity=".7"');
    o += m.shape("M44 66 H70 V80 H44 Z", STEEL) + m.shape("M170 72 H196 V84 H170 Z", P.accent2) + m.ell(186, 100, 7, 7, P.accent2);
    o += m.shape("M40 98 H62 V110 H40 Z", WHITE, 'opacity=".85"') + m.line("M44 150 H206 M44 156 H206", BLACK, 1.4, 'opacity=".3"');
    return wrap(o, "A camera");
  },

  ring(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 6);
    o += `<circle cx="120" cy="154" r="50" fill="none" stroke="${GOLD}" stroke-width="16"/><circle cx="120" cy="154" r="50" fill="none" stroke="${GOLD2}" stroke-width="5" stroke-dasharray="70 250" stroke-dashoffset="-190" opacity=".9"/>`;
    o += m.shape("M106 92 H134 L146 72 H94 Z", STEEL) + m.shape("M94 72 L120 40 L146 72 Z", "#E9F4FB") + m.shape("M120 40 L146 72 L120 80 Z", "#C4DDF0") + m.shape("M94 72 L120 80 L120 40 Z", WHITE, 'opacity=".7"');
    o += m.shape("M104 92 Q104 100 112 102 H128 Q136 100 136 92 Z", GOLD);
    o += m.line("M110 56 L116 70", WHITE, 2.4, 'opacity=".9"') + m.ell(150, 50, 4, 4, P.accent2) + m.ell(92, 54, 3, 3, P.accent2);
    return wrap(o, "A diamond ring");
  },

  bouquet(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 56, 6);
    o += m.shape("M110 140 H130 L124 214 H116 Z", LEAF2);
    o += m.shape("M92 124 Q70 100 84 82 Q96 96 112 120 Z", LEAF) + m.shape("M148 124 Q170 100 156 82 Q144 96 128 120 Z", LEAF);
    const flowers = [[120, 70, 30, PETAL2], [84, 100, 24, PETAL], [156, 100, 24, PETAL], [100, 120, 22, P.accent2], [140, 122, 22, PETAL2], [120, 106, 26, PETAL]];
    for (const [x, y, r, c] of flowers) {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; o += m.ell(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.5, c); }
      o += m.ell(x, y, r * 0.38, r * 0.38, GOLD2) + m.softEll(x - r * 0.2, y - r * 0.25, r * 0.12, r * 0.22, WHITE, 30, 'opacity=".5"');
    }
    o += m.shape("M100 160 H140 L136 178 H104 Z", P.accent) + m.shape("M118 178 L100 218 L110 218 L120 190 L130 218 L140 218 L122 178 Z", P.accent);
    return wrap(o, "A wedding bouquet");
  },

  lens(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 82, 7);
    o += m.shape("M52 90 H160 Q176 90 176 108 V148 Q176 166 160 166 H52 Q44 166 44 158 V98 Q44 90 52 90 Z", BLACK);
    o += m.shape("M44 98 Q44 90 52 90 H64 V166 H52 Q44 166 44 158 Z", BLACK2);
    for (let x = 80; x < 150; x += 10) o += m.line(`M${x} 94 V162`, BLACK2, 4);
    o += m.shape("M160 80 H196 Q210 80 210 96 V160 Q210 176 196 176 H160 Z", BLACK2);
    o += m.ell(196, 128, 36, 46, BLACK) + m.ell(196, 128, 28, 38, GLASS2) + m.ell(196, 128, 20, 28, GLASS) + m.ell(198, 128, 9, 13, GLASS2);
    o += m.softEll(190, 110, 5, 10, WHITE, 20, 'opacity=".7"') + m.shape("M96 80 H132 V90 H96 Z", P.accent) + m.line("M60 128 H72", P.accent2, 4);
    return wrap(o, "A camera lens");
  },

  polaroid(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 76, 6);
    o += `<g transform="rotate(-6 120 120)">`;
    o += m.shape("M58 34 H182 Q190 34 190 42 V194 Q190 202 182 202 H58 Q50 202 50 194 V42 Q50 34 58 34 Z", "#FFFDF8");
    o += m.shape("M64 46 H176 V152 H64 Z", P.accent2) + m.shape("M64 106 L96 78 L122 104 L140 88 L176 120 V152 H64 Z", P.accent, 'opacity=".75"');
    o += m.ell(146, 70, 12, 12, WHITE, 'opacity=".9"') + m.softEll(80, 56, 4, 16, WHITE, 0, 'opacity=".4"');
    o += m.line("M72 176 Q90 166 108 176 T146 176", "#8C8A84", 3, 'opacity=".5"');
    o += `</g>`;
    return wrap(o, "An instant photograph");
  },

  cake(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 86, 7);
    o += m.shape("M44 196 H196 V212 Q196 220 188 220 H52 Q44 220 44 212 Z", WHITE) + m.shape("M54 150 H186 V196 H54 Z", ICING) + m.shape("M54 150 H72 V196 H54 Z", ICING2, 'opacity=".7"');
    o += m.shape("M72 106 H168 V150 H72 Z", ICING) + m.shape("M72 106 H88 V150 H72 Z", ICING2, 'opacity=".7"');
    o += m.shape("M92 66 H148 V106 H92 Z", ICING) + m.shape("M92 66 H104 V106 H92 Z", ICING2, 'opacity=".7"');
    o += m.shape("M54 168 H186 V176 H54 Z", P.accent) + m.shape("M72 124 H168 V131 H72 Z", P.accent) + m.shape("M92 84 H148 V90 H92 Z", P.accent);
    for (let x = 62; x < 190; x += 16) o += m.ell(x, 150, 7, 7, WHITE);
    for (let x = 80; x < 170; x += 16) o += m.ell(x, 106, 6, 6, WHITE);
    o += m.shape("M112 58 H128 V66 H112 Z", GOLD) + m.shape("M120 38 Q132 50 120 58 Q108 50 120 38 Z", PETAL2) + m.ell(100, 62, 6, 6, P.accent2) + m.ell(140, 62, 6, 6, P.accent2);
    o += m.softEll(80, 170, 3, 20, WHITE, 0, 'opacity=".5"');
    return wrap(o, "A tiered wedding cake");
  },
});

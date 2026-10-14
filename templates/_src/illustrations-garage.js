"use strict";
/**
 * Original vector art for the garage and MOT templates (soft 3D look, plain SVG, nothing borrowed). Motifs: hatch (a small car),
 * tyre, plug (spark plug), oilcan, battery, rotor (brake disc). Rubber, steel and glass are fixed colours; the palette tints paint,
 * labels and caps.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", RUBBER = "#2B2E33", RUBBER2 = "#454A52", STEEL = "#C3CAD3", STEEL2 = "#8E98A6", GLASS = "#BFD9EA", CER = "#F4F1EA", CER2 = "#DDD7C9";

register({
  hatch(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 92, 8);
    o += m.shape("M26 160 Q26 132 52 128 L84 76 Q92 64 108 64 H150 Q166 64 176 78 L196 126 Q220 130 220 156 V172 H26 Z", P.accent);
    o += m.shape("M92 80 H114 V122 H66 Z", GLASS) + m.shape("M122 80 H150 Q158 80 164 90 L178 122 H122 Z", GLASS);
    o += m.shape("M26 160 H220 V172 H26 Z", P.crustDark, 'opacity=".35"');
    o += m.softEll(104, 92, 26, 4, WHITE, -24, 'opacity=".5"') + m.ell(212, 146, 9, 6, P.accent2) + m.ell(34, 146, 8, 6, "#E5484D");
    o += m.ell(70, 176, 26, 26, RUBBER) + m.ell(70, 176, 14, 14, STEEL) + m.ell(70, 176, 5, 5, STEEL2);
    o += m.ell(180, 176, 26, 26, RUBBER) + m.ell(180, 176, 14, 14, STEEL) + m.ell(180, 176, 5, 5, STEEL2);
    return wrap(o, "A small car");
  },

  tyre(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 82, 7);
    o += m.ell(120, 118, 94, 94, RUBBER) + m.ell(120, 118, 74, 74, RUBBER2);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; o += m.line(`M${(120 + Math.cos(a) * 88).toFixed(1)} ${(118 + Math.sin(a) * 88).toFixed(1)} L${(120 + Math.cos(a) * 80).toFixed(1)} ${(118 + Math.sin(a) * 80).toFixed(1)}`, RUBBER, 5); }
    o += m.ell(120, 118, 56, 56, STEEL) + m.ell(120, 118, 46, 46, STEEL2);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.57; o += m.line(`M120 118 L${(120 + Math.cos(a) * 44).toFixed(1)} ${(118 + Math.sin(a) * 44).toFixed(1)}`, STEEL, 11); }
    o += m.ell(120, 118, 14, 14, P.accent) + m.ell(120, 118, 6, 6, P.accent2) + m.softEll(78, 70, 6, 26, WHITE, 40, 'opacity=".25"');
    return wrap(o, "A car tyre and alloy wheel");
  },

  plug(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 60, 6);
    o += m.shape("M112 24 H128 V44 H112 Z", STEEL2) + m.ell(120, 22, 10, 7, STEEL);
    o += m.shape("M104 44 H136 V132 H104 Z", CER) + m.shape("M104 44 H114 V132 H104 Z", CER2);
    o += m.shape("M98 66 H142 V74 H98 Z", CER2) + m.shape("M98 92 H142 V100 H98 Z", CER2);
    o += m.shape("M92 132 H148 V160 H92 Z", STEEL) + m.shape("M92 132 H102 V160 H92 Z", STEEL2);
    o += m.shape("M104 160 H136 V196 H104 Z", STEEL2);
    for (let y = 164; y < 196; y += 6) o += m.line(`M104 ${y} H136`, STEEL, 2);
    o += m.shape("M136 196 H146 V212 H120 V206 H136 Z", RUBBER2) + m.ell(120, 204, 6, 6, P.accent2);
    o += m.softEll(108, 80, 3, 28, WHITE, 0, 'opacity=".6"');
    return wrap(o, "A spark plug");
  },

  oilcan(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 70, 7);
    o += m.shape("M70 90 H162 V204 Q162 214 152 214 H80 Q70 214 70 204 Z", P.accent);
    o += m.shape("M70 90 H86 V214 H80 Q70 214 70 204 Z", P.crustDark, 'opacity=".3"');
    o += m.shape("M82 126 H150 V176 H82 Z", CER) + m.line("M92 142 H138 M92 154 H126 M92 166 H132", CER2, 3.4) + m.ell(116, 134, 6, 6, P.accent2);
    o += m.shape("M100 70 H132 V92 H100 Z", STEEL) + m.shape("M96 62 H136 V72 H96 Z", STEEL2);
    o += m.shape("M132 78 H176 L200 52 L206 60 L182 90 H132 Z", STEEL) + m.shape("M200 52 L206 60 L214 76 L204 78 Z", STEEL2);
    o += m.ell(209, 88, 4, 6, P.accent2) + m.softEll(80, 130, 3, 36, WHITE, 0, 'opacity=".45"');
    return wrap(o, "An oil can");
  },

  battery(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 92, 7);
    o += m.shape("M42 96 H198 V196 H42 Z", RUBBER2) + m.shape("M42 96 H198 V112 H42 Z", RUBBER) + m.shape("M42 96 H60 V196 H42 Z", RUBBER, 'opacity=".5"');
    o += m.shape("M62 124 H178 V178 H62 Z", P.accent) + m.line("M74 142 H122 M74 156 H108", WHITE, 4, 'opacity=".9"') + m.shape("M146 132 L136 154 H148 L140 172 L160 146 H148 L156 132 Z", P.accent2);
    o += m.shape("M58 78 H88 V98 H58 Z", STEEL) + m.shape("M152 78 H182 V98 H152 Z", STEEL) + m.line("M66 88 H80 M167 88 H167 M160 88 H174 M167 82 V94", RUBBER, 3);
    o += m.softEll(54, 140, 3, 38, WHITE, 0, 'opacity=".22"');
    return wrap(o, "A car battery");
  },

  rotor(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 82, 7);
    o += m.ell(120, 118, 94, 94, STEEL2) + m.ell(120, 118, 84, 84, STEEL) + m.ell(120, 118, 58, 58, STEEL2);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; o += m.ell(120 + Math.cos(a) * 71, 118 + Math.sin(a) * 71, 4, 4, RUBBER2); }
    o += m.ell(120, 118, 40, 40, STEEL) + m.ell(120, 118, 18, 18, STEEL2);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.2; o += m.ell(120 + Math.cos(a) * 28, 118 + Math.sin(a) * 28, 4, 4, RUBBER); }
    o += m.shape("M184 52 Q214 78 214 118 Q214 148 196 172 L176 156 Q190 138 190 118 Q190 94 170 72 Z", P.accent) + m.softEll(196, 90, 3, 18, WHITE, 0, 'opacity=".35"');
    return wrap(o, "A brake disc and caliper");
  },
});

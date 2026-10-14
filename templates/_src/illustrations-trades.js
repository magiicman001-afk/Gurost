"use strict";
/**
 * Original vector art for the trades and home-services templates (soft 3D look, plain SVG, nothing borrowed). Motifs: wrench, bulb,
 * house, tap, toolbox, hardhat. Steel, glass and rubber are fixed colours; the palette tints paint, brass and warm light.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", STEEL = "#D7DDE5", STEEL2 = "#9AA5B3", STEEL3 = "#6F7B8A", GLASS = "#EAF3F8", BRASS = "#D9A441", INK = "#1E2630";

register({
  wrench(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 84, 8);
    o += `<g transform="rotate(-38 120 120)">`;
    o += m.shape("M104 70 H136 V176 Q136 196 120 196 Q104 196 104 176 Z", STEEL2);
    o += m.shape("M110 70 H130 V176 Q130 190 120 190 Q110 190 110 176 Z", STEEL);
    o += m.shape("M78 30 H102 V54 H94 V70 H146 V54 H138 V30 H162 V74 Q162 92 120 92 Q78 92 78 74 Z", STEEL2);
    o += m.shape("M82 32 H100 V58 H92 V72 Q82 70 82 62 Z", STEEL);
    o += m.shape("M104 172 H136 V190 Q136 204 120 204 Q104 204 104 190 Z", P.accent);
    o += m.softEll(116, 130, 4, 30, WHITE, 0, 'opacity=".55"');
    o += `</g>`;
    return wrap(o, "A steel spanner");
  },

  bulb(m) {
    const { P } = m;
    let o = shadow(m, 120, 224, 58, 7);
    o += m.shape("M120 28 Q176 28 176 88 Q176 118 150 142 V158 H90 V142 Q64 118 64 88 Q64 28 120 28 Z", GLASS, 'opacity=".96"');
    o += m.softEll(120, 92, 44, 52, P.light, 0, 'opacity=".75"');
    o += m.line("M104 150 V104 Q104 88 112 88 Q120 100 128 88 Q136 88 136 104 V150", P.accent, 3.6);
    o += m.softEll(120, 96, 16, 16, P.accent2, 0, 'opacity=".9"');
    o += m.softEll(88, 70, 6, 26, WHITE, 14, 'opacity=".75"');
    o += m.shape("M90 158 H150 V172 H90 Z", STEEL) + m.shape("M92 174 H148 V188 H92 Z", STEEL2) + m.shape("M94 190 H146 V202 Q120 214 94 202 Z", STEEL);
    o += m.line("M92 166 H148 M94 182 H146", STEEL3, 2);
    return wrap(o, "A glowing light bulb");
  },

  house(m) {
    const { P } = m;
    let o = shadow(m, 120, 218, 92, 8);
    o += m.shape("M52 112 H188 V202 H52 Z", WHITE) + m.shape("M52 112 H70 V202 H52 Z", "#E8EAEE");
    o += m.shape("M36 118 L120 40 L204 118 L196 126 L120 58 L44 126 Z", P.accent);
    o += m.shape("M120 40 L204 118 L196 126 L120 58 Z", P.crustDark);
    o += m.shape("M104 150 H138 V202 H104 Z", P.accent2) + m.ell(131, 178, 3, 3, BRASS);
    o += m.shape("M68 128 H98 V158 H68 Z", GLASS) + m.shape("M146 128 H176 V158 H146 Z", GLASS);
    o += m.line("M83 128 V158 M68 143 H98 M161 128 V158 M146 143 H176", STEEL2, 2);
    o += m.shape("M158 62 H176 V96 L158 80 Z", P.crustDark);
    o += m.softEll(80, 176, 5, 20, WHITE, 0, 'opacity=".4"');
    return wrap(o, "A house");
  },

  tap(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 70, 7);
    o += m.shape("M84 196 H156 V210 Q120 218 84 210 Z", STEEL2);
    o += m.shape("M108 120 H132 V198 H108 Z", STEEL) + m.shape("M108 120 H116 V198 H108 Z", "#EEF2F6");
    o += m.shape("M112 120 V74 Q112 44 142 44 H174 V68 H146 Q136 68 136 80 V120 Z", STEEL);
    o += m.shape("M112 120 V74 Q112 44 142 44 H146 Q122 52 122 80 V120 Z", "#EEF2F6");
    o += m.shape("M164 62 H178 V76 H164 Z", STEEL2);
    o += m.shape("M82 52 H118 V62 H82 Z", P.accent) + m.shape("M92 38 H108 V52 H92 Z", P.accent);
    o += m.softEll(171, 98, 3, 8, "#9ED3F2", 0, 'opacity=".9"') + m.softEll(171, 122, 3, 10, "#9ED3F2", 0, 'opacity=".7"');
    o += m.softEll(114, 150, 3, 26, WHITE, 0, 'opacity=".7"');
    return wrap(o, "A kitchen tap");
  },

  toolbox(m) {
    const { P } = m;
    let o = shadow(m, 120, 218, 92, 8);
    o += m.shape("M88 84 Q88 56 120 56 Q152 56 152 84 H140 Q140 68 120 68 Q100 68 100 84 Z", STEEL3);
    o += m.shape("M40 90 H200 V196 Q200 204 192 204 H48 Q40 204 40 196 Z", P.accent);
    o += m.shape("M40 90 H200 V122 H40 Z", P.crustDark);
    o += m.shape("M40 90 H200 V100 H40 Z", P.accent, 'opacity=".6"');
    o += m.shape("M100 112 H140 V132 H100 Z", STEEL) + m.shape("M104 116 H136 V128 H104 Z", STEEL2);
    o += m.line("M40 150 H200", P.crustDark, 3);
    o += m.shape("M52 196 H72 V212 H52 Z", INK) + m.shape("M168 196 H188 V212 H168 Z", INK);
    o += m.softEll(70, 108, 18, 4, WHITE, 0, 'opacity=".35"') + m.softEll(60, 172, 4, 22, WHITE, 0, 'opacity=".3"');
    return wrap(o, "A red toolbox");
  },

  hardhat(m) {
    const { P } = m;
    let o = shadow(m, 120, 216, 92, 8);
    o += m.shape("M34 160 Q34 166 44 168 H196 Q206 166 206 160 Q206 150 196 150 H44 Q34 150 34 160 Z", P.crustDark);
    o += m.shape("M56 150 Q56 70 120 62 Q184 70 184 150 Z", P.accent);
    o += m.shape("M104 66 H136 V150 H104 Z", P.crustDark, 'opacity=".55"');
    o += m.shape("M110 62 H130 V150 H110 Z", P.accent);
    o += m.shape("M74 120 Q80 92 100 80 Q88 104 90 150 H74 Z", P.accent2, 'opacity=".45"');
    o += m.softEll(88, 104, 7, 26, WHITE, 16, 'opacity=".6"');
    o += m.shape("M56 150 H184 V160 H56 Z", P.crustDark, 'opacity=".5"');
    return wrap(o, "A hard hat");
  },
});

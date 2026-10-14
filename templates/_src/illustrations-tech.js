"use strict";
/**
 * Original vector art for the tech agency and SaaS templates (soft 3D look, plain SVG, nothing borrowed). Motifs: laptop, rocket,
 * chart, cloud, phone, gear. Metal and glass are fixed colours; the palette tints bodies, bars and screens.
 */
const { register, kit } = require("./illustrations");
const { wrap, shadow } = kit;

const WHITE = "#FFFFFF", STEEL = "#C9D0DA", STEEL2 = "#8E98A6", DARK = "#232733", DARK2 = "#3A4050", SCREEN = "#101524";

register({
  laptop(m) {
    const { P } = m;
    let o = shadow(m, 120, 206, 96, 7);
    o += m.shape("M52 58 H188 Q196 58 196 66 V152 H44 V66 Q44 58 52 58 Z", STEEL) + m.shape("M54 66 H186 V146 H54 Z", SCREEN);
    o += m.shape("M62 76 H118 V86 H62 Z", P.accent) + m.shape("M62 94 H150 V100 H62 Z", WHITE, 'opacity=".5"') + m.shape("M62 106 H134 V112 H62 Z", WHITE, 'opacity=".35"');
    o += m.shape("M130 80 H178 V138 H130 Z", P.accent2, 'opacity=".9"') + m.shape("M138 118 H146 V134 H138 Z", WHITE, 'opacity=".9"') + m.shape("M152 104 H160 V134 H152 Z", WHITE, 'opacity=".9"') + m.shape("M166 92 H174 V134 H166 Z", WHITE, 'opacity=".9"');
    o += m.shape("M26 152 H214 L204 178 Q202 184 194 184 H46 Q38 184 36 178 Z", STEEL2) + m.shape("M26 152 H214 L212 158 H28 Z", STEEL);
    o += m.shape("M104 164 H136 V170 H104 Z", DARK2) + m.softEll(70, 64, 3, 12, WHITE, 40, 'opacity=".4"');
    return wrap(o, "A laptop");
  },

  rocket(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 66, 6);
    o += m.shape("M120 20 Q164 52 164 118 V170 H76 V118 Q76 52 120 20 Z", WHITE);
    o += m.shape("M120 20 Q164 52 164 118 H76 Q76 52 120 20 Z", P.accent) + m.shape("M76 118 Q76 52 120 20 Q92 60 92 118 Z", WHITE, 'opacity=".2"');
    o += m.ell(120, 110, 22, 22, STEEL2) + m.ell(120, 110, 17, 17, SCREEN) + m.softEll(114, 104, 4, 8, WHITE, 30, 'opacity=".6"');
    o += m.shape("M76 138 L44 188 L44 206 L76 176 Z", P.accent) + m.shape("M164 138 L196 188 L196 206 L164 176 Z", P.accent);
    o += m.shape("M96 170 H144 L138 188 H102 Z", DARK2) + m.shape("M104 188 H136 Q130 212 120 224 Q110 212 104 188 Z", P.accent2) + m.shape("M112 188 H128 Q124 204 120 212 Q116 204 112 188 Z", "#FFF4C2");
    o += m.softEll(96, 80, 3, 28, WHITE, 8, 'opacity=".4"');
    return wrap(o, "A rocket");
  },

  chart(m) {
    const { P } = m;
    let o = shadow(m, 120, 218, 92, 7);
    o += m.shape("M34 40 H206 Q214 40 214 48 V196 Q214 204 206 204 H34 Q26 204 26 196 V48 Q26 40 34 40 Z", WHITE);
    o += m.line("M44 70 H198 M44 108 H198 M44 146 H198", "#E3E7EE", 2);
    const bars = [[52, 150, P.accent2], [84, 128, P.accent2], [116, 104, P.accent], [148, 88, P.accent], [180, 64, P.accent]];
    for (const [x, y, c] of bars) o += m.shape(`M${x - 11} ${y} H${x + 11} V186 H${x - 11} Z`, c) + m.shape(`M${x - 11} ${y} H${x - 5} V186 H${x - 11} Z`, WHITE, 'opacity=".25"');
    o += `<path d="M52 142 L84 120 L116 96 L148 80 L180 54" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>` + m.ell(180, 54, 6, 6, DARK);
    return wrap(o, "A growth chart");
  },

  cloud(m) {
    const { P } = m;
    let o = shadow(m, 120, 214, 86, 6);
    o += m.ell(84, 138, 44, 44, WHITE) + m.ell(130, 112, 54, 54, WHITE) + m.ell(176, 144, 38, 38, WHITE) + m.shape("M60 140 H196 V182 H60 Z", WHITE);
    o += m.shape("M44 160 Q44 182 66 182 H190 Q210 182 212 164 Z", P.accent, 'opacity=".25"') + m.softEll(110, 90, 3, 36, "#EAF2FF", 60, 'opacity=".6"');
    o += m.shape("M104 120 H136 V150 H152 L120 184 L88 150 H104 Z", P.accent) + m.shape("M104 120 H116 V150 H104 Z", WHITE, 'opacity=".25"');
    return wrap(o, "A cloud with a download arrow");
  },

  phone(m) {
    const { P } = m;
    let o = shadow(m, 120, 222, 62, 6);
    o += m.shape("M78 28 H162 Q176 28 176 42 V206 Q176 220 162 220 H78 Q64 220 64 206 V42 Q64 28 78 28 Z", DARK);
    o += m.shape("M72 40 H168 V208 H72 Z", SCREEN) + m.shape("M104 34 H136 V40 H104 Z", DARK2);
    o += m.shape("M80 52 H160 V90 H80 Z", P.accent) + m.line("M88 70 H128", WHITE, 4, 'opacity=".85"');
    o += m.shape("M80 100 H118 V134 H80 Z", P.accent2) + m.shape("M122 100 H160 V134 H122 Z", WHITE, 'opacity=".22"') + m.shape("M80 142 H160 V150 H80 Z", WHITE, 'opacity=".3"') + m.shape("M80 156 H140 V164 H80 Z", WHITE, 'opacity=".2"');
    o += m.ell(120, 188, 10, 10, P.accent) + m.softEll(84, 100, 3, 40, WHITE, 0, 'opacity=".14"');
    return wrap(o, "A smartphone showing an app");
  },

  gear(m) {
    const { P } = m;
    let o = shadow(m, 120, 220, 84, 6);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 360; o += `<g transform="rotate(${a} 120 120)">` + m.shape("M108 20 H132 L128 48 H112 Z", P.accent) + `</g>`; }
    o += m.ell(120, 120, 74, 74, P.accent) + m.ell(120, 120, 62, 62, P.accent2) + m.ell(120, 120, 28, 28, WHITE) + m.ell(120, 120, 16, 16, STEEL2);
    o += m.softEll(86, 84, 4, 24, WHITE, 40, 'opacity=".45"');
    return wrap(o, "A cog wheel");
  },
});

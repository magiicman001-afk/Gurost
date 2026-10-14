"use strict";
/** Shared parts for the restaurant layouts that use the real-3D (WebGL) models: page factory, menu page, 3D tag helper. */
const B = require("./plus-base");
const K = require("./beauty-kit");
const G = require("./gl3d");
const { img } = B;

const ROOT = (v) => `:root{--bg:${v.bg};--surface:${v.surface};--ink:${v.ink};--muted:${v.muted};--line:${v.line};--accent:${v.accent};--onaccent:${v.onaccent};--c1:${v.c1 || v.accent};--c2:${v.c2};--c3:${v.c3 || v.accent};--rad:${v.rad || "10px"};--display:${v.display};--sans:${v.sans};--gut:clamp(18px,4vw,52px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}`;
const BASE = (v) => `${ROOT(v)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
${G.CSS}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink)}
.site-header.is-stuck,.mpanel{background:${v.header || "rgba(10,10,10,.88)"}}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary span{color:var(--onaccent)}.btn-primary:hover{background:var(--c2);border-color:var(--c2)}.btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:32em}
.order{--rad:12px}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
.gh{margin:clamp(30px,5vw,60px) 0 .8rem}.gh p{margin:.3rem 0 0;color:var(--muted)}
.rows{border-top:1px solid var(--line)}.rw{display:grid;grid-template-columns:3rem 1fr auto 88px;gap:clamp(10px,2vw,26px);align-items:center;padding:1.1rem 0;border-bottom:1px solid var(--line)}.rw .n{color:var(--accent);font-weight:700}.rw h3{margin:0 0 .25rem}.rw p{margin:0;color:var(--muted)}.rw .pr{font-weight:700;white-space:nowrap}.rw .ph{width:88px;height:88px;border-radius:12px;overflow:hidden;background:var(--surface)}.rw .ph img{width:100%;height:100%;object-fit:cover}
.tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}.tg{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--line);border-radius:99px;padding:.15rem .55rem;color:var(--muted)}.tg.star{border-color:var(--accent);color:var(--accent)}
@media(max-width:640px){.rw{grid-template-columns:2rem minmax(0,1fr) 72px}.rw .pr{grid-column:2;text-align:left}.rw .ph{grid-column:3;grid-row:1/3;width:72px;height:72px}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
`;

const menuHtml = (pack) => {
  let n = 0;
  return pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="rows">${c.items.map((i) => `<article class="rw" data-reveal><span class="n">${K.pad(++n)}</span><div><h3>${i.n}</h3><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div><span class="pr">${K.strip(i.meta)}</span><div class="ph">${img(i.art || c.art, i.n, { w: 240, h: 240, hint: B.hintOf(pack, i) })}</div></article>`).join("")}</div></section>`).join("");
};

/** gl3d box with the matching flat picture as the fallback */
const model3d = (pack, model, art, alt, o = {}) => G.tag(model, { fallback: img(art, alt, { role: "featured", w: 900, h: 900, hint: o.hint }), label: alt, ...o });

/** spec: { name, fonts, preload, themeColor, vars, css, js, home(pack, ctx) -> body html, menuHero(pack) -> html, menuKey } */
function make(spec) {
  const cssText = (pack) => BASE(spec.vars) + spec.css + (pack.css[spec.name] || "");
  const ctx = { B, K, G, img, model3d };
  const home = (pack) => B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body: spec.home(pack, ctx) + K.order(pack, pack.copy.atelier.orderHome) + K.foot(), preload: spec.preload, pack });
  const menu = (pack) => {
    const X = pack.copy.atelier;
    const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section><div class="wrap">${menuHtml(pack)}</div><div style="height:clamp(20px,4vw,50px)"></div>${K.order(pack, X.orderMenu)}${K.foot()}`;
    return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: spec.preload, pack });
  };
  return {
    build(pack = require("./packs/restaurant")) {
      return {
        name: spec.name, themeColor: spec.themeColor, fonts: spec.fonts,
        media: B.mediaFor(pack, spec.name, "motion", "motion").filter(([, to]) => !/^video\//.test(to)),
        files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": cssText(pack), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + G.RUNTIME + "\n" + (spec.js || "") },
      };
    },
  };
}
module.exports = { make, model3d };

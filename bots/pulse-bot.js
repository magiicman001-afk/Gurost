"use strict";
/**
 * PULSE bot (6 of 8). One job: watch the build and tell the person what is happening, as it happens.
 * It paints the live preview (a styled shell while the words are written, then the page growing section by section),
 * announces look swaps and escalations, and reads each finished page's quality-gate result for errors, contrast and layout issues.
 * It never changes a page. (The Pulse widget on the builder page is the front end for the same job.)
 */
const A = require("../lib/sections/assemble");

// ---------------------------------------------------------------- live preview (progress the person can watch)
// The builder paints "designing/partial" messages in its Live Preview and advances the progress bar. Two real things happen
// before the finished designs exist, and each is shown as it happens: (1) a styled shell (the palette, fonts, the
// owner's business name) the moment the industry is matched, while the model writes the words; (2) the page growing section
// by section as those words are assembled. Photos are not looked up yet at that point, so images show as blank until the finished design.
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const stripImgTokens = (html) => String(html).replace(/src="IMG_\d+"/g, `src="${BLANK_IMG}"`);

function previewPage(palette, recipeOrder, content, variants) {
  const order = recipeOrder.filter((id) => content[id]);
  const r = A.assemble({ palette, recipe: { id: "preview", order, required: ["navbar", "hero", "footer"].filter((id) => order.includes(id)) }, content, variants, includeBranding: false, meta: { title: (content.navbar && content.navbar.brand) || "Preview" } });
  return stripImgTokens(r.html);
}

/** Shown while the words are being written: the real palette and fonts, the owner's name, and a clear "writing" line. */
function skeletonContent(o) {
  const brand = String((o.businessInfo && o.businessInfo.name) || "").trim() || "Your business";
  const links = [{ label: "Home", href: "#top" }, { label: "About", href: "#top" }, { label: "Contact", href: "#top" }];
  return {
    navbar: { brand, links, cta_label: "Get started", cta_href: "#top" },
    hero: { headline: brand, subhead: "Writing the words for your site...", cta1_label: "Get in touch", cta1_href: "#top" },
    footer: { brand, link_groups: [{ title: "Explore", links: [{ label: "Back to top", href: "#top" }] }] },
  };
}

const SECTION_LABEL = { navbar: "navigation", hero: "hero", services: "services", features: "features", about: "about", gallery: "gallery", process: "process", faq: "faq", cta: "call to action", booking: "contact", location: "location", footer: "footer" };

/** The page growing one section at a time, once the words exist. Stops as soon as `state.stop` is set. */
async function growPreview({ dir, composed, notify, state, stepMs, order }) {
  try {
    const have = (order || A.recipes[composed.recipe].order).filter((id) => composed.content[id] && id !== "footer");
    // The first frame is navigation + hero together (a page with a bar and nothing under it is not worth showing).
    const first = Math.min(2, have.length);
    for (let i = first; i <= have.length; i++) {
      if (state.stop) return;
      const shown = have.slice(0, i);
      const html = previewPage(composed.palette, [...shown, "footer"], composed.content, dir.set);
      const added = i === first ? shown : [shown[shown.length - 1]];
      notify("designing", "partial", { variantId: dir.id, label: dir.label, html, sections: added.map((id) => SECTION_LABEL[id] || id), progress: 40 + Math.round((50 * i) / have.length) });
      if (stepMs > 0) await new Promise((r) => setTimeout(r, stepMs));
    }
  } catch (err) {
    console.warn("[library-bot] live preview skipped:", err.message); // the preview is a courtesy; the build goes on
  }
}

/** The styled shell, shown the moment the industry is matched while the words are written. A courtesy: a failure never stops the build. */
function paintShell({ notify, lead, shellLook, palette, businessInfo }) {
  try {
    if (!lead) return;
    notify("designing", "thinking", { label: "the words for your site" });
    notify("designing", "partial", { variantId: lead.id, label: shellLook ? shellLook.label : lead.label, html: previewPage(palette, ["navbar", "hero", "footer"], skeletonContent({ businessInfo }), shellLook ? shellLook.variants : lead.set), sections: ["navigation", "hero"], progress: 8 });
  } catch (err) {
    console.warn("[library-bot] preview shell skipped:", err.message);
  }
}

const onSwap = (notify, dir) => ({ from, to, why }) => notify("designing", "swapping", { variantId: dir.id, label: to.label, why, from: from.label });
const onLevel = (notify, dir) => ({ bot, look, why }) => notify("designing", "escalating", { variantId: dir.id, bot, label: look.label, why });

/** What the quality gate found on a finished page: a plain summary of the failures (by rule) and the warnings. No page is changed. */
function watch(built) {
  const g = (built && built.gate) || { failures: [], warnings: [] };
  const rules = (g.failures || []).map((f) => f.rule).filter(Boolean);
  return { ok: !!g.ok, failures: rules.slice(0, 10), contrast: rules.includes("text-contrast"), warnings: (g.warnings || []).length, repaired: !!(built && built.degraded) };
}

module.exports = { previewPage, skeletonContent, growPreview, paintShell, onSwap, onLevel, watch, stripImgTokens, SECTION_LABEL, BLANK_IMG };

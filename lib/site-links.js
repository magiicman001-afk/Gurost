/**
 * Makes a generated page's buttons and forms real, with no AI and no
 * rebuild. Runs on every design right after it is generated:
 *   - links that go nowhere ("#", empty, javascript:, or a "#id" that is
 *     not on the page) are pointed at the section they mean: ordering and
 *     booking go to #order, contact and visit go to #contact, social icons
 *     go to the profile from the company details (and are removed when no
 *     profile was given - a profile is never invented)
 *   - a page without an #order section gets one (name, email, phone, item,
 *     quantity, pickup time); a page without #contact gets a contact form
 *   - a Google Maps embed (no API key) is added when there is an address
 *   - one small script sends every form to the Gurost form endpoint and shows
 *     the real result inline: success only after the server saved it
 * Idempotent: running it twice changes nothing the second time.
 * Returns { html, report } - report lists what was changed.
 */

const SOCIALS = [
  ["instagram", /instagram/i],
  ["tiktok", /tik\s?tok/i],
  ["youtube", /youtube/i],
  ["facebook", /facebook/i],
  ["x", /(^|[^a-z])(twitter|x\.com)([^a-z]|$)|\bon x\b/i]
];
const ORDER_RE = /\b(order|book|booking|reserve|reservation|checkout|buy|shop now|get started)\b/i;
const CONTACT_RE = /\b(contact|get in touch|enquir\w*|inquir\w*|call us|visit|find us|location|directions)\b/i;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textOf = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const slug = (s) => textOf(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? (m[2] ?? m[3]) : null;
}

function setAttr(tag, name, value) {
  const has = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*')`, "i");
  if (has.test(tag)) return tag.replace(has, (_, pre) => `${pre}"${esc(value)}"`);
  return tag.replace(/^<a\b/i, () => `<a ${name}="${esc(value)}"`);
}

function idsIn(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  return ids;
}

function isDeadHref(href, ids) {
  if (href === null) return true;
  const h = href.trim();
  if (h === "" || h === "#" || h === "#!" || /^javascript:/i.test(h)) return true;
  if (h.startsWith("#")) return !(h === "#top" || ids.has(h.slice(1)));
  return false;
}

function socialOf(label) {
  for (const [key, re] of SOCIALS) if (re.test(label)) return key;
  return null;
}

// Where a dead link should go, or null when it should be dropped.
function targetFor(label, ids, info) {
  const social = socialOf(label);
  if (social) return info && info[social] ? info[social] : null;
  if (ORDER_RE.test(label)) return "#order";
  if (CONTACT_RE.test(label)) return "#contact";
  const s = slug(label);
  if (s && ids.has(s)) return `#${s}`;
  if (/^(home|top|back to top)$/.test(s) || !s) return "#top";
  return "#contact";
}

function fixLinks(html, info, report) {
  const ids = idsIn(html);
  ids.add("order").add("contact"); // both are guaranteed below
  return html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (whole) => {
    const open = /^<a\b[^>]*>/i.exec(whole)[0];
    const href = attr(open, "href");
    const label = `${textOf(whole)} ${attr(open, "aria-label") || ""} ${attr(open, "title") || ""} ${href || ""}`;
    const social = socialOf(label);
    // A social link that already points somewhere real is left alone.
    if (social && href && /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?(instagram|tiktok|youtube|facebook|x|twitter)\.com\/?$/i.test(href)) return whole;
    if (!isDeadHref(href, ids)) return whole;
    const to = targetFor(label, ids, info);
    if (to === null) {
      report.removed.push(textOf(whole) || social);
      return "";
    }
    report.fixed.push(`${textOf(whole) || social || "link"} -> ${to}`);
    let tag = setAttr(open, "href", to);
    if (/^https?:/i.test(to)) {
      tag = setAttr(tag, "target", "_blank");
      tag = setAttr(tag, "rel", "noopener noreferrer");
    }
    return whole.replace(open, () => tag);
  });
}

const FIELD = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900";
const LABEL = "block text-sm font-medium text-gray-800";
const BTN = "rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-700";
const field = (name, label, type = "text", extra = "") =>
  `<label class="${LABEL}">${label}<input class="${FIELD} mt-1" type="${type}" name="${name}" ${extra}></label>`;
const honeypot = `<div style="position:absolute;left:-9999px" aria-hidden="true"><input type="text" name="_gurost_hp" tabindex="-1" autocomplete="off"></div>`;

function orderSection() {
  return `
<section id="order" data-gurost="order" class="px-6 py-16" style="scroll-margin-top:5rem">
  <div class="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg" style="color:#111">
    <h2 class="text-3xl font-bold">Place an order or booking</h2>
    <p class="mt-2 text-gray-600">Tell us what you'd like and when. We'll confirm by email or phone.</p>
    <form id="order-form" data-form-kind="order" class="mt-6 grid gap-4 sm:grid-cols-2" style="position:relative">
      ${field("name", "Your name", "text", "required autocomplete=\"name\"")}
      ${field("email", "Email", "email", "required autocomplete=\"email\"")}
      ${field("phone", "Phone", "tel", "required autocomplete=\"tel\"")}
      ${field("item", "What would you like?", "text", "required")}
      ${field("quantity", "Quantity", "number", "required min=\"1\" value=\"1\"")}
      ${field("pickup_time", "Pickup or booking time", "datetime-local", "required")}
      <label class="${LABEL} sm:col-span-2">Notes (optional)<textarea class="${FIELD} mt-1" name="notes" rows="3"></textarea></label>
      ${honeypot}
      <div class="sm:col-span-2"><button type="submit" class="${BTN}">Send order</button></div>
    </form>
  </div>
</section>`;
}

function contactSection() {
  return `
<section id="contact" data-gurost="contact" class="px-6 py-16" style="scroll-margin-top:5rem">
  <div class="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg" style="color:#111">
    <h2 class="text-3xl font-bold">Get in touch</h2>
    <form id="contact-form" data-form-kind="contact" class="mt-6 grid gap-4" style="position:relative">
      ${field("name", "Your name", "text", "required autocomplete=\"name\"")}
      ${field("email", "Email", "email", "required autocomplete=\"email\"")}
      <label class="${LABEL}">Message<textarea class="${FIELD} mt-1" name="message" rows="4" required></textarea></label>
      ${honeypot}
      <div><button type="submit" class="${BTN}">Send message</button></div>
    </form>
  </div>
</section>`;
}

function mapSection(address) {
  const q = encodeURIComponent(address);
  return `
<section id="location" data-gurost="map" class="px-6 pb-16">
  <div class="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lg">
    <iframe title="Map of ${esc(address)}" src="https://www.google.com/maps?q=${q}&output=embed" width="100%" height="360" style="border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    <p class="p-4 text-center text-sm" style="color:#111"><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener noreferrer" class="underline">Open ${esc(address)} in Google Maps</a></p>
  </div>
</section>`;
}

function formScript(endpoint) {
  const url = JSON.stringify(endpoint).replace(/</g, "\\u003c");
  return `
<script data-gurost-forms>
(function () {
  var ENDPOINT = ${url};
  var OK = { order: "Thanks - your order request is in. We'll confirm it shortly.", contact: "Thanks - we've got your message and will be in touch soon." };
  function status(form) {
    var el = form.parentNode.querySelector("[data-form-status]");
    if (!el) {
      el = document.createElement("p");
      el.setAttribute("data-form-status", "");
      el.setAttribute("role", "status");
      el.style.cssText = "margin-top:1rem;font-weight:600";
      form.parentNode.insertBefore(el, form.nextSibling);
    }
    return el;
  }
  function kindOf(f) {
    var k = f.getAttribute("data-form-kind");
    if (k) return k;
    // An order form the design wrote itself: inside #order (where the
    // prompt puts it), or with order fields - "pickup" counts too.
    if (f.closest("#order")) return "order";
    return f.querySelector('[name="quantity"],[name="item"],[name="pickup_time"],[name="pickup"]') ? "order" : "contact";
  }
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || f.tagName !== "FORM") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (f.getAttribute("data-sending")) return;
    var fields = {}, honey = "";
    Array.prototype.forEach.call(f.elements, function (el) {
      var n = el.name || el.id;
      if (!n || el.type === "submit" || el.type === "button" || el.type === "password" || el.type === "file") return;
      if (el.type === "checkbox" && !el.checked) return;
      var v = String(el.value || "").trim().slice(0, 2000);
      // The spam trap has a name no real form uses: a design's own "website"
      // field (B2B forms ask for one) must be saved, not read as a bot.
      if (n === "_gurost_hp") { honey = v; return; }
      if (v) fields[n] = v;
    });
    var kind = kindOf(f), msg = status(f), btn = f.querySelector('[type="submit"],button:not([type])');
    f.setAttribute("data-sending", "1");
    if (btn) btn.disabled = true;
    msg.style.color = "inherit";
    msg.textContent = "Sending...";
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: kind, fields: fields, website: honey }) })
      .then(function (r) { if (!r.ok) throw new Error("bad status"); return r.json(); })
      .then(function () { msg.style.color = "#15803d"; msg.textContent = OK[kind] || OK.contact; f.reset(); })
      .catch(function () { msg.style.color = "#b91c1c"; msg.textContent = "Sorry, that didn't send. Please try again in a moment."; })
      .then(function () { f.removeAttribute("data-sending"); if (btn) btn.disabled = false; });
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button");
    if (!b || b.getAttribute("type") === "submit" || b.form || b.closest("form") || b.getAttribute("onclick") || b.getAttribute("data-gurost-skip")) return;
    var t = (b.textContent || "").toLowerCase();
    var go = /\\b(order|book|booking|reserve|checkout|buy)\\b/.test(t) ? "order" : /\\b(contact|get in touch|enquire|enquiry|visit|find us)\\b/.test(t) ? "contact" : null;
    var el = go && document.getElementById(go);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    var i = el.querySelector("input,textarea,select");
    if (i) setTimeout(function () { try { i.focus({ preventScroll: true }); } catch (x) {} }, 500);
  });
})();
</script>`;
}

function injectBefore(html, re, block) {
  return re.test(html) ? html.replace(re, (m) => `${block}\n${m}`) : html + block;
}

function hardenSite(html, { businessInfo = null, formEndpoint = null } = {}) {
  let page = String(html);
  const report = { fixed: [], removed: [], added: [] };
  if (/data-gurost-forms/.test(page)) return { html: page, report }; // already done

  const hadId = (id) => new RegExp(`\\sid\\s*=\\s*["']${id}["']`, "i").test(page);
  let block = "";
  if (!hadId("order")) { block += orderSection(); report.added.push("order form"); }
  if (!hadId("contact")) { block += contactSection(); report.added.push("contact form"); }
  if (businessInfo?.address && !/google\.[a-z.]+\/maps/i.test(page)) { block += mapSection(businessInfo.address); report.added.push("Google Maps embed"); }
  if (block) page = injectBefore(page, /<footer\b/i, block);

  if (!/<body\b[^>]*\sid\s*=/i.test(page)) page = page.replace(/<body\b/i, () => '<body id="top"');
  page = fixLinks(page, businessInfo, report);
  if (formEndpoint) {
    page = /<\/body\s*>/i.test(page) ? page.replace(/<\/body\s*>/i, (m) => `${formScript(formEndpoint)}\n${m}`) : page + formScript(formEndpoint);
    report.added.push("form handler");
  }
  return { html: page, report };
}

// The "no dead links" check: every anchor that goes nowhere.
function findDeadLinks(html) {
  const ids = idsIn(String(html));
  const dead = [];
  for (const m of String(html).matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    const open = /^<a\b[^>]*>/i.exec(m[0])[0];
    if (isDeadHref(attr(open, "href"), ids)) dead.push(textOf(m[0]) || open);
  }
  return dead;
}

module.exports = { hardenSite, findDeadLinks };

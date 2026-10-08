/**
 * Image Bot — sources real stock photography and inserts it into
 * generated pages. Two providers, tried in order (first configured key
 * wins): Pixabay, then Unsplash — both free tiers. Stock video comes
 * from Pixabay too (searchVideo).
 *
 * "Make this page look professional" is handled as: Claude picks 2-4
 * search queries appropriate to the page's content (not literally the
 * user's phrase — "professional bakery interior," not "professional"),
 * the bot fetches real photo URLs for those queries, then a second
 * Claude call inserts them into the actual HTML at sensible spots (hero
 * background, section images) rather than this module guessing at DOM
 * structure with regex.
 */

const { callClaude } = require("./lib/claude-client");

const QUERY_SYSTEM = `You are picking stock photo search queries for a webpage.

Given the page's business context and current HTML, output 2-4 specific, concrete image search queries that would find real stock photos fitting this page's content — not the literal word "professional," actual visual subjects.

Output ONLY valid JSON: {"queries": ["...", "..."]}

Rules:
- Each query should be 2-5 words, specific enough to return relevant real photos ("modern bakery storefront" not "bakery").
- Match the number of queries to how many distinct image spots the page plausibly needs (hero, 1-2 section images) — don't pad to 4 if the page only needs one.`;

const INSERT_SYSTEM = `You are inserting real photo URLs into an existing HTML page at sensible spots.

Given the current HTML and a list of {query, url} image results, output the updated HTML with images inserted — as a hero background, <img> tags in relevant sections, etc. Match images to the section their query was chosen for.

Output ONLY valid JSON: {"html": "<complete updated HTML document>", "summary": "one sentence"}

Rules:
- Only insert images where they clearly improve the page — don't force an image into every section.
- Preserve all existing content and structure that isn't directly related to image placement.
- Use proper alt text describing what the image actually shows.`;

async function searchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`, {
    headers: { Authorization: `Client-ID ${key}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.results?.[0];
  return photo ? { url: photo.urls.regular, credit: `Photo by ${photo.user.name} on Unsplash`, provider: "unsplash" } : null;
}

// Pixabay hands out photo links (pixabay.com/get/...) that expire and
// must not be hotlinked, so a found photo is downloaded and stored in
// the project-assets bucket like a generated image. If that fails the
// photo is skipped (the caller falls back) rather than shipping a link
// that breaks later.
async function storeRemoteImage(url, folder = "stock") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const type = res.headers.get("content-type") || "image/jpeg";
  const ext = { "image/png": "png", "image/webp": "webp" }[type] || "jpg";
  const { supabase } = require("./lib/db");
  const path = `${folder}/${require("crypto").randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("project-assets").upload(path, Buffer.from(await res.arrayBuffer()), { contentType: type });
  if (error) throw error;
  return supabase.storage.from("project-assets").getPublicUrl(path).data.publicUrl;
}

async function searchPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !String(query || "").trim()) return null;
  const q = encodeURIComponent(String(query).slice(0, 100)); // Pixabay's limit
  const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${q}&per_page=3&image_type=photo&orientation=horizontal&safesearch=true`);
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.hits?.[0];
  if (!photo) return null;
  try {
    return { url: await storeRemoteImage(photo.largeImageURL), credit: `Photo by ${photo.user} on Pixabay`, provider: "pixabay" };
  } catch (err) {
    console.error("[image-bot] Storing Pixabay photo failed, skipping it:", err.message);
    return null;
  }
}

/**
 * Openverse (api.openverse.org) - openly licensed photos (Flickr,
 * Wikimedia and more), no key. The fallback after Pixabay, before any
 * paid generation. ONLY CC0 and public-domain photos (licence "cc0,pdm"):
 * those need no credit, so nothing has to be shown on a customer's page
 * (the CC "by" licences do, and are no longer used). Only large photos
 * (results are often 500px thumbnails). The credit string is kept on the
 * project record and in the log, never in the page. Stored in
 * project-assets like a Pixabay photo, never hotlinked.
 */
const OPENVERSE_MIN_WIDTH = 1000;

async function searchOpenverse(query) {
  if (!String(query || "").trim()) return null;
  const q = encodeURIComponent(String(query).slice(0, 100));
  const res = await fetch(`https://api.openverse.org/v1/images/?q=${q}&license=cc0,pdm&size=large&mature=false&page_size=8`).catch(() => null);
  if (!res || !res.ok) return null;
  const data = await res.json().catch(() => ({}));
  // The query already asks for CC0 / public domain; this holds even if the API ever answers with another licence.
  const photo = (data.results || []).find((p) => p.url && (p.width || 0) >= OPENVERSE_MIN_WIDTH && /^(cc0|pdm)$/i.test(String(p.license || "")));
  if (!photo) return null;
  const license = `CC ${String(photo.license || "").toUpperCase()} ${photo.license_version || ""}`.trim().replace(/^CC (CC0|PDM)/, "$1");
  const credit = `${photo.title ? `"${String(photo.title).slice(0, 60)}" ` : "Photo "}by ${photo.creator || "unknown"} (${license}, via Openverse)`;
  try {
    return { url: await storeRemoteImage(photo.url), credit, provider: "openverse" };
  } catch (err) {
    console.error("[image-bot] Storing Openverse photo failed, skipping it:", err.message);
    return null;
  }
}

/**
 * Tries providers in order until one returns a result. Set
 * IMAGE_PROVIDER_ORDER (comma-separated: pixabay,openverse,unsplash) to
 * change priority — defaults to that order.
 */
async function searchImage(query) {
  const order = (process.env.IMAGE_PROVIDER_ORDER || "pixabay,openverse,unsplash").split(",").map((s) => s.trim());
  const providers = { unsplash: searchUnsplash, pixabay: searchPixabay, openverse: searchOpenverse };
  for (const name of order) {
    const fn = providers[name];
    if (!fn) continue;
    const result = await fn(query);
    if (result) return result;
  }
  return null;
}

async function enhanceWithImages(html, businessContext) {
  const { parsed: queryPlan } = await callClaude({
    system: QUERY_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify({ businessContext, html: html.slice(0, 3000) }) }],
    maxTokens: 300
  });

  const results = await Promise.all(
    queryPlan.queries.map(async (query) => ({ query, image: await searchImage(query) }))
  );
  const found = results.filter((r) => r.image);

  if (found.length === 0) {
    return { html, summary: "No image provider configured or no results found — page unchanged.", images: [] };
  }

  const { parsed } = await callClaude({
    system: INSERT_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({
        html,
        images: found.map((r) => ({ query: r.query, url: r.image.url }))
      })
    }],
    maxTokens: 8000
  });

  return {
    html: parsed.html,
    summary: parsed.summary,
    images: found.map((r) => ({ query: r.query, url: r.image.url, credit: r.image.credit, provider: r.image.provider }))
  };
}

/**
 * Real AI image generation — a genuinely different, appropriate use
 * case from sketch-bot.js's diagrams, not a contradiction of that
 * reasoning. Diffusion/generative image models are unreliable at
 * exact text and precise structural layout (the whole reason
 * sketch-bot.js uses Mermaid instead) — but a decorative or custom
 * photographic-style visual (a hero image, a product mockup) doesn't
 * need precise text or exact structure, it needs to look right. This
 * IS the appropriate tool for that job.
 *
 * API VERIFIED CURRENT BEFORE WRITING THIS, NOT ASSUMED: DALL-E 2/3
 * are deprecated as of the OpenAI API's own May 2026 sunset notice —
 * what training data would confidently produce is no longer the
 * current model family. Current: GPT Image (gpt-image-1 or newer),
 * called via the same `images.generate` method name, but with a real,
 * different response shape — base64 (`data[0].b64_json`), not a URL
 * like the old DALL-E response. Built against that.
 *
 * Deliberately a direct OpenAI call, not routed through OpenRouter —
 * OpenRouter (lib/openrouter-client.js) was only ever established in
 * this codebase for chat completions; there's no evidence it proxies
 * image generation, and guessing it does rather than checking would
 * be the same mistake already caught and corrected elsewhere in this
 * build. Needs its own real OPENAI_API_KEY.
 */
async function generateCustomImage(description, { size = "1024x1024" } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured — AI image generation needs its own key, separate from OmniRoute's providers.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: "gpt-image-1", prompt: description, size, n: 1 })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Image generation failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new Error("Image generation returned no image data.");

  return { base64, mimeType: "image/png", description };
}

/**
 * Real Google Gemini image generation — "Nano Banana" (Gemini 2.5/3.1
 * Flash Image). Genuinely, currently free for meaningful use: Google
 * AI Studio's real free tier allows up to 500 images/day at zero cost
 * (verified directly before writing this, not assumed) - beyond that,
 * real, low, per-image pricing applies. A real, second, independent
 * option alongside generateCustomImage() above, not a replacement for
 * it — OpenAI needs its own key regardless, so having a real,
 * genuinely free-tier alternative matters.
 *
 * Real, current Gemini API shape (verified before writing, not
 * assumed from older training data): POST to
 * generativelanguage.googleapis.com's generateContent endpoint,
 * response holds the generated image as base64 in
 * candidates[0].content.parts[].inlineData.data - a materially
 * different response shape from OpenAI's images.generate, so this is
 * genuinely its own implementation, not a thin wrapper.
 *
 * Needs a real GEMINI_API_KEY - get one free at aistudio.google.com.
 */
async function generateImageWithGemini(description, { model = "gemini-2.5-flash-image" } = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured — get a real, free key at aistudio.google.com.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: description }] }]
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image generation failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) throw new Error("Gemini returned no real image data — it may have declined the prompt.");

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
    description,
    provider: "gemini"
  };
}

/**
 * Real, honest router - tries Gemini first (genuinely free tier),
 * falls back to OpenAI if Gemini isn't configured or fails. Whichever
 * real key you've actually set determines what runs; if neither key
 * exists, this throws a real, clear error rather than pretending to
 * generate something.
 */
async function generateImage(description, options = {}) {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateImageWithGemini(description, options);
    } catch (err) {
      console.error("[image-bot] Real Gemini generation failed, trying OpenAI fallback:", err.message);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    const result = await generateCustomImage(description, options);
    return { ...result, provider: "openai" };
  }
  throw new Error("No real image generation provider configured — set GEMINI_API_KEY (free) or OPENAI_API_KEY.");
}

/**
 * generateImage, then store the result in the public "project-assets"
 * bucket and return its URL. Generated pages used to inline the image as
 * a base64 data URL - one image was ~3M characters of page HTML, which
 * overflowed the model context on every later Pulse edit and bloated
 * share/download. If the upload fails the image is still inlined, so a
 * storage problem never costs the build its image.
 */
/**
 * FLUX.2 Klein through OpenRouter's Image API (same OPENROUTER_API_KEY as
 * every model call; ~$0.015 per 16:9 image vs ~$0.039 for Gemini).
 * The image is stored in project-assets like a Gemini one; if storing
 * fails this throws instead of inlining ~1MB of base64 into the page, so
 * the caller falls through to its next source.
 * Returns { url, cost } - cost in USD as OpenRouter reports it.
 */
const FLUX_MODEL = process.env.FLUX_MODEL || "black-forest-labs/flux.2-klein-4b";

async function generateFluxImageUrl(description, { aspectRatio = "16:9" } = {}) {
  const { OPENROUTER_BASE_URL } = require("./lib/openrouter-client");
  const res = await fetch(`${OPENROUTER_BASE_URL}/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://gurost.onrender.com",
      "X-Title": "Gurost"
    },
    body: JSON.stringify({ model: FLUX_MODEL, prompt: String(description).slice(0, 2000), aspect_ratio: aspectRatio, output_format: "jpeg", n: 1 })
  });
  const data = await res.json().catch(() => ({}));
  const b64 = data?.data?.[0]?.b64_json;
  if (!res.ok || !b64) throw new Error(`FLUX image failed (${res.status}): ${JSON.stringify(data?.error || data).slice(0, 200)}`);
  const type = data.data[0].media_type || "image/jpeg";
  const { supabase } = require("./lib/db");
  const path = `generated/flux-${require("crypto").randomUUID()}.${type === "image/png" ? "png" : "jpg"}`;
  const { error } = await supabase.storage.from("project-assets").upload(path, Buffer.from(b64, "base64"), { contentType: type });
  if (error) throw new Error(`Storing FLUX image failed: ${error.message}`);
  return { url: supabase.storage.from("project-assets").getPublicUrl(path).data.publicUrl, cost: Number(data.usage?.cost) || 0.015 };
}

async function generateImageUrl(description, options = {}) {
  const img = await generateImage(description, options);
  try {
    const { supabase } = require("./lib/db");
    const ext = { "image/jpeg": "jpg", "image/webp": "webp" }[img.mimeType] || "png";
    const path = `generated/${require("crypto").randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("project-assets").upload(path, Buffer.from(img.base64, "base64"), {
      contentType: img.mimeType,
    });
    if (error) throw error;
    return supabase.storage.from("project-assets").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error("[image-bot] Storing generated image failed, inlining it instead:", err.message);
    return `data:${img.mimeType};base64,${img.base64}`;
  }
}

// The MP4 rendition to embed from a Pixabay hit's `videos` object
// ({ large, medium, small, tiny }, each { url, width, height, size,
// thumbnail }): the smallest one at least 1280px wide (sharp on a
// desktop hero without a 4K download), else the largest smaller one.
// Pixabay leaves url empty for renditions it doesn't have.
function pickVideoFile(videos) {
  const files = Object.values(videos || {}).filter((f) => f && f.url && f.width);
  const big = files.filter((f) => f.width >= 1280 && f.width <= 2560).sort((a, b) => a.width - b.width);
  if (big.length) return big[0];
  return files.filter((f) => f.width < 1280).sort((a, b) => b.width - a.width)[0] || null;
}

/**
 * Free stock video from Pixabay (same PIXABAY_API_KEY as photos).
 * Returns { url, poster, credit, provider } or null when there is no
 * key, no result or no usable MP4. Video files live on Pixabay's CDN
 * (cdn.pixabay.com/video/...) and are linked, not copied - a clip is
 * 5-20MB.
 */
async function searchVideo(query, { orientation = "landscape" } = {}) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !String(query || "").trim()) return null;
  const q = encodeURIComponent(String(query).slice(0, 100));
  const res = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${q}&per_page=10&video_type=film&safesearch=true`);
  if (!res.ok) return null;
  const data = await res.json();
  const hits = data.hits || [];
  // Background loops: landscape, short (loop well, download fast).
  const shaped = (h) => {
    const f = pickVideoFile(h.videos);
    return f && (orientation !== "landscape" || f.width > f.height) ? f : null;
  };
  const preferred = hits.filter((h) => !h.duration || h.duration <= 40);
  for (const h of [...preferred, ...hits.filter((h) => !preferred.includes(h))]) {
    const file = shaped(h);
    if (file) return { url: file.url, poster: file.thumbnail || "", credit: `Video by ${h.user || "a Pixabay creator"} on Pixabay`, provider: "pixabay" };
  }
  return null;
}

/**
 * FLUX through fal.ai (FAL_API_KEY - fal's own docs call it FAL_KEY, both
 * work). Paid plans only - see bots/premium-images.js and variant-bot.
 *   pro      fal-ai/flux-pro/v1.1  $0.04 per megapixel  (hero, on the picked design)
 *   dev      fal-ai/flux/dev       $0.025 per megapixel (key section images)
 *   schnell  fal-ai/flux/schnell   $0.003 per megapixel (build-time fill-in)
 * fal bills each image rounded UP to the next megapixel, so sizes stay
 * just under 1MP (1280x720 = 0.92MP). The image is copied into
 * project-assets - fal's media links aren't promised to last.
 * After a 401/402/403 (no credit, bad key - seen: 403 "User is locked.
 * Reason: TOP_UP") fal is skipped for 10 minutes, so builds fall straight
 * through to the next source instead of each waiting on the same error.
 * Returns { url, cost, model }.
 */
const FAL_MODELS = {
  pro: { id: "fal-ai/flux-pro/v1.1", perMegapixel: 0.04, label: "FLUX Pro" },
  dev: { id: "fal-ai/flux/dev", perMegapixel: 0.025, label: "FLUX Dev" },
  schnell: { id: "fal-ai/flux/schnell", perMegapixel: 0.003, label: "FLUX Schnell" }
};
const FAL_SIZES = { "16:9": { width: 1280, height: 720 }, "4:3": { width: 1024, height: 768 } };
const FAL_PAUSE_MS = 10 * 60 * 1000;
let falPausedUntil = 0;
const falKey = () => process.env.FAL_API_KEY || process.env.FAL_KEY || "";
const falAvailable = () => Boolean(falKey()) && Date.now() >= falPausedUntil;

async function generateFalImageUrl(description, { model = "dev", aspectRatio = "16:9" } = {}) {
  const m = FAL_MODELS[model];
  if (!m) throw new Error(`Unknown fal model "${model}"`);
  if (!falKey()) throw new Error("FAL_API_KEY not configured");
  if (Date.now() < falPausedUntil) throw new Error("fal.ai paused after a billing/auth error");
  const size = FAL_SIZES[aspectRatio] || FAL_SIZES["16:9"];
  const res = await fetch(`https://fal.run/${m.id}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: String(description).slice(0, 2000), image_size: size, num_images: 1, output_format: "jpeg", enable_safety_checker: true })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if ([401, 402, 403].includes(res.status)) falPausedUntil = Date.now() + FAL_PAUSE_MS;
    throw new Error(`fal.ai ${m.label} failed (${res.status}): ${JSON.stringify(data.detail || data).slice(0, 200)}`);
  }
  const image = data.images?.[0];
  if (!image?.url) throw new Error(`fal.ai ${m.label} returned no image`);
  const megapixels = Math.ceil(((image.width || size.width) * (image.height || size.height)) / 1e6);
  return { url: await storeRemoteImage(image.url, "generated"), cost: Math.round(megapixels * m.perMegapixel * 1000) / 1000, model: m.label };
}

module.exports = { enhanceWithImages, searchImage, searchOpenverse, searchVideo, pickVideoFile, generateFluxImageUrl, generateFalImageUrl, falAvailable, FAL_MODELS, generateCustomImage, generateImageWithGemini, generateImage, generateImageUrl, _resetFalPause: () => { falPausedUntil = 0; } };


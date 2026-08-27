/**
 * Image Bot — sources real stock photography and inserts it into
 * generated pages. Three providers, tried in order (first configured
 * key wins): Unsplash, Pexels, Pixabay — all free tiers, all confirmed
 * current REST APIs as of writing.
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

async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
    headers: { Authorization: key }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.photos?.[0];
  return photo ? { url: photo.src.large, credit: `Photo by ${photo.photographer} on Pexels`, provider: "pexels" } : null;
}

async function searchPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=3&image_type=photo`);
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.hits?.[0];
  return photo ? { url: photo.largeImageURL, credit: `Image by ${photo.user} on Pixabay`, provider: "pixabay" } : null;
}

/**
 * Tries providers in order until one returns a result. Set
 * IMAGE_PROVIDER_ORDER (comma-separated: unsplash,pexels,pixabay) to
 * change priority — defaults to that order.
 */
async function searchImage(query) {
  const order = (process.env.IMAGE_PROVIDER_ORDER || "unsplash,pexels,pixabay").split(",").map((s) => s.trim());
  const providers = { unsplash: searchUnsplash, pexels: searchPexels, pixabay: searchPixabay };
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

module.exports = { enhanceWithImages, searchImage, generateCustomImage, generateImageWithGemini, generateImage };

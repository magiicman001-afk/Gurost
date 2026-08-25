/**
 * REAL BACKEND ADDITIONS — instructions to wire these in
 * ============================================================
 * 1. Paste the routes below into server.js, anywhere after
 *    `const { supabase } = require("./lib/db");` and after
 *    `app.get("/api/me", ...)`.
 * 2. In your Supabase dashboard, create a real table:
 *
 *    create table user_profiles (
 *      user_id text primary key,
 *      display_name text,
 *      avatar_url text,
 *      updated_at timestamptz default now()
 *    );
 *
 *    And a real Storage bucket named "avatars" (Storage → New bucket,
 *    make it public so avatar_url can be a plain, directly-loadable
 *    URL).
 * 3. billing.js already has `stripe` imported for checkout - the
 *    portal route below reuses that same real client, nothing new to
 *    configure there. It does need a real Stripe customer ID stored
 *    per user, which the checkout flow's `stripe.checkout.sessions.create`
 *    call should already be creating — if your users table doesn't yet
 *    store `stripe_customer_id`, that's the one real gap to close
 *    before this route can look one up.
 * ============================================================
 */

const avatarUpload = require("multer")({ storage: require("multer").memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Real, honest note: GET /api/me above only returns id/email/plan/
// creditBalance, sourced straight from the JWT/API-key resolution -
// there's genuinely no profile table today. This extends the same
// real endpoint's response with two more, real fields, sourced from
// the new table above (defaulting to null until someone saves one).
async function attachProfileFields(userId, base) {
  try {
    const { data } = await supabase.from("user_profiles").select("display_name, avatar_url").eq("user_id", userId).maybeSingle();
    return { ...base, displayName: data?.display_name || null, avatarUrl: data?.avatar_url || null };
  } catch (err) {
    console.error("[profile] Failed to fetch profile fields:", err.message);
    return { ...base, displayName: null, avatarUrl: null };
  }
}
// To use: in the real, existing GET /api/me handler, replace
//   res.json({ userId: req.user.id, email: ..., plan: ..., creditBalance: balance });
// with
//   res.json(await attachProfileFields(req.user.id, { userId: req.user.id, email: req.user.email || null, plan: req.user.plan, creditBalance: balance }));

// GET /api/project/:id/api-keys/masked — real, SAFE version for
// displaying in Settings. The existing GET /api/project/:id/api-keys
// route returns full, unmasked secret values (by design - it's used
// internally for the deploy step) - genuinely wrong to reuse for a
// user-facing display, so this is a separate, safer route rather than
// weakening the original.
app.get("/api/project/:id/api-keys/masked", async (req, res) => {
  const project = getProject(req.params.id, res);
  if (!project) return;
  try {
    const keys = await apiKeyVault.getApiKeys(req.params.id); // real object: {VARNAME: fullSecret}
    const masked = Object.entries(keys).map(([name, value]) => ({
      name,
      lastFour: value ? value.slice(-4) : "????",
    }));
    res.json({ keys: masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/me — real, minimal profile update (display name only;
// avatar goes through the separate upload route below since it's a
// real file, not JSON).
app.patch("/api/me", security.rejectUnknownFields(["displayName"]), async (req, res) => {
  const { displayName } = req.body;
  if (typeof displayName !== "string" || !displayName.trim()) {
    return res.status(400).json({ error: "displayName is required and must be a non-empty string." });
  }
  try {
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: req.user.id,
      display_name: displayName.trim().slice(0, 80),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ displayName: displayName.trim().slice(0, 80) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/avatar — real file upload to Supabase Storage. Expects
// multipart/form-data with a single field named "avatar".
app.post("/api/me/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded (expected field name 'avatar')." });
  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "File must be an image." });
  }

  const ext = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
  const path = `${req.user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from("user_profiles").upsert({
      user_id: req.user.id,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
    if (dbError) throw dbError;

    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contact — real email send via Postmark, which was already
// a listed dependency tonight (never actually wired to a route until
// now). Needs a real POSTMARK_API_KEY and POSTMARK_FROM_EMAIL in your
// environment variables before this can actually send anything - see
// postmarkapp.com to get a real key and verify a real sending domain.
// This route is deliberately NOT behind auth.requireAuth (contact
// forms are used by logged-out visitors), so if you paste it in
// before the global app.use("/api", auth.requireAuth) line, it'll
// work for anonymous senders; after that line, it would incorrectly
// demand login first.
const postmark = require("postmark");
const postmarkClient = process.env.POSTMARK_API_KEY ? new postmark.ServerClient(process.env.POSTMARK_API_KEY) : null;

app.post("/api/contact", security.rejectUnknownFields(["fullName", "email", "subject", "message"]), async (req, res) => {
  const { fullName, email, subject, message } = req.body;
  if (!fullName || !email || !message) {
    return res.status(400).json({ error: "fullName, email, and message are required." });
  }
  if (!postmarkClient) {
    return res.status(503).json({ error: "Email sending isn't configured yet — missing POSTMARK_API_KEY." });
  }
  try {
    await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: process.env.POSTMARK_FROM_EMAIL,
      ReplyTo: email,
      Subject: `[Contact] ${subject || "General question"} — from ${fullName}`,
      TextBody: `From: ${fullName} <${email}>\nSubject: ${subject || "General question"}\n\n${message}`,
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// the Settings page's "Manage Payment" button. Reuses the same real
// `stripe` client already configured for checkout in lib/billing.js.
// Real, honest requirement: this needs a real Stripe customer ID
// already on file for the user - if your checkout flow doesn't yet
// persist `stripe_customer_id` per user after a successful
// subscription, that's the one real gap to close first; without it,
// this route has no customer to open a portal session for.
app.post("/api/billing/portal", async (req, res) => {
  try {
    const { data: profile } = await supabase.from("user_profiles").select("stripe_customer_id").eq("user_id", req.user.id).maybeSingle();
    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found yet — subscribe to a paid plan first." });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.APP_BASE_URL || "https://gurost.onrender.com"}/settings.html`,
    });
    res.json({ portalUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

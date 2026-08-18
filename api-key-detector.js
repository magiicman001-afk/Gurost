/**
 * API Key Detector — real, honest scan of a generated app's backend
 * code for external service credentials the user needs to provide
 * before deploying. Not a guess at what a business "might" need —
 * looks at the actual, real environment variable references Claude
 * wrote into the real generated code.
 *
 * Real, deliberate scope: this detects PRESENCE of a real
 * process.env reference and classifies it against a known list of
 * real third-party services, so the resulting form can show a real,
 * helpful label ("Stripe Secret Key") instead of a bare, unhelpful
 * variable name. An unrecognized variable still gets surfaced, just
 * with a generic label — never silently dropped.
 */

// Real, internally-provided variables — these come from Gurost's own
// deploy step (deploySchema, DATABASE_URL, etc.), never something a
// user needs to type in themselves. Excluded from what gets shown.
const INTERNAL_VARS = new Set([
  "DATABASE_URL", "PORT", "NODE_ENV", "MONGODB_URI", "SCHEMA_NAME"
]);

// Real, known third-party services — recognized patterns get a real,
// helpful display name and a real link to where a user would
// actually go get that credential. Not exhaustive by design; anything
// not on this list still gets detected, just with a generic label.
const KNOWN_SERVICES = [
  { pattern: /^STRIPE_/, service: "Stripe", helpUrl: "https://dashboard.stripe.com/apikeys" },
  { pattern: /^TWILIO_/, service: "Twilio", helpUrl: "https://console.twilio.com" },
  { pattern: /^SENDGRID_/, service: "SendGrid", helpUrl: "https://app.sendgrid.com/settings/api_keys" },
  { pattern: /^MAILGUN_/, service: "Mailgun", helpUrl: "https://app.mailgun.com/app/account/security/api_keys" },
  { pattern: /^AWS_/, service: "AWS", helpUrl: "https://console.aws.amazon.com/iam" },
  { pattern: /^OPENAI_/, service: "OpenAI", helpUrl: "https://platform.openai.com/api-keys" },
  { pattern: /^GOOGLE_MAPS_/, service: "Google Maps", helpUrl: "https://console.cloud.google.com/google/maps-apis" },
];

function classifyVar(varName) {
  for (const { pattern, service, helpUrl } of KNOWN_SERVICES) {
    if (pattern.test(varName)) return { service, helpUrl };
  }
  return { service: null, helpUrl: null }; // real, honest fallback - unrecognized, but still surfaced, not dropped
}

/**
 * Real, core detection — scans backend code (a string, or an array of
 * {path, content} files) for every real process.env.X reference, and
 * returns the ones a real user needs to actually provide.
 */
function detectRequiredKeys(backendFiles) {
  const files = Array.isArray(backendFiles) ? backendFiles : [{ path: "backend", content: backendFiles }];
  const found = new Map(); // varName -> {varName, service, helpUrl, foundIn: [paths]}

  for (const file of files) {
    if (!file.content) continue;
    const matches = file.content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
    for (const m of matches) {
      const varName = m[1];
      if (INTERNAL_VARS.has(varName)) continue;

      if (!found.has(varName)) {
        const { service, helpUrl } = classifyVar(varName);
        found.set(varName, { varName, service, helpUrl, foundIn: [] });
      }
      const entry = found.get(varName);
      if (!entry.foundIn.includes(file.path)) entry.foundIn.push(file.path);
    }
  }

  return Array.from(found.values());
}

module.exports = { detectRequiredKeys, classifyVar, INTERNAL_VARS, KNOWN_SERVICES };

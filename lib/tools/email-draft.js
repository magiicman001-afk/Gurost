/**
 * Email draft tool. It only PREPARES a draft for the user to look over and
 * send themselves; nothing is sent (there is no email connection yet). The
 * result is shown on the page as a card with Copy and Open-in-email buttons.
 */
const EMAIL = /^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[^\s@<>(),;:\\"]{2,}$/;
const oneLine = (s) => String(s || "").replace(/[\r\n]+/g, " ").trim();

module.exports = {
  name: "email_draft",
  description: "Prepare an email draft for the user to review and send themselves. Use it whenever the user asks you to write an email, so they get a ready-to-send card. It does NOT send anything.",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address, or several separated by commas. Leave out if unknown." },
      subject: { type: "string", description: "Subject line" },
      body: { type: "string", description: "The full email text, including greeting and sign-off" }
    },
    required: ["subject", "body"]
  },
  needsApproval: false,
  proposal: "email",
  async execute({ to, subject, body }) {
    const addresses = String(to || "").split(",").map((a) => a.trim()).filter(Boolean);
    const bad = addresses.find((a) => !EMAIL.test(a));
    if (bad) throw new Error(`"${bad.slice(0, 60)}" is not a valid email address. Leave the recipient out if you do not know it.`);
    if (addresses.length > 10) throw new Error("That is too many recipients for one draft.");
    const subj = oneLine(subject).slice(0, 200);
    const text = String(body || "").replace(/\u0000/g, "").trim().slice(0, 5000);
    if (!subj) throw new Error("The email needs a subject.");
    if (!text) throw new Error("The email needs a body.");
    return { type: "email", to: addresses, subject: subj, body: text, sent: false };
  }
};

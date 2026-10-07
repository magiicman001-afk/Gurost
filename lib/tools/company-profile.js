/**
 * Looks up the user's OWN saved company profile (name, website, industry,
 * customers, socials, research notes) so a bot does not have to ask for it.
 * Read-only and scoped to ctx.userId. This is the business's profile, not a
 * list of customers: Gurost has no customer database yet.
 */
const MAX_RESEARCH_CHARS = 1500;

module.exports = {
  name: "company_profile",
  description: "Read the user's own saved company profile: name, website, industry, whether they sell to businesses or consumers, target customer, social handles, and any saved research notes. Use it before asking the user for details about their own business.",
  parameters: { type: "object", properties: {} },
  needsApproval: false,
  async execute(_args, ctx = {}) {
    if (!ctx.db || !ctx.userId) throw new Error("The profile is not available right now.");
    const { data, error } = await ctx.db.from("company_profiles").select("name, website, industry, type, target, socials, research_data").eq("user_id", ctx.userId);
    if (error) throw new Error("The profile could not be read right now.");
    const row = data && data[0];
    if (!row) return { found: false, message: "The user has not saved a company profile yet. Ask them for the details you need." };
    const research = row.research_data ? JSON.stringify(row.research_data).slice(0, MAX_RESEARCH_CHARS) : null;
    return { found: true, name: row.name, website: row.website, industry: row.industry, sells_to: row.type, target_customer: row.target || null, socials: row.socials || {}, research_notes: research };
  }
};

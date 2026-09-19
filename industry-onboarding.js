/**
 * Industry onboarding for the Ultimate tier.
 *
 * What this actually does: stores a per-user industry selection and
 * injects a curated context document into bot system prompts. What it
 * does NOT do: fine-tune any model, or autonomously research an
 * industry from the web. "Pre-trained knowledge for that sector" means
 * a text document you write and maintain, prepended to prompts — not
 * a trained model. The quality of "industry awareness" is entirely a
 * function of the quality of the document in INDUSTRY_KNOWLEDGE_BASES
 * below. The three included are minimal starter examples, not real
 * sector expertise — replace them with actual curated content (ideally
 * written by someone who's worked in that industry) before this
 * feature does anything beyond what Claude already knows generically.
 *
 * SQL (run once):
 *   create table user_industry (
 *     user_id text primary key,
 *     industry text not null,
 *     selected_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");

// Starter examples only — see file header. Real deployment needs these
// replaced/expanded with actual curated sector knowledge, not left as-is.
const INDUSTRY_KNOWLEDGE_BASES = {
  manufacturing: `Manufacturing/engineering businesses commonly care about: production
throughput, defect/scrap rate, changeover time, equipment uptime, and
safety compliance. Common terminology: OEE (overall equipment
effectiveness), takt time, WIP (work in progress), BOM (bill of
materials). Common pain points: manual scheduling, paper-based quality
records, disconnected shop-floor and office systems.`,

  hospitality: `Hospitality/food-service businesses commonly care about: table
turnover, food cost percentage, labor cost percentage, online review
management, and seasonal demand planning. Common terminology: covers,
comp, POS (point of sale), 86'd (out of stock). Common pain points:
staff scheduling, no-show reservations, inventory waste.`,

  professional_services: `Professional services (consulting, agencies, law firms) commonly
care about: billable utilization rate, client acquisition cost, project
margin, and retainer renewal. Common terminology: utilization,
realization rate, scope creep. Common pain points: inconsistent intake
processes, manual time tracking, proposal turnaround time.`
};

async function selectIndustry(userId, industry) {
  if (!INDUSTRY_KNOWLEDGE_BASES[industry]) {
    throw new Error(`Unknown industry "${industry}". Available: ${Object.keys(INDUSTRY_KNOWLEDGE_BASES).join(", ")}`);
  }
  const { error } = await supabase
    .from("user_industry")
    .upsert({ user_id: userId, industry, selected_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save industry selection: ${error.message}`);
}

async function getIndustryContext(userId) {
  const { data, error } = await supabase
    .from("user_industry")
    .select("industry")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load industry: ${error.message}`);
  if (!data) return null;
  return { industry: data.industry, context: INDUSTRY_KNOWLEDGE_BASES[data.industry] || null };
}

function listIndustries() {
  return Object.keys(INDUSTRY_KNOWLEDGE_BASES);
}

module.exports = { selectIndustry, getIndustryContext, listIndustries, INDUSTRY_KNOWLEDGE_BASES };

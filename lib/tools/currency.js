/**
 * Currency converter using the European Central Bank's reference rates via
 * Frankfurter (free, no key). These are daily reference rates, not what a bank
 * or card would charge, and the tool says so.
 */
const { getJson } = require("./http");

const CACHE = new Map(); // "GBP>USD" -> { at, data }
const CACHE_MS = 10 * 60 * 1000;

module.exports = {
  name: "currency_converter",
  description: "Convert an amount between two currencies at the latest European Central Bank reference rate. Use it for any exchange-rate question instead of guessing a rate. Currencies are 3-letter codes like GBP, USD, EUR.",
  parameters: {
    type: "object",
    properties: {
      amount: { type: "number", description: "How much, e.g. 250" },
      from: { type: "string", description: "Currency code to convert from, e.g. GBP" },
      to: { type: "string", description: "Currency code to convert to, e.g. USD" }
    },
    required: ["amount", "from", "to"]
  },
  needsApproval: false,
  async execute({ amount, from, to }, ctx = {}) {
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) throw new Error("The amount must be a number between 0 and 1,000,000,000,000.");
    const f = String(from).trim().toUpperCase(), t = String(to).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(f) || !/^[A-Z]{3}$/.test(t)) throw new Error("Currencies must be 3-letter codes like GBP or USD.");
    if (f === t) return { amount, from: f, to: t, rate: 1, converted: amount, note: "Same currency." };

    const key = `${f}>${t}`;
    const now = ctx.now ? ctx.now().getTime() : Date.now();
    let data = CACHE.get(key);
    if (!data || now - data.at > CACHE_MS) {
      let json;
      try {
        json = await getJson(`https://api.frankfurter.dev/v1/latest?base=${f}&symbols=${t}`, { fetchFn: ctx.fetch });
      } catch (err) {
        if (err.status === 404 || err.status === 422) throw new Error(`I could not find a rate for ${f} to ${t}. One of those codes may not be supported.`);
        throw new Error("The exchange-rate service is not answering right now.");
      }
      const rate = json && json.rates && Number(json.rates[t]);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`The service had no rate for ${f} to ${t}.`);
      data = { at: now, rate, date: json.date };
      CACHE.set(key, data);
    }
    return { amount, from: f, to: t, rate: data.rate, converted: Math.round(amount * data.rate * 100) / 100, rateDate: data.date, source: "European Central Bank reference rate (not a bank or card rate)" };
  },
  _clearCache() { CACHE.clear(); }
};

"use strict";
// Sample words and photos for the premium tests: one rich model answer per industry, a fake photo search, and a builder
// for "this look, with this copy" that the score and gate tests share. No network.
const L = require("../../bots/library-bot");
const P = require("../../lib/sections/premium");
const { assembleWithImages } = require("../../lib/sections/fill-images");

const NAME = { cafe: "Luvky Bakes", law: "Hart & Co Solicitors", salon: "Studio Nine", trades: "Northside Plumbing", health: "Calm Physio", tech: "Beamly" };
const WHAT = { cafe: "small-batch bread and pastries", law: "clear legal advice for families and small firms", salon: "cuts, colour and styling", trades: "reliable plumbing and heating repairs", health: "gentle, expert physiotherapy", tech: "scheduling software for small teams" };

function sampleModel(palette) {
  const what = WHAT[palette];
  const item = (t, x, icon) => ({ icon: icon || "check", title: t, text: x });
  return {
    brand: NAME[palette],
    description: `${NAME[palette]}: ${what}.`,
    sections: {
      hero: { eyebrow: "Welcome", headline: `${what.charAt(0).toUpperCase()}${what.slice(1)}`.slice(0, 70), subhead: `We take care of the details so you can get on with your day.`, cta1_label: "Get in touch", image_brief: `${palette} business at work` },
      services: { eyebrow: "What we do", title: "Our services", intro: "A short, plain list of what we offer.", items: [item("First thing", "A clear description of the first thing we do for you."), item("Second thing", "A clear description of the second thing we do for you.", "heart"), item("Third thing", "A clear description of the third thing we do for you.", "clock"), item("Fourth thing", "A clear description of the fourth thing we do for you.", "shield")] },
      features: { eyebrow: "Why us", title: "Built around how you work", intro: "Four things that make the day easier.", items: [item("Simple", "Easy to start and easy to keep going.", "sparkle"), item("Reliable", "It does what it says, every time.", "shield"), item("Quick", "Saves time on the things you repeat.", "clock"), item("Friendly", "Real people answer when you ask.", "heart")] },
      about: { eyebrow: "About us", title: "Who we are", body: "We are a small team that cares about doing the work properly. We listen first, explain what we are doing in plain words, and stay in touch until you are happy with the result.", body2: "Everything we do starts from what you actually need, not from a fixed package.", points: [{ text: "Plain, honest advice" }, { text: "Clear next steps" }, { text: "Always a real person" }], image_brief: `${palette} team at work` },
      gallery: { eyebrow: "Our work", title: "A closer look", intro: "A few pictures from the day to day.", images: [1, 2, 3, 4, 5, 6].map((n) => ({ brief: `${palette} detail ${n}`, caption: `Detail ${n}` })) },
      process: { eyebrow: "How it works", title: "From first hello to done", intro: "Three steps, no surprises.", steps: [{ title: "Tell us what you need", text: "A short chat or message is enough to begin." }, { title: "We agree the plan", text: "You see exactly what happens next before anything starts." }, { title: "We get it done", text: "And check back in to make sure you are happy." }] },
      faq: { eyebrow: "Questions", title: "Good questions", intro: "The things people ask us most.", items: [{ question: "How do I get started?", answer: "Send us a message or give us a call and we will take it from there." }, { question: "Can I change my mind?", answer: "Yes. Tell us and we will adjust the plan with you." }, { question: "Where are you based?", answer: "Details are in the contact section of this page." }, { question: "How quickly will you reply?", answer: "As quickly as we can, usually within a working day." }] },
      cta: { title: "Ready when you are", text: "Tell us what you need and we will help you get there.", cta1_label: "Get in touch" },
    },
  };
}

const INFO = { name: "", phone: "0161 496 0000", email: "hello@example.test", address: "12 High Street, Manchester" };
const search = async (q) => ({ url: "https://cdn.pixabay.com/photo/" + encodeURIComponent(String(q).replace(/\s+/g, "-")) + ".jpg", credit: "Pixabay" });

/** Assembles one look with sample copy and photos. Options: info (owner facts), search (photo search), mutate(composed). */
async function buildLook(palette, lookIndex, o = {}) {
  const look = P.looksFor(palette)[lookIndex];
  const info = o.info === undefined ? { ...INFO, name: NAME[palette] } : o.info;
  const composed = L.composeContent({ prompt: `${WHAT[palette]} ${palette}`, businessInfo: info, modelOut: sampleModel(palette), copy: P.copyFor(palette) });
  if (o.mutate) o.mutate(composed);
  const have = new Set(Object.keys(composed.content));
  const page = await assembleWithImages({ palette, recipe: P.recipeFor(look, have), content: composed.content, variants: look.variants, includeBranding: false, meta: composed.meta }, { search: o.search || search });
  return { page, look, composed };
}

module.exports = { sampleModel, buildLook, search, NAME, WHAT, INFO };

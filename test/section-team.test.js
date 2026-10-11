// Run: node --test test/section-team.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "team",
  item: /g-team__member"/g,
  extra: ({ render }) => {
    test("team: a member without a photo gets an initial in a circle (aria-hidden), with a photo gets an img whose alt is the name", () => {
      const r = R.renderSection("team", "a", { title: "T", members: [{ name: "Élodie Martin", role: "Founder" }, { name: "Sam Lee", image: "IMG_2" }] });
      assert.match(r.html, /g-team__avatar" aria-hidden="true">É</);
      assert.match(r.html, /<img [^>]*alt="Sam Lee"[^>]*data-gurost-image-role="team"/);
      assert.equal((r.html.match(/<h3/g) || []).length, 2);
    });
    test("team: role and bio are optional; names are required, nobody is invented", () => {
      const r = R.renderSection("team", "b", { title: "T", members: [{ name: "Only Name" }, { role: "No name" }] });
      assert.equal((r.html.match(/g-team__member"/g) || []).length, 1);
      assert.ok(!r.html.includes("g-team__role") && !r.html.includes("g-team__bio"));
      assert.ok(R.renderSection("team", "a", { title: "T" }).warnings.length > 0);
    });
    test("team: eight members at most; C is the dark band and hides bios to stay compact", () => {
      assert.equal((render("a", "maxlen").html.match(/g-team__member"/g) || []).length, 8);
      assert.match(render("c", "full").html, /data-tone="dark"/);
    });
    test("team: a placeholder name still yields a sensible initial", () => {
      assert.match(R.renderSection("team", "a", { title: "T", members: [{ name: "[Add team member]" }] }).html, />A</);
    });
  },
});

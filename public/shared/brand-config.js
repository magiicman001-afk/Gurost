/**
 * THE one place the AI's name and avatar are set. To rename it, change NAME (and
 * AVATAR if you like) here and nowhere else: pages, status lines, the server prompts
 * and the tests all read these two values. A test fails if the name is typed anywhere else.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostBrandConfig = factory();
})(typeof self !== "undefined" ? self : this, function () {
  return { NAME: "Gurost Core", AVATAR: "🧠" };
});

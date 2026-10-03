/**
 * Repairs the most common syntax error in generated sites' inline
 * scripts: an apostrophe inside a single-quoted string -
 *   msg.textContent = 'Couldn't send - try again';
 * which stops the whole script (the form, the menu toggle...) with
 * "Unexpected identifier 't'".
 *
 * Each inline script is compiled (never run). Only a script that fails
 * is touched: a quote between two letters (Couldn't, we're) is escaped.
 * The result must compile, otherwise the original script is kept.
 */

const vm = require("vm");

const compiles = (code) => {
  try {
    new vm.Script(code);
    return true;
  } catch {
    return false;
  }
};

function repairScript(code) {
  // In code, a quote is never between two letters (it opens or closes a
  // string next to = ( , + [ or space), so this only hits apostrophes in
  // text. Kept only if the whole script then compiles.
  const fixed = code.replace(/([A-Za-z])'([A-Za-z])/g, "$1\\'$2");
  return fixed !== code && compiles(fixed) ? fixed : null;
}

// Returns { html, repaired, broken } - counts of scripts fixed / still invalid.
function repairInlineScripts(html) {
  let repaired = 0;
  let broken = 0;
  const out = String(html).replace(/(<script\b(?![^>]*\bsrc=)(?![^>]*\btype=["'](?!text\/javascript|module)[^"']*["'])[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (whole, open, code, close) => {
    if (!code.trim() || /\btype=["']module["']/i.test(open) || compiles(code)) return whole;
    const fixed = repairScript(code);
    if (fixed) {
      repaired++;
      return open + fixed + close;
    }
    broken++;
    return whole;
  });
  return { html: out, repaired, broken };
}

module.exports = { repairInlineScripts, repairScript };

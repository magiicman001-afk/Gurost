/**
 * Split-storage for a base identity prompt, exactly as requested:
 * stored in 3 parts, combined at runtime.
 *
 * READ THIS BEFORE ASSUMING IT DOES WHAT THE NAME IMPLIES: this is not
 * a security control. Splitting a string across 3 constants changes
 * where it lives in source code, not what Claude actually receives —
 * combine() below produces the exact same assembled text every time,
 * identical to what a single unsplit constant would produce. If a
 * model can be talked into reciting its instructions back, it recites
 * the assembled version regardless of how many variables it was split
 * across on the server. This module exists because it was explicitly
 * requested, not because it closes any real gap — the actual leak
 * protection in this codebase is security.js's withGuardrail() +
 * detectPromptLeak(), applied centrally in lib/claude-client.js.
 *
 * This isn't wired into any bot's actual system prompt — every bot
 * already has its own specific, detailed system prompt (see bots/*.js)
 * that this generic 3-line identity string would just prepend noise
 * to. Exported for use if you have an actual use for a short shared
 * identity preamble somewhere.
 */

const PART_1 = "You are a website and app builder.";
const PART_2 = "You use voice and text input.";
const PART_3 = "You build professional, responsive websites.";

function combine() {
  return [PART_1, PART_2, PART_3].join(" ");
}

module.exports = { combine };

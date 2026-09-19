/**
 * Seeds the real test account (test@gurost.com / Test@123456) by
 * calling the actual, real signup() function in user-auth.js — not a
 * separate, reimplemented insert that could drift out of sync with
 * how real signups are hashed and stored.
 *
 * REQUIRES A REAL, WORKING SUPABASE CONNECTION. This script can't
 * create an account in a database that doesn't exist or isn't
 * reachable — if SUPABASE_URL/SUPABASE_SERVICE_KEY aren't set
 * correctly, or point at a Supabase project that doesn't have this
 * codebase's real tables created yet, this will fail with a real,
 * specific error, not silently succeed.
 *
 * Run after `npm install` and after your .env is configured:
 *   node scripts/seed-test-account.js
 */

require("dotenv").config();
const userAuth = require("../user-auth");

const EMAIL = "test@gurost.com";
const PASSWORD = "Test@123456";

async function main() {
  try {
    const result = await userAuth.signup(EMAIL, PASSWORD);
    console.log(`Test account created: ${EMAIL}`);
    console.log(`Real API key (save this now — it's shown exactly once, only its hash is stored): ${result.apiKey}`);
    console.log(`Log in at http://localhost:3000/signup.html with ${EMAIL} / ${PASSWORD}`);
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log(`Account ${EMAIL} already exists — nothing to do. Log in with ${EMAIL} / ${PASSWORD}.`);
      return;
    }
    console.error(`Failed to seed test account: ${err.message}`);
    console.error("Most likely cause: SUPABASE_URL/SUPABASE_SERVICE_KEY aren't set correctly in .env, or the real tables (api_keys, etc.) haven't been created in your Supabase project yet — see README's Quick Start.");
    process.exit(1);
  }
}

main();

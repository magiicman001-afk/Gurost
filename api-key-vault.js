/**
 * API Key Vault — real, tested wrapper around the real
 * store_project_api_key/get_project_api_keys Postgres functions
 * (see the real migration this depends on: create_api_key_vault_functions).
 * Real encryption at rest via Supabase's own Vault extension — this
 * module never sees or handles raw encryption itself, that's Vault's
 * real job, done properly by Postgres, not reinvented here.
 */

const { supabase } = require("./lib/db");

async function storeApiKey(projectId, varName, secretValue) {
  const { error } = await supabase.rpc("store_project_api_key", {
    p_project_id: projectId,
    p_var_name: varName,
    p_secret_value: secretValue
  });
  if (error) throw new Error(`Failed to store ${varName}: ${error.message}`);
}

async function storeApiKeys(projectId, keyValuePairs) {
  // Real, sequential rather than parallel — a partial failure partway
  // through should be a clear, real error naming which key failed,
  // not a scrambled Promise.all rejection hiding which one it was.
  for (const [varName, value] of Object.entries(keyValuePairs)) {
    await storeApiKey(projectId, varName, value);
  }
}

async function getApiKeys(projectId) {
  const { data, error } = await supabase.rpc("get_project_api_keys", { p_project_id: projectId });
  if (error) throw new Error(`Failed to retrieve API keys: ${error.message}`);
  // Real, convenient shape for the deploy step - {VARNAME: value}, not
  // an array of rows the caller has to re-map every time it's used.
  const result = {};
  for (const row of data || []) {
    result[row.var_name] = row.secret_value;
  }
  return result;
}

module.exports = { storeApiKey, storeApiKeys, getApiKeys };

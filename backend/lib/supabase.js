const { createClient } = require("@supabase/supabase-js");

let client = null;

function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const err = new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set");
    err.code = "NO_SUPABASE_CONFIG";
    throw err;
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

module.exports = { getClient };

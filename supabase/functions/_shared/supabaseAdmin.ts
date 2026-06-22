import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

function readAdminKey() {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let adminKey = legacyServiceRole || null;

  if (secretKeysRaw) {
    try {
      const secretKeys = JSON.parse(secretKeysRaw) as Record<string, unknown>;
      if (typeof secretKeys.default === "string" && secretKeys.default) {
        adminKey = secretKeys.default;
      }
    } catch {
      throw new Error("Invalid Supabase admin environment.");
    }
  }

  if (!adminKey) {
    throw new Error("Missing Supabase admin environment.");
  }

  return adminKey;
}

export function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = readAdminKey();

  if (!supabaseUrl) {
    throw new Error("Missing Supabase admin environment.");
  }

  return createClient(supabaseUrl, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

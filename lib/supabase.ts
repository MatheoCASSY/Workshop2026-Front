import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

/** Client public (clé anon), soumis aux règles RLS. */
export function getSupabase() {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Client admin (service role) : serveur uniquement, contourne la RLS. */
export function getSupabaseAdmin() {
  const env = getEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

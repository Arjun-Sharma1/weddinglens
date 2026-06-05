import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged server-side Supabase client (service_role key).
 * Bypasses RLS — NEVER import this into a Client Component or expose the key.
 * Used by the upload pipeline and admin server actions / route handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

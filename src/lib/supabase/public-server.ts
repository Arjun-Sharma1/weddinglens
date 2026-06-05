import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client for use in Server Components / route handlers that only
 * need public (RLS-limited) reads. No session, no cookies — we use NextAuth for
 * admin auth, not Supabase Auth.
 */
export function createPublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Server-only Supabase client using the secret key (Supabase's new API key
// format, sb_secret_...). Bypasses Row Level Security — never import this
// from client components, never expose SUPABASE_SECRET_KEY to the browser.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables");
  }

  cachedClient = createClient(url, secretKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

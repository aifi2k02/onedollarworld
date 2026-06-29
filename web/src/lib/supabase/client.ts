import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read-only public client. URL + anon key are public-safe (anon key is exposed
// in the browser by design). The service_role key must NEVER appear here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: false } })
  : null;

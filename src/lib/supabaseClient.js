import { createClient } from "@supabase/supabase-js";

// Only the public anon key + URL belong in the browser. Row-Level Security is what
// actually protects data — the anon key is safe to ship. The service-role key,
// Stripe secret, and Anthropic key are server-only and must never appear here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  console.log("[supabase] initializing client, URL:", supabaseUrl);
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

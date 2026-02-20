import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "@/lib/env.client";
import type { Database } from "@/lib/supabaseTypes";

const { url, anonKey } = getSupabaseBrowserEnv();

export const supabase = createClient<Database>(
  url,
  anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

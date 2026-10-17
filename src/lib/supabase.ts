import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl: string | undefined =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey: string | undefined =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
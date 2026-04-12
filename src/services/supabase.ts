import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  ''
).trim();

if (!supabaseUrl || !/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(
    'Invalid VITE_SUPABASE_URL: set it in .env (local) or in your host’s build environment so it is available when `vite build` runs.',
  );
}
if (!supabaseKey) {
  throw new Error(
    'Missing Supabase key: set VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) in .env or build env.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; phone_number: string; created_at: string };
        Insert: { id?: string; phone_number: string; created_at?: string };
      };
      medical_sessions: {
        Row: {
          session_id: string;
          user_id: string;
          answers_log: Record<string, unknown>;
          final_status: string | null;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          session_id?: string;
          user_id: string;
          answers_log?: Record<string, unknown>;
          final_status?: string | null;
          rating?: number | null;
          created_at?: string;
        };
      };
    };
  };
};

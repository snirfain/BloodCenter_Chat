import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string;

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

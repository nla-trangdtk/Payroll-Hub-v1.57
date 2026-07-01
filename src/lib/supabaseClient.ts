import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback values for development if environment variables are missing
const safeUrl = supabaseUrl && !supabaseUrl.includes('your_supabase_project_url') ? supabaseUrl : 'https://placeholder-project.supabase.co';
const safeKey = supabaseAnonKey && !supabaseAnonKey.includes('your_supabase_anon_key') ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey);

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your_supabase_project_url') || supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder-project')) return false;
  if (supabaseAnonKey.includes('your_supabase_anon_key') || supabaseAnonKey.includes('your-anon-public-key') || supabaseAnonKey.includes('placeholder-anon-key')) return false;
  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    return false;
  }
};

export default supabase;

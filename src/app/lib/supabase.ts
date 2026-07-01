import { createClient } from '@supabase/supabase-js';

/**
 * Retrieves the Supabase credentials from the environment.
 * In Vite, public client-side variables are accessed via `import.meta.env`
 * and must be prefixed with `VITE_`.
 */
const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url, anonKey };
};

/**
 * Checks if Supabase has been properly configured with environment variables.
 * Verifies that the URL is valid and not a placeholder.
 */
export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return false;
  if (url.includes('your_supabase_project_url') || url.includes('your-project')) return false;
  if (anonKey.includes('your_supabase_anon_key') || anonKey.includes('your-anon-public-key')) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Initializes and returns a Supabase client.
 * Uses a safe fallback to prevent application startup crashes if the environment variables are not set or are placeholders.
 */
export const getSupabaseClient = () => {
  const { url, anonKey } = getSupabaseConfig();
  
  let validUrl = 'https://your-project.supabase.co';
  if (url) {
    try {
      new URL(url);
      if (!url.includes('your_supabase_project_url') && !url.includes('your-project')) {
        validUrl = url;
      }
    } catch {
      // url is invalid, fallback will be used
    }
  }

  let validKey = 'your-anon-public-key';
  if (anonKey && !anonKey.includes('your_supabase_anon_key') && !anonKey.includes('your-anon-public-key')) {
    validKey = anonKey;
  }
  
  if (!isSupabaseConfigured()) {
    console.warn(
      '⚠️ Supabase configuration is missing or invalid! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with valid values in your environment/settings.'
    );
  }
  
  return createClient(validUrl, validKey);
};

/**
 * Shared Supabase client instance.
 * Import this throughout your app to interact with your Supabase database, auth, and storage.
 */
export const supabase = getSupabaseClient();


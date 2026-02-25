import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Safe storage implementation for environments where localStorage is unavailable
 */
function createSafeStorage(): Storage {
  try {
    const t = '__supabase_probe__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    const noop = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    console.warn('[Supabase] localStorage unavailable — using no-op storage.');
    return noop;
  }
}

/**
 * Environment variable resolution with publishable fallbacks.
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY should be set in env,
 * but we provide safe fallbacks using the project's publishable credentials
 * to prevent the app from crashing when env injection fails (e.g. Lovable preview).
 */
const env = (import.meta as any)?.env ?? {};

const FALLBACK_PROJECT_ID = 'jmjiyekmxwsxkfnqwyaa';
const FALLBACK_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI';

const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const SUPABASE_ANON_KEY =
  (env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  FALLBACK_ANON_KEY;

// Track whether env vars are present (used by DevEnvBanner)
export const isUsingEnvVars = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isUsingEnvVars) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. ' +
      'Add them to your .env file (see .env.example). The app will not connect to the database.',
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: createSafeStorage(),
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'chravel-auth-session', // Explicit key for consistent session storage
      detectSessionInUrl: true, // Ensure OAuth callbacks are detected
    },
  },
);

// Export URL for edge function calls
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

// Export anon key for raw fetch calls to edge functions (apikey header)
export const SUPABASE_PUBLIC_ANON_KEY = SUPABASE_ANON_KEY;

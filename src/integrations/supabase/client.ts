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
 * Environment variable resolution — no hardcoded fallbacks.
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in:
 *   - Local dev:  .env file (see .env.example)
 *   - CI:         GitHub Actions secrets
 *   - Render:     Render dashboard environment variables
 *   - Vercel:     Vercel project environment variables
 */
const env = (import.meta as any)?.env ?? {};

const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined) || '';
const SUPABASE_ANON_KEY =
  (env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  '';

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

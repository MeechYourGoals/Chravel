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
 * Known project constants — publishable/anon credentials for this Supabase project.
 * These are NOT secrets (anon key is designed to be public) and act as a resilient
 * fallback when Vite env injection is unavailable (e.g. preview iframe, flaky build).
 */
const KNOWN_PROJECT_URL = 'https://jmjiyekmxwsxkfnqwyaa.supabase.co';
const KNOWN_PROJECT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI';

/**
 * Deterministic fallback chain for Supabase credentials:
 *   1. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (standard Vite env)
 *   2. VITE_SUPABASE_PUBLISHABLE_KEY               (Lovable auto-injected alias)
 *   3. Known project constants                      (hardcoded publishable fallback)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite injects import.meta.env at build time
const env = (import.meta as any)?.env ?? {};

const SUPABASE_URL: string = (env.VITE_SUPABASE_URL as string | undefined) || KNOWN_PROJECT_URL;

const SUPABASE_ANON_KEY: string =
  (env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  KNOWN_PROJECT_ANON_KEY;

// Track env source for diagnostics (DevEnvBanner, Healthz)
const urlFromEnv = Boolean(env.VITE_SUPABASE_URL);
const keyFromEnv = Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const isUsingEnvVars = urlFromEnv && keyFromEnv;

if (!isUsingEnvVars) {
  console.warn(
    '[Supabase] Environment variables not detected — using built-in project credentials. ' +
      'Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env for explicit configuration.',
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
      storageKey: 'chravel-auth-session',
      detectSessionInUrl: true,
    },
  },
);

// Export URL for edge function calls
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

// Export anon key for raw fetch calls to edge functions (apikey header)
export const SUPABASE_PUBLIC_ANON_KEY = SUPABASE_ANON_KEY;

// Supabase Client Configuration
// Environment variables are required - see .env.example
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY, validateEnv, isLovablePreview } from '@/config/env';

function createSafeStorage(): Storage {
  try {
    const t = '__supabase_probe__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    // Sandbox/3rd-party iframe or restricted mode: degrade gracefully
    const noop = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    console.warn('[Supabase] localStorage unavailable — using no-op storage (sessions will not persist).');
    return noop;
  }
}

// Validate environment configuration
const envResult = validateEnv();

if (!envResult.isValid) {
  const msg = `Missing Supabase configuration: ${envResult.missing.join(', ')}. ` +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.';
  console.error('[Supabase] ' + msg);
  
  // In development, provide helpful guidance
  if (import.meta.env.DEV) {
    console.error('[Supabase] Copy .env.example to .env and fill in your values.');
  }
  
  throw new Error(msg);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    storage: createSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Re-export for convenience
export { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env';

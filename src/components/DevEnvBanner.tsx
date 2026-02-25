import { isUsingEnvVars } from '@/integrations/supabase/client';

/**
 * Development-only banner shown when Supabase env vars are not configured.
 * Only renders in development mode and when using hardcoded defaults.
 */
export function DevEnvBanner() {
  // Only show in development and when env vars are missing
  if (import.meta.env.PROD || isUsingEnvVars) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 text-xs text-center py-1 px-2 font-medium">
      ⚠️ Using default Supabase config. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY for
      production.
    </div>
  );
}

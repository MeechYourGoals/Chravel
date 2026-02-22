/**
 * Auth user cache — reduces /auth/v1/user API calls (121K+ in egress diagnosis).
 *
 * Services that need userId often call supabase.auth.getUser() directly.
 * This cache returns a cached result for AUTH_CACHE_TTL_MS to avoid repeated network calls.
 *
 * Call invalidateAuthCache() on sign-out (AuthProvider does this).
 */

import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cached: { user: User | null; timestamp: number } | null = null;

/**
 * Get current user with caching. Returns cached value if fresh; otherwise fetches and caches.
 */
export async function getCachedAuthUser(): Promise<User | null> {
  const now = Date.now();
  if (cached && now - cached.timestamp < AUTH_CACHE_TTL_MS) {
    return cached.user;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  cached = { user, timestamp: now };
  return user;
}

/**
 * Invalidate the auth cache. Call on sign-out so the next getCachedAuthUser() fetches fresh.
 */
export function invalidateAuthCache(): void {
  cached = null;
}

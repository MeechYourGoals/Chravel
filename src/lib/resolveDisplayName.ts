/**
 * Internal sentinel returned when no profile name could be resolved.
 * Uses a prefix that cannot collide with real user-entered names.
 * Consumers should compare against this constant — never against
 * a user-visible string like "Former Member".
 */
export const UNRESOLVED_NAME_SENTINEL = '__chravel_unresolved_name__';

/**
 * User-facing label shown when a profile could not be resolved
 * (e.g. account deleted, profile row missing).
 */
export const FORMER_MEMBER_LABEL = 'Former Member';

/**
 * Resolves a user's display name from profile data.
 *
 * Priority:
 *   1. resolved_display_name (DB-computed, always populated if profile exists)
 *   2. display_name (explicit user-chosen name)
 *   3. first_name + last_name (auto-populated from auth)
 *   4. first_name alone
 *   5. UNRESOLVED_NAME_SENTINEL (caller decides how to display)
 *
 * Callers should check `result === UNRESOLVED_NAME_SENTINEL` to decide
 * whether to fall back to a snapshot name, "Former Member", or "System".
 */
export function resolveDisplayName(
  profile: {
    resolved_display_name?: string | null;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null | undefined,
  fallback: string = UNRESOLVED_NAME_SENTINEL,
): string {
  if (!profile) return fallback;

  // Prefer the DB-computed resolved name (handles all fallback logic server-side)
  if (profile.resolved_display_name) return profile.resolved_display_name;

  if (profile.display_name) return profile.display_name;

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;

  return fallback;
}

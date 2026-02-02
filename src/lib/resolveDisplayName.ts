/**
 * Resolves a user's display name from profile data.
 *
 * Priority:
 *   1. display_name (explicit user-chosen name)
 *   2. first_name + last_name (auto-populated from auth)
 *   3. first_name alone
 *   4. Provided fallback (defaults to 'Former Member')
 *
 * NEVER returns 'Former Member'. If profile data is entirely missing
 * the caller should use 'Former Member' (account deleted / profile missing)
 * or 'System' (for system-generated messages).
 */
export function resolveDisplayName(
  profile: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null | undefined,
  fallback: string = 'Former Member',
): string {
  if (!profile) return fallback;

  if (profile.display_name) return profile.display_name;

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();

  if (first && last) return `${first} ${last}`;
  if (first) return first;

  return fallback;
}

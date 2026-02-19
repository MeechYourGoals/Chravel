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

/** Profile shape for name resolution (from profiles_public or raw profile) */
export interface ProfileForDisplay {
  resolved_display_name?: string | null;
  real_name?: string | null;
  display_name?: string | null;
  name_preference?: 'real' | 'display' | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
}

/**
 * MVP primary name: always the user's real name.
 * Fallback order: real_name → first+last → first → email → fallback
 * Never uses display_name (legacy field, kept in DB but not shown in UI).
 */
export function getPrimaryName(
  profile: ProfileForDisplay | null | undefined,
  fallback: string = UNRESOLVED_NAME_SENTINEL,
): string {
  if (!profile) return fallback;

  const real = profile.real_name?.trim();
  if (real) return real;

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;

  const email = profile.email?.trim();
  if (email) return email;

  return fallback;
}

/**
 * Returns the user's Pro title for display as a second line under the real name.
 * Only returns a non-null value when:
 *   1. showInProContext is true (trip is a Pro/Enterprise trip)
 *   2. profile.title is non-empty
 *
 * Truncation is handled in the UI (PersonLabel component).
 */
export function getSecondaryTitle(
  profile: ProfileForDisplay | null | undefined,
  showInProContext: boolean,
): string | null {
  if (!showInProContext) return null;
  if (!profile) return null;
  const title = profile.title?.trim();
  return title || null;
}

/**
 * Client-side effective display name formula.
 * Use when profile comes from non-DB source (e.g. useAuth user).
 * For profiles from profiles_public, resolved_display_name is already correct.
 *
 * DISPLAY_NAME_FORMULA:
 *   if (name_preference == 'display' AND display_name non-empty) -> display_name
 *   else if (real_name non-empty) -> real_name
 *   else if (display_name non-empty) -> display_name
 *   else -> fallback
 *
 * @deprecated Prefer getPrimaryName() for new MVP rendering. This function is kept
 * for backward-compat with legacy code that reads name_preference.
 */
export function getEffectiveDisplayName(
  profile: ProfileForDisplay | null | undefined,
  fallback: string = UNRESOLVED_NAME_SENTINEL,
): string {
  if (!profile) return fallback;

  // Prefer DB-computed resolved_display_name (from profiles_public)
  if (profile.resolved_display_name) return profile.resolved_display_name;

  const pref = profile.name_preference ?? 'display';
  const real = profile.real_name?.trim();
  const display = profile.display_name?.trim();

  if (pref === 'display' && display) return display;
  if (real) return real;
  if (display) return display;

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;

  return fallback;
}

/**
 * Resolves a user's display name from profile data.
 *
 * MVP behavior: delegates to getPrimaryName (always real name).
 *
 * Callers should check `result === UNRESOLVED_NAME_SENTINEL` to decide
 * whether to fall back to a snapshot name, "Former Member", or "System".
 */
export function resolveDisplayName(
  profile: ProfileForDisplay | null | undefined,
  fallback: string = UNRESOLVED_NAME_SENTINEL,
): string {
  return getPrimaryName(profile, fallback);
}

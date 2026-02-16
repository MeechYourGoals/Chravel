/**
 * Invite link URL parsing utilities.
 *
 * Chravel invite links use two formats:
 * - p.chravel.app/j/{code} — branded unfurl domain (primary)
 * - chravel.app/join/{code} — internal app route (legacy/redirect target)
 *
 * These helpers extract the invite code from either format for deactivation,
 * validation, and demo detection.
 */

/**
 * Extract invite code from a shareable invite link.
 * Supports both p.chravel.app/j/{code} and legacy /join/{code} formats.
 *
 * @param inviteLink - Full URL (e.g. https://p.chravel.app/j/chravel7x9k2m)
 * @returns The invite code, or null if format is unexpected
 */
export function extractInviteCodeFromLink(inviteLink: string): string | null {
  if (!inviteLink || typeof inviteLink !== 'string') return null;

  const trimmed = inviteLink.trim();
  if (!trimmed) return null;

  // Primary format: p.chravel.app/j/{code} or any host/j/{code}
  const jMatch = trimmed.match(/\/j\/([^/?&#]+)/);
  if (jMatch?.[1]) return jMatch[1];

  // Legacy format: /join/{code} (internal app route)
  const joinMatch = trimmed.match(/\/join\/([^/?&#]+)/);
  if (joinMatch?.[1]) return joinMatch[1];

  return null;
}

/**
 * Check if an invite link is a demo link (demo-{tripId}-{timestamp}).
 * Demo links should not be deactivated in the database.
 */
export function isDemoInviteLink(inviteLink: string): boolean {
  const code = extractInviteCodeFromLink(inviteLink);
  return !!code && code.startsWith('demo-');
}

/**
 * Check if a string looks like a demo invite code.
 */
export function isDemoInviteCode(code: string): boolean {
  return !!code && code.startsWith('demo-');
}

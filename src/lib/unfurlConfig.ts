/**
 * Unfurl URL configuration.
 *
 * Centralizes the branded unfurl base URL so all link-generation code
 * reads from one place. Falls back to chravel.app/join/ if the branded
 * domain is not configured.
 */

const UNFURL_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UNFURL_BASE_URL) ||
  'https://p.chravel.app';

/**
 * Build a branded invite link for OG unfurl previews.
 * Format: https://p.chravel.app/j/{code}
 */
export function buildInviteLink(code: string): string {
  return `${UNFURL_BASE}/j/${code}`;
}

/**
 * Build a branded trip preview link for OG unfurl previews.
 * Format: https://p.chravel.app/t/{tripId}
 */
export function buildTripPreviewLink(tripId: string | number): string {
  return `${UNFURL_BASE}/t/${encodeURIComponent(String(tripId))}`;
}

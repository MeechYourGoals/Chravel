/**
 * Development build badge - shows version and environment info.
 *
 * Visibility:
 * - Only renders in development mode (never in production)
 * - Can be hidden with ?hideBadge=true query param for screenshots
 * - Can be hidden with ?forceHideBadge=true for Lovable preview compatibility
 */
export default function BuildBadge() {
  // Only show in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  // Allow hiding via query param for screenshots
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hideBadge') === 'true' || params.get('forceHideBadge') === 'true') {
      return null;
    }
  }

  return (
    <div className="fixed bottom-2 right-3 text-[10px] text-muted-foreground opacity-60 select-none z-50 pointer-events-none">
      v{import.meta.env.VITE_BUILD_ID ?? 'dev'} · {import.meta.env.MODE}
    </div>
  );
}

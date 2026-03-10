/**
 * Tab Chunk Preloader
 *
 * Preloads React.lazy() tab component JS bundles so they are cached in the
 * browser before the user clicks the tab.  This eliminates the Suspense
 * skeleton that otherwise shows while the chunk downloads on first visit.
 *
 * Each import() is idempotent — the bundler/browser caches the module after
 * the first fetch, so duplicate calls are free.
 */

// ---------------------------------------------------------------------------
// Mobile tab chunks (must mirror lazy() imports in MobileTripTabs.tsx)
// ---------------------------------------------------------------------------
const mobileChunks: Record<string, () => Promise<unknown>> = {
  chat: () => import('@/features/chat/components/TripChat'),
  calendar: () => import('@/components/mobile/MobileGroupCalendar'),
  tasks: () => import('@/components/mobile/MobileTripTasks'),
  polls: () => import('@/components/CommentsWall'),
  media: () => import('@/components/mobile/MobileUnifiedMediaHub'),
  places: () => import('@/components/PlacesSection'),
  concierge: () => import('@/components/AIConciergeChat'),
  payments: () => import('@/components/mobile/MobileTripPayments'),
};

// ---------------------------------------------------------------------------
// Desktop tab chunks (must mirror lazy() imports in TripTabs.tsx)
// ---------------------------------------------------------------------------
const desktopChunks: Record<string, () => Promise<unknown>> = {
  chat: () => import('@/features/chat/components/TripChat'),
  calendar: () => import('@/components/GroupCalendar'),
  tasks: () => import('@/components/todo/TripTasksTab'),
  polls: () => import('@/components/CommentsWall'),
  media: () => import('@/components/UnifiedMediaHub'),
  places: () => import('@/components/PlacesSection'),
  concierge: () => import('@/components/AIConciergeChat'),
  payments: () => import('@/components/payments/PaymentsTab'),
};

// Match the 1024px breakpoint used by useIsMobile()
const MOBILE_BREAKPOINT = 1024;

function getChunks(): Record<string, () => Promise<unknown>> {
  if (typeof window === 'undefined') return mobileChunks;
  return window.innerWidth <= MOBILE_BREAKPOINT ? mobileChunks : desktopChunks;
}

/**
 * Preload a single tab's JS chunk. Safe to call multiple times — subsequent
 * calls resolve from the module cache instantly.
 */
export function preloadTabChunk(tabId: string): void {
  const loader = getChunks()[tabId];
  if (loader) {
    loader().catch(() => {
      // Silent failure — the chunk will load on demand via React.lazy()
    });
  }
}

/**
 * Preload multiple tab chunks in parallel.
 */
export function preloadTabChunks(tabIds: string[]): void {
  tabIds.forEach(preloadTabChunk);
}

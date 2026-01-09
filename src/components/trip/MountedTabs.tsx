/**
 * MountedTabs - Performance-optimized tab container
 * 
 * Keeps all visited tabs mounted (hidden with CSS) for instant switching.
 * Uses display:none instead of unmounting to preserve state and avoid re-fetching.
 * 
 * This trades slightly higher memory usage for instant tab switching UX.
 */

import React, { useState, useCallback, lazy, Suspense, memo } from 'react';

// Tab skeleton for loading states
const TabSkeleton = memo(() => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));

TabSkeleton.displayName = 'TabSkeleton';

interface MountedTabsProps {
  activeTab: string;
  tabs: string[];
  renderTab: (tabId: string) => React.ReactNode;
}

/**
 * Container that keeps visited tabs mounted but hidden
 * Only unmounts tabs that haven't been visited yet
 */
export const MountedTabs = memo(({ activeTab, tabs, renderTab }: MountedTabsProps) => {
  // Track which tabs have been visited (mounted at least once)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  // Mark current tab as visited
  React.useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, visitedTabs]);

  return (
    <>
      {tabs.map(tabId => {
        const isActive = activeTab === tabId;
        const hasBeenVisited = visitedTabs.has(tabId);

        // Don't mount tabs that haven't been visited yet
        if (!hasBeenVisited) {
          return null;
        }

        return (
          <div
            key={tabId}
            data-tab={tabId}
            style={{ 
              display: isActive ? 'block' : 'none',
              // Prevent layout shifts
              minHeight: isActive ? undefined : 0,
              overflow: isActive ? undefined : 'hidden'
            }}
            className={isActive ? 'h-full' : ''}
          >
            <Suspense fallback={<TabSkeleton />}>
              {renderTab(tabId)}
            </Suspense>
          </div>
        );
      })}
    </>
  );
});

MountedTabs.displayName = 'MountedTabs';

/**
 * Hook to prefetch tab data on hover
 * Use with onMouseEnter on tab buttons
 */
export const useTabPrefetch = (tripId: string, prefetchTab: (tripId: string, tabId: string) => void) => {
  const handleTabHover = useCallback((tabId: string) => {
    // Delay prefetch slightly to avoid unnecessary fetches on quick mouse moves
    const timer = setTimeout(() => {
      prefetchTab(tripId, tabId);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [tripId, prefetchTab]);

  return { handleTabHover };
};

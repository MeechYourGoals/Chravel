import React, { useCallback } from 'react';
import { Map, Search, Plus, Bell, User, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';
import { useOrientationTransition } from '@/hooks/useOrientationTransition';

type CoreTabId = 'trips' | 'search' | 'new' | 'alerts' | 'profile';
type TabId = CoreTabId | 'recs';

interface NativeTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alertsBadge?: number;
  onNewPress?: () => void;
  onSearchPress?: () => void;
  tripTypeLabel?: string;
  onTripTypePress?: () => void;
  /** Show the 6th "Recs" tab (demo mode only) */
  showRecsTab?: boolean;
  className?: string;
}

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

// Core 5 tabs for authenticated users
const CORE_TABS: TabConfig[] = [
  {
    id: 'trips',
    label: 'Trips',
    icon: <Map size={24} strokeWidth={1.5} />,
    activeIcon: <Map size={24} strokeWidth={2} />,
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search size={24} strokeWidth={1.5} />,
    activeIcon: <Search size={24} strokeWidth={2} />,
  },
  {
    id: 'new',
    label: '',
    icon: <Plus size={28} strokeWidth={2.5} />,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <Bell size={24} strokeWidth={1.5} />,
    activeIcon: <Bell size={24} strokeWidth={2} />,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User size={24} strokeWidth={1.5} />,
    activeIcon: <User size={24} strokeWidth={2} />,
  },
];

// Optional 6th tab for demo mode
const RECS_TAB: TabConfig = {
  id: 'recs',
  label: 'Recs',
  icon: <Compass size={24} strokeWidth={1.5} />,
  activeIcon: <Compass size={24} strokeWidth={2} />,
};

/**
 * iOS-style bottom tab bar.
 * Fixed at bottom with safe area handling.
 *
 * Layout:
 * - 5 core tabs: Trips, Search, + (New), Alerts, Profile
 * - Optional 6th "Recs" tab for demo mode (appears on far right)
 *
 * Center "New" button is prominent like Instagram's create button.
 */
export const NativeTabBar = ({
  activeTab,
  onTabChange,
  alertsBadge = 0,
  onNewPress,
  onSearchPress,
  tripTypeLabel,
  onTripTypePress,
  showRecsTab = false,
  className,
}: NativeTabBarProps) => {
  // Use orientation transition hook for smooth mobile/desktop animations
  const { isMobile, isTransitioning } = useOrientationTransition();
  
  // Build tabs array - include Recs if in demo mode
  const tabs = showRecsTab ? [...CORE_TABS, RECS_TAB] : CORE_TABS;

  const handleTabPress = useCallback(
    async (tabId: TabId) => {
      // Special handling for "new" tab - it opens a modal
      if (tabId === 'new') {
        await hapticService.medium();
        onNewPress?.();
        return;
      }

      // Special handling for search tab - can open search overlay
      if (tabId === 'search') {
        await hapticService.light();
        onSearchPress?.();
        // Still change to search tab to show search is active
        if (tabId !== activeTab) {
          onTabChange(tabId);
        }
        return;
      }

      // Special handling for trips tab - can toggle trip type picker
      if (tabId === 'trips' && activeTab === 'trips' && onTripTypePress) {
        await hapticService.light();
        onTripTypePress();
        return;
      }

      if (tabId !== activeTab) {
        await hapticService.selectionChanged();
        onTabChange(tabId);
      }
    },
    [activeTab, onTabChange, onNewPress, onSearchPress, onTripTypePress],
  );

  // Don't render on desktop
  if (!isMobile && !isTransitioning) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'bg-[#1c1c1e]/95 backdrop-blur-xl',
        'border-t border-white/10',
        // Animate in/out during orientation transitions
        isTransitioning && isMobile && 'animate-fade-in',
        isTransitioning && !isMobile && 'animate-fade-out',
        className,
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[49px]">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isCenter = tab.id === 'new';

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center',
                'h-full',
                'active:opacity-50 transition-opacity',
                isCenter && 'relative -mt-3',
                // Adjust width based on number of tabs
                showRecsTab ? 'min-w-[52px]' : 'min-w-[64px]',
              )}
            >
              {/* Center "New" button with special styling */}
              {isCenter ? (
                <div
                  className={cn(
                    'w-14 h-14 rounded-full',
                    'bg-gradient-to-br from-[hsl(45,95%,58%)] to-[hsl(45,90%,50%)]',
                    'flex items-center justify-center',
                    'shadow-lg shadow-[hsl(45,95%,50%)]/30',
                    'active:scale-95 transition-transform',
                  )}
                >
                  <div className="text-black">{tab.icon}</div>
                </div>
              ) : (
                <>
                  {/* Icon with badge */}
                  <div className="relative">
                    <div
                      className={cn(
                        'transition-colors duration-150',
                        isActive ? 'text-primary' : 'text-white/60',
                      )}
                    >
                      {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                    </div>

                    {/* Badge for alerts */}
                    {tab.id === 'alerts' && alertsBadge > 0 && (
                      <div
                        className={cn(
                          'absolute -top-1 -right-1',
                          'min-w-[18px] h-[18px] px-1',
                          'bg-red-500 text-white',
                          'text-[11px] font-bold',
                          'rounded-full',
                          'flex items-center justify-center',
                        )}
                      >
                        {alertsBadge > 99 ? '99+' : alertsBadge}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[10px] mt-0.5 font-medium',
                      isActive ? 'text-primary' : 'text-white/60',
                    )}
                  >
                    {/* Show trip type label on trips tab if provided */}
                    {tab.id === 'trips' && tripTypeLabel ? tripTypeLabel : tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Tab bar spacer to prevent content from being hidden behind the tab bar
export const NativeTabBarSpacer = () => (
  <div
    className="lg:hidden"
    style={{
      height: 'calc(49px + env(safe-area-inset-bottom))',
    }}
  />
);

// Export types for consumers
export type { TabId, CoreTabId };

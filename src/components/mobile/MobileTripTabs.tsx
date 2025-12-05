import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MessageCircle, Calendar, ClipboardList, BarChart3, Camera, MapPin, Sparkles, CreditCard, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureToggle } from '../../hooks/useFeatureToggle';
import { TripChat } from '../TripChat';
import { MobileGroupCalendar } from './MobileGroupCalendar';
import { MobileTripTasks } from './MobileTripTasks';
import { CommentsWall } from '../CommentsWall';
import { MobileUnifiedMediaHub } from './MobileUnifiedMediaHub';
import { PlacesSection } from '../PlacesSection';
import { AIConciergeChat } from '../AIConciergeChat';
import { MobileTripChat } from './MobileTripChat';
import { MobileTripPayments } from './MobileTripPayments';
import { hapticService } from '../../services/hapticService';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import { ErrorBoundary } from '../ErrorBoundary';

interface MobileTripTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tripId: string;
  basecamp: { name: string; address: string };
  variant?: 'consumer' | 'pro' | 'event';
  participants?: Array<{ id: string; name: string; role?: string }>; // 🆕 For Pro/Event trips with role channels
  tripData?: {
    enabled_features?: string[];
    trip_type?: 'consumer' | 'pro' | 'event';
  };
}

export const MobileTripTabs = ({
  activeTab,
  onTabChange,
  tripId,
  basecamp,
  variant = 'consumer',
  participants = [],
  tripData
}: MobileTripTabsProps) => {
  const { accentColors } = useTripVariant();
  const { isDemoMode } = useDemoMode();
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const features = useFeatureToggle(tripData || {});

  // Track error boundary reset key to force re-render on retry
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  // Callback for ErrorBoundary retry
  const handleErrorRetry = useCallback(() => {
    setErrorBoundaryKey(prev => prev + 1);
  }, []);

  // Tab configuration based on variant
  const getTabsForVariant = () => {
    const baseTabs = [
      { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.showChat },
      { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: features.showCalendar },
      { id: 'concierge', label: 'Concierge', icon: Sparkles, enabled: features.showConcierge },
      { id: 'media', label: 'Media', icon: Camera, enabled: features.showMedia },
      { id: 'payments', label: 'Payments', icon: CreditCard, enabled: features.showPayments },
      { id: 'places', label: 'Places', icon: MapPin, enabled: features.showPlaces },
      { id: 'polls', label: 'Polls', icon: BarChart3, enabled: features.showPolls },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: features.showTasks }
    ];

    // All variants currently use the same tabs
    // Pro/Event specific tabs can be added here in the future
    return baseTabs;
  };

  const tabs = getTabsForVariant();

  // Scroll active tab into view and set CSS var for tabs height
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeButton = tabsContainerRef.current.querySelector(`[data-tab="${activeTab}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }

    const setTabsHeightVar = () => {
      const el = tabsContainerRef.current;
      const barEl = el?.parentElement as HTMLElement | null;
      const h = (barEl?.offsetHeight ?? el?.offsetHeight) || 52;
      document.documentElement.style.setProperty('--mobile-tabs-h', `${h}px`);
    };

    // simple debounce
    let t: any;
    const handler = () => {
      clearTimeout(t);
      t = setTimeout(setTabsHeightVar, 100);
    };

    setTabsHeightVar();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, [activeTab]);

  const handleTabPress = async (tabId: string, enabled: boolean) => {
    if (!enabled) {
      toast.info('This feature is disabled for this trip', {
        description: 'Contact trip admin to enable this feature'
      });
      return;
    }
    await hapticService.light();
    onTabChange(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <TripChat 
          tripId={tripId} 
          isPro={variant === 'pro'} 
          isEvent={variant === 'event'}
          participants={participants}
        />;
      case 'calendar':
        return <MobileGroupCalendar tripId={tripId} />;
      case 'tasks':
        return <MobileTripTasks tripId={tripId} />;
      case 'polls':
        return <CommentsWall tripId={tripId} />;
      case 'media':
        return <MobileUnifiedMediaHub tripId={tripId} />;
      case 'places':
        return <PlacesSection tripId={tripId} />;
      case 'payments':
        return <MobileTripPayments tripId={tripId} />;
      case 'concierge':
        return (
          <AIConciergeChat 
            tripId={tripId}
            basecamp={basecamp}
            isDemoMode={isDemoMode}
          />
        );
      default:
        return <MobileTripChat tripId={tripId} />;
    }
  };

  return (
    <>
      {/* Horizontal Scrollable Tab Bar - Sticky, Compressed for Mobile Portrait */}
      <div className="sticky top-[var(--mobile-header-h,73px)] z-40 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div
          ref={tabsContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-2"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const enabled = tab.enabled;
            
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => handleTabPress(tab.id, enabled)}
                className={`
                  flex items-center justify-center gap-2 
                  px-4 py-2 min-w-max h-[44px]
                  rounded-lg font-medium text-sm
                  transition-all duration-200
                  flex-shrink-0
                  scroll-snap-align-start
                  ${enabled ? 'active:scale-95' : ''}
                  ${
                    isActive && enabled
                      ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-lg`
                      : enabled
                      ? 'bg-white/10 text-gray-300'
                      : 'bg-white/5 text-gray-500 opacity-40 grayscale cursor-not-allowed'
                  }
                `}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap text-sm">{tab.label}</span>
                {!enabled && <Lock size={12} className="ml-1 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - NO safe-area padding, let chat input handle it */}
      <div
        ref={contentRef}
        className="bg-background flex flex-col min-h-0 flex-1"
        style={{
          height: 'calc(100dvh - var(--mobile-header-h, 73px) - var(--mobile-tabs-h, 52px))',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <ErrorBoundary
          key={`${activeTab}-${errorBoundaryKey}`}
          compact
          onRetry={handleErrorRetry}
        >
          {renderTabContent()}
        </ErrorBoundary>
      </div>
    </>
  );
};

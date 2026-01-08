import React, { useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  MessageCircle,
  Calendar,
  ClipboardList,
  BarChart3,
  Camera,
  MapPin,
  Sparkles,
  CreditCard,
  Lock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureToggle } from '../../hooks/useFeatureToggle';
import { hapticService } from '../../services/hapticService';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { useDemoMode } from '../../hooks/useDemoMode';
import { ErrorBoundary } from '../ErrorBoundary';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import type { EventData } from '../../types/events';

// ⚡ PERFORMANCE: Lazy load all tab components for code splitting
// This significantly reduces initial bundle size - tabs load on demand
const TripChat = lazy(() => import('../TripChat').then(m => ({ default: m.TripChat })));
const MobileGroupCalendar = lazy(() =>
  import('./MobileGroupCalendar').then(m => ({ default: m.MobileGroupCalendar })),
);
const MobileTripTasks = lazy(() =>
  import('./MobileTripTasks').then(m => ({ default: m.MobileTripTasks })),
);
const CommentsWall = lazy(() => import('../CommentsWall').then(m => ({ default: m.CommentsWall })));
const MobileUnifiedMediaHub = lazy(() =>
  import('./MobileUnifiedMediaHub').then(m => ({ default: m.MobileUnifiedMediaHub })),
);
const PlacesSection = lazy(() =>
  import('../PlacesSection').then(m => ({ default: m.PlacesSection })),
);
const AIConciergeChat = lazy(() =>
  import('../AIConciergeChat').then(m => ({ default: m.AIConciergeChat })),
);
const MobileTripChat = lazy(() =>
  import('./MobileTripChat').then(m => ({ default: m.MobileTripChat })),
);
const MobileTripPayments = lazy(() =>
  import('./MobileTripPayments').then(m => ({ default: m.MobileTripPayments })),
);
const EnhancedAgendaTab = lazy(() =>
  import('../events/EnhancedAgendaTab').then(m => ({ default: m.EnhancedAgendaTab })),
);
const LineupTab = lazy(() => import('../events/LineupTab').then(m => ({ default: m.LineupTab })));
const EventTasksTab = lazy(() =>
  import('../events/EventTasksTab').then(m => ({ default: m.EventTasksTab })),
);

interface MobileTripTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tripId: string;
  basecamp: { name: string; address: string };
  variant?: 'consumer' | 'pro' | 'event';
  participants?: Array<{ id: string; name: string; role?: string }>;
  tripData?: {
    enabled_features?: string[];
    trip_type?: 'consumer' | 'pro' | 'event';
  };
  eventData?: EventData | null;
}

export const MobileTripTabs = ({
  activeTab,
  onTabChange,
  tripId,
  basecamp,
  variant = 'consumer',
  participants = [],
  tripData,
  eventData,
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

  // Get event admin status for event variant
  const { isAdmin: isEventAdmin } = useEventPermissions(variant === 'event' ? tripId : '');

  // Tab configuration based on variant
  const getTabsForVariant = () => {
    // Event-specific tabs: Agenda, Calendar, Chat, Media, Line-up, Polls, Tasks
    if (variant === 'event') {
      return [
        { id: 'agenda', label: 'Agenda', icon: Calendar, enabled: true },
        { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: true },
        { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.showChat },
        { id: 'media', label: 'Media', icon: Camera, enabled: features.showMedia },
        { id: 'lineup', label: 'Line-up', icon: Users, enabled: true },
        { id: 'polls', label: 'Polls', icon: BarChart3, enabled: features.showPolls },
        { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: true },
      ];
    }

    // Consumer/Pro tabs
    const baseTabs = [
      { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.showChat },
      { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: features.showCalendar },
      { id: 'concierge', label: 'Concierge', icon: Sparkles, enabled: features.showConcierge },
      { id: 'media', label: 'Media', icon: Camera, enabled: features.showMedia },
      { id: 'payments', label: 'Payments', icon: CreditCard, enabled: features.showPayments },
      { id: 'places', label: 'Places', icon: MapPin, enabled: features.showPlaces },
      { id: 'polls', label: 'Polls', icon: BarChart3, enabled: features.showPolls },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: features.showTasks },
    ];

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
        description: 'Contact trip admin to enable this feature',
      });
      return;
    }
    await hapticService.light();
    onTabChange(tabId);
  };

  // ⚡ PERFORMANCE: Skeleton loader for lazy-loaded tabs
  const TabSkeleton = () => (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      // Event-specific tabs
      case 'agenda':
        return (
          <EnhancedAgendaTab eventId={tripId} userRole={isEventAdmin ? 'organizer' : 'attendee'} />
        );
      case 'lineup':
        return <LineupTab speakers={eventData?.speakers || []} userRole="attendee" />;
      case 'tasks':
        // For events, use EventTasksTab; for other trips, use MobileTripTasks
        if (variant === 'event') {
          return <EventTasksTab eventId={tripId} isAdmin={isEventAdmin} />;
        }
        return <MobileTripTasks tripId={tripId} />;
      // Common tabs
      case 'chat':
        return (
          <TripChat
            tripId={tripId}
            isPro={variant === 'pro'}
            isEvent={variant === 'event'}
            participants={participants}
          />
        );
      case 'calendar':
        return <MobileGroupCalendar tripId={tripId} />;
      case 'polls':
        return <CommentsWall tripId={tripId} />;
      case 'media':
        return <MobileUnifiedMediaHub tripId={tripId} />;
      case 'places':
        return <PlacesSection tripId={tripId} />;
      case 'payments':
        return <MobileTripPayments tripId={tripId} />;
      case 'concierge':
        return <AIConciergeChat tripId={tripId} basecamp={basecamp} isDemoMode={isDemoMode} />;
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
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {tabs.map(tab => {
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
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ErrorBoundary key={`${activeTab}-${errorBoundaryKey}`} compact onRetry={handleErrorRetry}>
          {/* ⚡ PERFORMANCE: Suspense boundary for lazy-loaded tab components */}
          <Suspense fallback={<TabSkeleton />}>{renderTabContent()}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
};

import React, { useRef, useEffect } from 'react';
import { MessageCircle, Calendar, ClipboardList, BarChart3, Camera, MapPin, Sparkles, CreditCard } from 'lucide-react';
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

interface MobileTripTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tripId: string;
  basecamp: { name: string; address: string };
}

export const MobileTripTabs = ({
  activeTab,
  onTabChange,
  tripId,
  basecamp
}: MobileTripTabsProps) => {
  const { accentColors } = useTripVariant();
  const { isDemoMode } = useDemoMode();
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // 🆕 Updated tab order: Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'concierge', label: 'Concierge', icon: Sparkles },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'places', label: 'Places', icon: MapPin },
    { id: 'polls', label: 'Polls', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList }
  ];

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

  const handleTabPress = async (tabId: string) => {
    await hapticService.light();
    onTabChange(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <TripChat tripId={tripId} />;
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
            
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => handleTabPress(tab.id)}
                className={`
                  flex items-center justify-center gap-2 
                  px-4 py-2 min-w-max h-[44px]
                  rounded-lg font-medium text-sm
                  transition-all duration-200
                  flex-shrink-0
                  active:scale-95
                  scroll-snap-align-start
                  ${
                    isActive
                      ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-lg`
                      : 'bg-white/10 text-gray-300'
                  }
                `}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - Optimized height for mobile portrait */}
      <div
        ref={contentRef}
        className="bg-background flex flex-col min-h-0"
        style={{
          height: 'calc(100dvh - var(--mobile-header-h, 73px) - var(--mobile-tabs-h, 52px))'
        }}
      >
        {renderTabContent()}
      </div>
    </>
  );
};

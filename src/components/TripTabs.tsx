import React, { useState, lazy, Suspense } from 'react';
import { MessageCircle, Users, Calendar, Camera, Radio, Link, BarChart3, FileText, ClipboardList, Lock, MapPin, Sparkles, DollarSign } from 'lucide-react';

// 🚀 Lazy load tab components for faster initial render
const TripChat = lazy(() => import('./TripChat').then(m => ({ default: m.TripChat })));
const GroupCalendar = lazy(() => import('./GroupCalendar').then(m => ({ default: m.GroupCalendar })));
const CommentsWall = lazy(() => import('./CommentsWall').then(m => ({ default: m.CommentsWall })));
const TripTasksTab = lazy(() => import('./todo/TripTasksTab').then(m => ({ default: m.TripTasksTab })));
const UnifiedMediaHub = lazy(() => import('./UnifiedMediaHub').then(m => ({ default: m.UnifiedMediaHub })));
const PlacesSection = lazy(() => import('./PlacesSection').then(m => ({ default: m.PlacesSection })));
const AIConciergeChat = lazy(() => import('./AIConciergeChat').then(m => ({ default: m.AIConciergeChat })));
const PaymentsTab = lazy(() => import('./payments/PaymentsTab').then(m => ({ default: m.PaymentsTab })));
const AddLinkModal = lazy(() => import('./AddLinkModal').then(m => ({ default: m.AddLinkModal })));
import { useTripVariant } from '../contexts/TripVariantContext';
import { useFeatureToggle } from '../hooks/useFeatureToggle';
import { TripPreferences as TripPreferencesType } from '../types/consumer';
import type { NormalizedUrl } from '@/services/chatUrlExtractor';

interface TripTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tripId?: string;
  tripName?: string;
  basecamp?: { name: string; address: string };
  tripPreferences?: TripPreferencesType;
  showPlaces?: boolean;
  showConcierge?: boolean;
  isDemoMode?: boolean;
  tripData?: {
    enabled_features?: string[];
    trip_type?: 'consumer' | 'pro' | 'event';
  };
}

export const TripTabs = ({ 
  activeTab: parentActiveTab, 
  onTabChange: parentOnTabChange, 
  tripId = '1', 
  tripName,
  basecamp,
  tripPreferences,
  showPlaces = false,
  showConcierge = false,
  isDemoMode = false,
  tripData 
}: TripTabsProps) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [linkPrefill, setLinkPrefill] = useState<{
    url?: string;
    title?: string;
    category?: 'restaurant' | 'hotel' | 'attraction' | 'activity' | 'other';
    note?: string;
  } | undefined>(undefined);
  
  const { accentColors } = useTripVariant();
  const features = useFeatureToggle(tripData || {});

  // Handler for promoting URLs from Media to Trip Links
  const handlePromoteToTripLink = (urlData: NormalizedUrl) => {
    setLinkPrefill({
      url: urlData.url,
      title: urlData.title || urlData.domain,
      note: `Shared in chat on ${new Date(urlData.lastSeenAt).toLocaleDateString()}`,
    });
    setIsAddLinkModalOpen(true);
  };

  const handleCloseLinkModal = () => {
    setIsAddLinkModalOpen(false);
    setLinkPrefill(undefined);
  };

  // 🆕 Updated tab order: Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: features.showChat },
    { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: features.showCalendar },
    { id: 'concierge', label: 'Concierge', icon: Sparkles, enabled: showConcierge },
    { id: 'media', label: 'Media', icon: Camera, enabled: features.showMedia },
    { id: 'payments', label: 'Payments', icon: DollarSign, enabled: true },
    { id: 'places', label: 'Places', icon: MapPin, enabled: showPlaces },
    { id: 'polls', label: 'Polls', icon: BarChart3, enabled: features.showPolls },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: features.showTasks }
  ];

  const handleTabChange = (tab: string, enabled: boolean) => {
    if (enabled) {
      setActiveTab(tab);
    }
  };

  // Tab skeleton for lazy loading fallback
  const TabSkeleton = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <TripChat tripId={tripId} />;
      case 'polls':
        return <CommentsWall tripId={tripId} />;
      case 'tasks':
        return <TripTasksTab tripId={tripId} />;
      case 'calendar':
        return <GroupCalendar tripId={tripId} />;
      case 'media':
        return <UnifiedMediaHub tripId={tripId} onPromoteToTripLink={handlePromoteToTripLink} />;
      case 'payments':
        return <PaymentsTab tripId={tripId} />;
      case 'places':
        return <PlacesSection tripId={tripId} tripName={tripName} />;
      case 'concierge':
        return (
          <AIConciergeChat 
            tripId={tripId}
            basecamp={basecamp}
            preferences={tripPreferences}
            isDemoMode={isDemoMode}
          />
        );
      default:
        return <TripChat tripId={tripId} />;
    }
  };

  return (
    <>
      {/* Add Link Modal */}
      <Suspense fallback={null}>
        <AddLinkModal
          isOpen={isAddLinkModalOpen}
          onClose={handleCloseLinkModal}
          prefill={linkPrefill}
        />
      </Suspense>

      {/* Tab Navigation - Responsive max-width container */}
      <div className="w-full flex justify-center mb-2">
        <div className="w-full max-w-7xl overflow-x-auto scrollbar-hidden scroll-smooth px-2">
          <div className="flex whitespace-nowrap gap-2">
            {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const enabled = tab.enabled;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id, enabled)}
              disabled={!enabled}
              className={`
                flex items-center justify-center gap-1.5 
                px-3.5 py-2.5 min-h-[42px]
                rounded-xl font-medium text-sm
                transition-all duration-200
                flex-1
                ${
                  isActive && enabled
                    ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
                    : enabled
                    ? 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white hover:shadow-sm'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
                }
                ${enabled ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent' : ''}
              `}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {!enabled && <Lock size={12} className="ml-1 flex-shrink-0" />}
            </button>
          );
        })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto native-scroll pb-24 sm:pb-4 h-auto min-h-0 max-h-none md:h-[calc(100vh-240px)] md:max-h-[1000px] md:min-h-[600px]">
        <Suspense fallback={<TabSkeleton />}>
          {renderTabContent()}
        </Suspense>
      </div>
    </>
  );
};

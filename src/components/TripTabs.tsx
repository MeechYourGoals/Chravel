
import React, { useState, Suspense, lazy } from 'react';
import { MessageCircle, Users, Calendar, Camera, Radio, Link, BarChart3, FileText, ClipboardList, Lock, MapPin, Sparkles, DollarSign } from 'lucide-react';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useFeatureToggle } from '../hooks/useFeatureToggle';
import { TripPreferences as TripPreferencesType } from '../types/consumer';
import type { NormalizedUrl } from '@/services/chatUrlExtractor';

// Lazy load tab components for better performance
const TripChat = lazy(() => import('./TripChat').then(module => ({ default: module.TripChat })));
const GroupCalendar = lazy(() => import('./GroupCalendar').then(module => ({ default: module.GroupCalendar })));
const CommentsWall = lazy(() => import('./CommentsWall').then(module => ({ default: module.CommentsWall })));
const TripTasksTab = lazy(() => import('./todo/TripTasksTab').then(module => ({ default: module.TripTasksTab })));
const UnifiedMediaHub = lazy(() => import('./UnifiedMediaHub').then(module => ({ default: module.UnifiedMediaHub })));
const PlacesSection = lazy(() => import('./PlacesSection').then(module => ({ default: module.PlacesSection })));
const AIConciergeChat = lazy(() => import('./AIConciergeChat').then(module => ({ default: module.AIConciergeChat })));
const PaymentsTab = lazy(() => import('./payments/PaymentsTab').then(module => ({ default: module.PaymentsTab })));
const AddLinkModal = lazy(() => import('./AddLinkModal').then(module => ({ default: module.AddLinkModal })));

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
      <Suspense fallback={<div className="flex items-center justify-center h-20"><div className="text-white/60">Loading...</div></div>}>
        <AddLinkModal
          isOpen={isAddLinkModalOpen}
          onClose={handleCloseLinkModal}
          prefill={linkPrefill}
        />
      </Suspense>

      {/* Tab Navigation - Matches main navigation alignment */}
      <div className="flex overflow-x-auto whitespace-nowrap scroll-smooth gap-2 mb-8 pb-2 -mx-2 px-2 justify-center">
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
                flex items-center justify-center gap-2
                px-4 py-3 min-h-[44px] min-w-max
                rounded-lg font-medium text-sm
                transition-all duration-200
                flex-shrink-0
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

      {/* Tab Content */}
      <div className="h-[calc(100vh-240px)] max-h-[1000px] min-h-[600px]">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-white/60 animate-pulse">Loading...</div>
          </div>
        }>
          {renderTabContent()}
        </Suspense>
      </div>
    </>
  );
};

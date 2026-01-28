import React, { useState, lazy, Suspense, useCallback, memo, useEffect } from 'react';
import { MessageCircle, Users, Calendar, Camera, Radio, Link, BarChart3, FileText, ClipboardList, Lock, MapPin, Sparkles, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// 🚀 Lazy load tab components for faster initial render
const TripChat = lazy(() => import('@/features/chat/components/TripChat').then(m => ({ default: m.TripChat })));
const GroupCalendar = lazy(() => import('./GroupCalendar').then(m => ({ default: m.GroupCalendar })));
const CommentsWall = lazy(() => import('./CommentsWall').then(m => ({ default: m.CommentsWall })));
const TripTasksTab = lazy(() => import('./todo/TripTasksTab').then(m => ({ default: m.TripTasksTab })));
const UnifiedMediaHub = lazy(() => import('./UnifiedMediaHub').then(m => ({ default: m.UnifiedMediaHub })));
const PlacesSection = lazy(() => import('./PlacesSection').then(m => ({ default: m.PlacesSection })));
const AIConciergeChat = lazy(() => import('./AIConciergeChat').then(m => ({ default: m.AIConciergeChat })));
const PaymentsTab = lazy(() => import('./payments/PaymentsTab').then(m => ({ default: m.PaymentsTab })));
const AddLinkModal = lazy(() => import('./AddLinkModal').then(m => ({ default: m.AddLinkModal })));
import { FeatureErrorBoundary } from './FeatureErrorBoundary';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useFeatureToggle } from '../hooks/useFeatureToggle';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import { usePrefetchTrip } from '../hooks/usePrefetchTrip';
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
  const { isSuperAdmin } = useSuperAdmin();
  const { prefetchTab, prefetchAdjacentTabs, prefetchPriorityTabs } = usePrefetchTrip();

  // ⚡ PERFORMANCE: Track visited tabs to keep them mounted
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  // Tab order for adjacent prefetching
  const tabOrder = ['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks'];

  // ⚡ MOBILE/PWA OPTIMIZATION: Prefetch priority tabs on mount
  // Since mobile users can't hover, we prefetch commonly used tabs immediately
  useEffect(() => {
    if (tripId) {
      prefetchPriorityTabs(tripId);
    }
  }, [tripId, prefetchPriorityTabs]);

  // Mark current tab as visited and prefetch adjacent tabs
  useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => new Set([...prev, activeTab]));
    }
    // ⚡ MOBILE OPTIMIZATION: Prefetch adjacent tabs when user visits a tab
    if (tripId) {
      prefetchAdjacentTabs(tripId, activeTab, tabOrder);
    }
  }, [activeTab, visitedTabs, tripId, prefetchAdjacentTabs]);

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
  // Super admins always have all features enabled (no lock icons)
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: isSuperAdmin || features.showChat },
    { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: isSuperAdmin || features.showCalendar },
    { id: 'concierge', label: 'Concierge', icon: Sparkles, enabled: isSuperAdmin || showConcierge },
    { id: 'media', label: 'Media', icon: Camera, enabled: isSuperAdmin || features.showMedia },
    { id: 'payments', label: 'Payments', icon: DollarSign, enabled: true },
    { id: 'places', label: 'Places', icon: MapPin, enabled: isSuperAdmin || showPlaces },
    { id: 'polls', label: 'Polls', icon: BarChart3, enabled: isSuperAdmin || features.showPolls },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: isSuperAdmin || features.showTasks }
  ];

  const handleTabChange = async (tab: string, enabled: boolean) => {
    if (!enabled) {
      // Show toast for disabled features
      const { toast } = await import('sonner');
      toast.info('This feature is disabled for this trip', {
        description: 'Contact trip admin to enable this feature'
      });
      return;
    }
    setActiveTab(tab);
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

  // ⚡ PERFORMANCE: Memoized tab content renderer
  const renderTabContent = useCallback((tabId: string) => {
    switch (tabId) {
      case 'chat':
        return (
          <FeatureErrorBoundary featureName="Trip Chat">
            <TripChat tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'polls':
        return (
          <FeatureErrorBoundary featureName="Polls & Comments">
            <CommentsWall tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'tasks':
        return (
          <FeatureErrorBoundary featureName="Tasks & Todo">
            <TripTasksTab tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'calendar':
        return (
          <FeatureErrorBoundary featureName="Calendar & Events">
            <GroupCalendar tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'media':
        return (
          <FeatureErrorBoundary featureName="Media Hub">
            <UnifiedMediaHub tripId={tripId} onPromoteToTripLink={handlePromoteToTripLink} />
          </FeatureErrorBoundary>
        );
      case 'payments':
        return (
          <FeatureErrorBoundary featureName="Payments & Expenses">
            <PaymentsTab tripId={tripId} />
          </FeatureErrorBoundary>
        );
      case 'places':
        return (
          <FeatureErrorBoundary featureName="Places & Map">
            <PlacesSection tripId={tripId} tripName={tripName} />
          </FeatureErrorBoundary>
        );
      case 'concierge':
        return (
          <FeatureErrorBoundary featureName="AI Concierge">
            <AIConciergeChat
              tripId={tripId}
              basecamp={basecamp}
              preferences={tripPreferences}
              isDemoMode={isDemoMode}
            />
          </FeatureErrorBoundary>
        );
      default:
        return (
          <FeatureErrorBoundary featureName="Trip Chat">
            <TripChat tripId={tripId} />
          </FeatureErrorBoundary>
        );
    }
  }, [tripId, tripName, basecamp, tripPreferences, isDemoMode, handlePromoteToTripLink]);

  // ⚡ PERFORMANCE: Prefetch tab data on hover
  const handleTabHover = useCallback((tabId: string) => {
    prefetchTab(tripId, tabId);
  }, [tripId, prefetchTab]);

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id, enabled)}
                    onMouseEnter={() => enabled && handleTabHover(tab.id)}
                    onTouchStart={() => enabled && handleTabHover(tab.id)}
                    onFocus={() => enabled && handleTabHover(tab.id)}
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
                          : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-40 grayscale'
                      }
                      ${enabled ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent' : 'pointer-events-none'}
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {!enabled && <Lock size={12} className="ml-1 flex-shrink-0" />}
                  </button>
                </TooltipTrigger>
                {!enabled && (
                  <TooltipContent>
                    <p className="text-xs">This feature is disabled for this trip</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
          </div>
        </div>
      </div>

      {/* ⚡ PERFORMANCE: Keep visited tabs mounted for instant switching */}
      <div className="overflow-y-auto native-scroll pb-24 sm:pb-4 h-auto min-h-0 max-h-none md:h-[calc(100vh-240px)] md:max-h-[1000px] md:min-h-[600px]">
        {tabs.filter(t => t.enabled !== false).map(tab => {
          const isActive = activeTab === tab.id;
          const hasBeenVisited = visitedTabs.has(tab.id);
          
          // Don't mount tabs that haven't been visited
          if (!hasBeenVisited) return null;
          
          return (
            <div
              key={tab.id}
              style={{ 
                display: isActive ? 'block' : 'none',
                minHeight: isActive ? undefined : 0,
                overflow: isActive ? undefined : 'hidden'
              }}
              className={isActive ? 'h-full' : ''}
            >
              <Suspense fallback={<TabSkeleton />}>
                {renderTabContent(tab.id)}
              </Suspense>
            </div>
          );
        })}
      </div>
    </>
  );
};

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
import { usePrefetchTrip } from '../../hooks/usePrefetchTrip';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { useEventLineup } from '@/hooks/useEventLineup';
import { CalendarSkeleton, PlacesSkeleton, ChatSkeleton } from '../loading';
import { useRoleAssignments } from '../../hooks/useRoleAssignments';
import { useTripRoles } from '../../hooks/useTripRoles';
import type { EventData } from '../../types/events';

// ⚡ PERFORMANCE: Lazy load all tab components for code splitting
// This significantly reduces initial bundle size - tabs load on demand
const TripChat = lazy(() =>
  import('@/features/chat/components/TripChat').then(m => ({ default: m.TripChat })),
);
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
const TeamTab = lazy(() => import('../pro/TeamTab').then(m => ({ default: m.TeamTab })));

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
    proTripCategory?: string;
    createdBy?: string;
  };
  eventData?: EventData | null;
  category?: string;
  tripCreatorId?: string;
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
  category,
  tripCreatorId,
}: MobileTripTabsProps) => {
  const { accentColors } = useTripVariant();
  const { isDemoMode } = useDemoMode();
  const { prefetchTab, prefetchAdjacentTabs, prefetchPriorityTabs } = usePrefetchTrip();
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const features = useFeatureToggle(tripData || {});

  // Role assignment hooks for Pro trips Team tab
  const { assignRole } = useRoleAssignments({
    tripId,
    enabled: variant === 'pro' && !!tripId,
  });
  const { refetch: refetchRoles } = useTripRoles({
    tripId,
    enabled: variant === 'pro' && !!tripId,
  });

  // Track local roster state for optimistic updates
  const [localParticipants, setLocalParticipants] = useState(participants);

  // DB-backed lineup hook for auto-populating from agenda
  const { members: _lineupSpeakers, addMembersFromAgenda: addLineupFromAgenda } = useEventLineup({
    eventId: tripId,
    initialMembers: eventData?.speakers || [],
    enabled: variant === 'event',
  });
  const { sessions: agendaSessions } = useEventAgenda({
    eventId: tripId,
    initialSessions: eventData?.agenda || [],
    enabled: variant === 'event',
  });

  const handleLineupUpdate = useCallback(
    async (speakerNames: string[]) => {
      try {
        await addLineupFromAgenda(speakerNames);
      } catch {
        // Error handled by hook toast
      }
    },
    [addLineupFromAgenda],
  );

  // Sync local participants with prop changes
  React.useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  // ⚡ PERFORMANCE: Track visited tabs to keep them mounted
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  // Get event admin status for event variant
  const { isAdmin: isEventAdmin } = useEventPermissions(variant === 'event' ? tripId : '');

  // ⚡ MOBILE/PWA OPTIMIZATION: Prefetch priority tabs on mount
  // Since mobile users can't hover, we prefetch commonly used tabs immediately
  useEffect(() => {
    if (tripId) {
      prefetchPriorityTabs(tripId);
    }
  }, [tripId, prefetchPriorityTabs]);

  // Mark current tab as visited when it changes
  useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, visitedTabs]);

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

    // Add Team tab only for Pro trips
    if (variant === 'pro') {
      baseTabs.push({ id: 'team', label: 'Team', icon: Users, enabled: features.showTeam ?? true });
    }

    return baseTabs;
  };

  const tabs = getTabsForVariant();

  // ⚡ MOBILE OPTIMIZATION: Prefetch adjacent tabs when user visits a tab
  const enabledTabIds = tabs.filter(t => t.enabled !== false).map(t => t.id);
  useEffect(() => {
    if (tripId) {
      prefetchAdjacentTabs(tripId, activeTab, enabledTabIds);
    }
  }, [activeTab, tripId, prefetchAdjacentTabs]);

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

  const handleTabPress = useCallback(
    async (tabId: string, enabled: boolean) => {
      if (!enabled) {
        toast.info('This feature is disabled for this trip', {
          description: 'Contact trip admin to enable this feature',
        });
        return;
      }
      await hapticService.light();
      onTabChange(tabId);
    },
    [onTabChange],
  );

  // ⚡ PERFORMANCE: Prefetch tab data on hover/focus
  // ⚡ PERFORMANCE: Prefetch tab data on hover/focus
  const handleTabHover = useCallback(
    (tabId: string) => {
      prefetchTab(tripId, tabId);
    },
    [tripId, prefetchTab],
  );

  /**
   * Handle role assignment for a member in Pro trips.
   * This enables the "Assign Roles" button in the Team tab to work properly.
   */
  const handleUpdateMemberRole = useCallback(
    async (memberId: string, roleId: string, roleName: string) => {
      if (!tripId) {
        console.error('Cannot assign role: tripId is missing');
        throw new Error('Trip ID is required');
      }

      try {
        // Find the member from participants
        const member = localParticipants.find(m => m.id === memberId);
        if (!member) {
          console.error('Member not found in participants:', memberId);
          throw new Error('Member not found');
        }

        // Persist the role assignment to the database
        await assignRole(memberId, roleId);

        // Refetch roles to update member counts
        await refetchRoles();

        // Update local state optimistically for immediate UI feedback
        setLocalParticipants(prev =>
          prev.map(p => (p.id === memberId ? { ...p, role: roleName } : p)),
        );

        toast.success(`Role assigned successfully`);
      } catch (error) {
        console.error('Failed to update member role:', error);
        toast.error('Failed to assign role');
        throw error;
      }
    },
    [tripId, localParticipants, assignRole, refetchRoles],
  );

  // ⚡ PERFORMANCE: Content-aware skeletons for lazy-loaded tabs
  const DefaultTabSkeleton = () => (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );

  // ⚡ PERFORMANCE: Get content-aware skeleton for each tab type
  const getSkeletonForTab = useCallback((tabId: string) => {
    switch (tabId) {
      case 'calendar':
      case 'agenda':
        return <CalendarSkeleton />;
      case 'chat':
        return <ChatSkeleton />;
      case 'places':
        return <PlacesSkeleton />;
      default:
        return <DefaultTabSkeleton />;
    }
  }, []);

  const renderTabContent = useCallback(
    (tabId: string) => {
      switch (tabId) {
        // Event-specific tabs
        case 'agenda':
          return (
            <EnhancedAgendaTab
              eventId={tripId}
              userRole={isEventAdmin ? 'organizer' : 'attendee'}
              onLineupUpdate={handleLineupUpdate}
            />
          );
        case 'lineup':
          return (
            <LineupTab
              eventId={tripId}
              permissions={{
                canView: true,
                canCreate: isEventAdmin,
                canEdit: isEventAdmin,
                canDelete: isEventAdmin,
              }}
              agendaSessions={agendaSessions}
              initialSpeakers={eventData?.speakers || []}
            />
          );
        case 'tasks':
          // For events, use EventTasksTab; for other trips, use MobileTripTasks
          if (variant === 'event') {
            return (
              <EventTasksTab
                eventId={tripId}
                permissions={{
                  canView: true,
                  canCreate: isEventAdmin,
                  canEdit: isEventAdmin,
                  canDelete: isEventAdmin,
                }}
              />
            );
          }
          return <MobileTripTasks tripId={tripId} />;
        // Pro-specific tabs
        case 'team':
          return (
            <div className="px-4 py-4 pb-safe overflow-y-auto h-full">
              <TeamTab
                roster={localParticipants.map(p => ({
                  id: p.id,
                  name: p.name,
                  role: p.role || 'member',
                  email: '',
                  avatar: '',
                  credentialLevel: 'Guest' as const,
                  permissions: [],
                }))}
                userRole="admin"
                isReadOnly={false}
                category={
                  (category ||
                    tripData?.proTripCategory ||
                    'Sports – Pro, Collegiate, Youth') as any
                }
                tripId={tripId}
                tripCreatorId={tripCreatorId || tripData?.createdBy}
                onUpdateMemberRole={handleUpdateMemberRole}
              />
            </div>
          );
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
    },
    [
      tripId,
      variant,
      isEventAdmin,
      eventData,
      basecamp,
      isDemoMode,
      participants,
      localParticipants,
      handleUpdateMemberRole,
      category,
      tripCreatorId,
      tripData,
    ],
  );

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
                onMouseEnter={() => enabled && handleTabHover(tab.id)}
                onFocus={() => enabled && handleTabHover(tab.id)}
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

      {/* Tab Content - ⚡ PERFORMANCE: Per-tab error boundaries prevent bounce-back */}
      <div
        ref={contentRef}
        className="bg-background flex flex-col min-h-0 flex-1"
        style={{
          height: 'calc(100dvh - var(--mobile-header-h, 73px) - var(--mobile-tabs-h, 52px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs
          .filter(t => t.enabled !== false)
          .map(tab => {
            const isActive = activeTab === tab.id;
            const hasBeenVisited = visitedTabs.has(tab.id);

            // ⚡ CRITICAL FIX: Always mount the active tab immediately, even on first visit
            // This prevents the "click away and back" race condition where useEffect
            // updates visitedTabs AFTER the first render, causing the tab to not mount
            if (!hasBeenVisited && !isActive) return null;

            return (
              <div
                key={tab.id}
                style={{
                  display: isActive ? 'flex' : 'none',
                  flexDirection: 'column',
                  minHeight: isActive ? '100%' : 0,
                  overflow: isActive ? undefined : 'hidden',
                }}
                className={isActive ? 'h-full flex-1' : ''}
              >
                {/* ⚡ Per-tab error boundary: errors stay on failing tab, no bounce-back */}
                <Suspense fallback={getSkeletonForTab(tab.id)}>
                  <FeatureErrorBoundary featureName={tab.label}>
                    {renderTabContent(tab.id)}
                  </FeatureErrorBoundary>
                </Suspense>
              </div>
            );
          })}
      </div>
    </>
  );
};

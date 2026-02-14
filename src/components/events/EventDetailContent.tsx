import React, { lazy, Suspense, useCallback } from 'react';
import { Shield, Users, Calendar, MessageCircle, Camera, BarChart3, ClipboardList } from 'lucide-react';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { useEventLineup } from '@/hooks/useEventLineup';

import { EventData } from '../../types/events';
import { TripContext } from '@/types';
import { useTripVariant } from '../../contexts/TripVariantContext';

// ⚡ PERFORMANCE: Lazy load all tab components for code splitting
const EventAdminTab = lazy(() =>
  import('./EventAdminTab').then(m => ({ default: m.EventAdminTab })),
);
const TripChat = lazy(() =>
  import('@/features/chat/components/TripChat').then(m => ({ default: m.TripChat })),
);
const GroupCalendar = lazy(() =>
  import('../GroupCalendar').then(m => ({ default: m.GroupCalendar })),
);
const UnifiedMediaHub = lazy(() =>
  import('../UnifiedMediaHub').then(m => ({ default: m.UnifiedMediaHub })),
);
const CommentsWall = lazy(() => import('../CommentsWall').then(m => ({ default: m.CommentsWall })));
const AgendaModal = lazy(() => import('./AgendaModal').then(m => ({ default: m.AgendaModal })));
const LineupTab = lazy(() => import('./LineupTab').then(m => ({ default: m.LineupTab })));
const EventTasksTab = lazy(() =>
  import('./EventTasksTab').then(m => ({ default: m.EventTasksTab })),
);

interface EventDetailContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowTripsPlusModal: () => void;
  tripId: string;
  basecamp: { name: string; address: string };
  eventData: EventData;
  tripContext: TripContext;
}

const TabSkeleton = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

export const EventDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal,
  tripId,
  basecamp,
  eventData,
  tripContext,
}: EventDetailContentProps) => {
  const { accentColors } = useTripVariant();
  const {
    eventPermissions,
    isOrganizer,
    isLoading: permissionsLoading,
  } = useEventPermissions(tripId);
  const { isDemoMode } = useDemoMode();

  // DB-backed agenda & lineup hooks
  const { sessions: agendaSessions } = useEventAgenda({
    eventId: tripId,
    initialSessions: eventData.agenda,
  });
  const { addMembersFromAgenda } = useEventLineup({
    eventId: tripId,
    initialMembers: eventData.speakers,
  });

  // Callback: auto-push agenda speakers to lineup DB
  const handleLineupUpdate = useCallback(
    async (speakerNames: string[]) => {
      try {
        await addMembersFromAgenda(speakerNames);
      } catch {
        // Error handled by hook
      }
    },
    [addMembersFromAgenda],
  );

  // Tab order: admin (organizer-only), agenda, calendar, chat, lineup, media, polls, tasks
  const tabs = [
    { id: 'admin', label: 'Admin', icon: Shield, enabled: isOrganizer },
    { id: 'agenda', label: 'Agenda', icon: Calendar, enabled: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: true },
    { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: eventData.chatEnabled !== false },
    { id: 'lineup', label: 'Line-up', icon: Users, enabled: true },
    { id: 'media', label: 'Media', icon: Camera, enabled: eventData.mediaUploadEnabled !== false },
    { id: 'polls', label: 'Polls', icon: BarChart3, enabled: eventData.pollsEnabled !== false },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: true },
  ];

  const visibleTabs = tabs.filter(tab => tab.enabled);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'admin':
        return <EventAdminTab eventId={tripId} />;
      case 'agenda':
        return (
          <AgendaModal
            eventId={tripId}
            permissions={eventPermissions.agenda}
            initialSessions={eventData.agenda}
            onLineupUpdate={handleLineupUpdate}
          />
        );
      case 'calendar':
        return <GroupCalendar tripId={tripId} />;
      case 'chat':
        return (
          <TripChat enableGroupChat={true} showBroadcasts={true} isEvent={true} tripId={tripId} />
        );
      case 'media':
        return <UnifiedMediaHub tripId={tripId} />;
      case 'lineup':
        return (
          <LineupTab
            eventId={tripId}
            permissions={eventPermissions.lineup}
            agendaSessions={agendaSessions}
            initialSpeakers={eventData.speakers}
          />
        );
      case 'polls':
        return <CommentsWall tripId={tripId} permissions={eventPermissions.polls} />;
      case 'tasks':
        return <EventTasksTab eventId={tripId} permissions={eventPermissions.tasks} />;
      default:
        return (
          <AgendaModal
            eventId={tripId}
            permissions={eventPermissions.agenda}
            initialSessions={eventData.agenda}
            onLineupUpdate={handleLineupUpdate}
          />
        );
    }
  };

  return (
    <>
      <div className="flex whitespace-nowrap gap-2 mb-2 justify-start">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium transition-all duration-200 text-sm flex-1 ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-y-auto native-scroll pb-24 sm:pb-4 h-auto min-h-0 max-h-none md:h-[calc(100vh-320px)] md:max-h-[1000px] md:min-h-[500px] flex flex-col">
        <Suspense fallback={<TabSkeleton />}>{renderTabContent()}</Suspense>
      </div>
    </>
  );
};

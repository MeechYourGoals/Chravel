import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Users,
  Calendar,
  MessageCircle,
  Camera,
  BarChart3,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import { useEventAgenda } from '@/hooks/useEventAgenda';
import { useEventLineup } from '@/hooks/useEventLineup';

import { EventData } from '../../types/events';
import { TripContext } from '@/types';
import { useTripVariant } from '../../contexts/TripVariantContext';
import { DisabledTabDialog } from './DisabledTabDialog';
import { EventTabKey, EVENT_TABS_CONFIG, isEventTabEnabled } from '@/lib/eventTabs';
import { useEventTabSettings } from '@/hooks/useEventTabSettings';

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

const EVENT_TAB_ICON_MAP: Record<EventTabKey, React.ElementType> = {
  admin: Shield,
  agenda: Calendar,
  calendar: Calendar,
  chat: MessageCircle,
  lineup: Users,
  media: Camera,
  polls: BarChart3,
  tasks: ClipboardList,
};

export const EventDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal: _onShowTripsPlusModal,
  tripId,
  basecamp: _basecamp,
  eventData,
  tripContext: _tripContext,
}: EventDetailContentProps) => {
  const { accentColors } = useTripVariant();
  const {
    eventPermissions,
    isOrganizer,
    isLoading: _permissionsLoading,
  } = useEventPermissions(tripId);
  const [showDisabledTabDialog, setShowDisabledTabDialog] = useState(false);
  const initialEnabledFeatures = (eventData as EventData & { enabled_features?: string[] })
    .enabled_features;
  const { enabledTabs } = useEventTabSettings({
    eventId: tripId,
    initialEnabledFeatures,
  });

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

  const tabs = useMemo(
    () =>
      EVENT_TABS_CONFIG.map(tab => ({
        id: tab.key,
        label: tab.label,
        icon: EVENT_TAB_ICON_MAP[tab.key],
        enabled: tab.key === 'admin' ? isOrganizer : isEventTabEnabled(tab.key, enabledTabs),
      })),
    [enabledTabs, isOrganizer],
  );

  const isActiveTabEnabled = tabs.find(tab => tab.id === activeTab)?.enabled ?? true;

  useEffect(() => {
    if (activeTab === 'admin') return;
    if (!isActiveTabEnabled) {
      setShowDisabledTabDialog(true);
      onTabChange('agenda');
    }
  }, [activeTab, isActiveTabEnabled, onTabChange]);

  const handleTabClick = (tab: { id: string; enabled: boolean }) => {
    if (!tab.enabled) {
      setShowDisabledTabDialog(true);
      return;
    }

    onTabChange(tab.id);
  };

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
            isOrganizer={isOrganizer}
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
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium transition-all duration-200 text-sm flex-1 ${
                isActive
                  ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              {Icon && <Icon size={16} className="shrink-0" />}
              <span>{tab.label}</span>
              {!tab.enabled && <Lock size={13} className="ml-1 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="overflow-y-auto native-scroll pb-24 sm:pb-4 h-auto min-h-0 max-h-none md:h-[calc(100vh-320px)] md:max-h-[1000px] md:min-h-[500px] flex flex-col">
        <Suspense fallback={<TabSkeleton />}>{renderTabContent()}</Suspense>
      </div>

      <DisabledTabDialog open={showDisabledTabDialog} onOpenChange={setShowDisabledTabDialog} />
    </>
  );
};

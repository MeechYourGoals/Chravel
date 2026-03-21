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
import { cn } from '@/lib/utils';
import { getEventContentContainerClassName } from './eventDetailLayout';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { EventTabKey, resolveEventTabsForRole } from '@/lib/eventTabs';
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
      <div className="w-10 h-10 gold-gradient-spinner animate-spin" />
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
  const { accentColors: _accentColors } = useTripVariant();
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
      resolveEventTabsForRole(enabledTabs, isOrganizer).map(tab => ({
        id: tab.key,
        label: tab.label,
        icon: EVENT_TAB_ICON_MAP[tab.key],
        enabled: tab.isEnabled,
      })),
    [enabledTabs, isOrganizer],
  );

  const isActiveTabEnabled = tabs.find(tab => tab.id === activeTab)?.enabled ?? true;

  const shouldShowDisabledState = activeTab !== 'admin' && !isActiveTabEnabled;

  useEffect(() => {
    if (activeTab === 'admin' && !isOrganizer) {
      onTabChange('agenda');
      return;
    }

    if (activeTab !== 'admin' && !isActiveTabEnabled) {
      setShowDisabledTabDialog(true);
    }
  }, [activeTab, isActiveTabEnabled, isOrganizer, onTabChange]);

  const handleTabClick = (tab: { id: string; enabled: boolean }) => {
    if (!tab.enabled) {
      setShowDisabledTabDialog(true);
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
          <FeatureErrorBoundary featureName="Trip Chat">
            <TripChat enableGroupChat={true} showBroadcasts={true} isEvent={true} tripId={tripId} />
          </FeatureErrorBoundary>
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
      <div
        className="flex whitespace-nowrap gap-2 mb-2 justify-start"
        role="tablist"
        aria-label="Event tabs"
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label}${!tab.enabled ? ' (disabled by organizer)' : ''}`}
              onClick={() => handleTabClick(tab)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl font-medium transition-all duration-200 text-sm flex-1 ${
                isActive
                  ? 'accent-ring-active text-white shadow-md'
                  : 'accent-ring-idle text-gray-300 hover:text-white'
              }`}
            >
              {Icon && <Icon size={16} className="shrink-0" />}
              <span>{tab.label}</span>
              {!tab.enabled && <Lock size={13} className="ml-1 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          'overflow-y-auto native-scroll min-h-0 flex flex-col relative',
          getEventContentContainerClassName(activeTab),
        )}
      >
        <div
          className={cn(
            shouldShowDisabledState ? 'opacity-50 pointer-events-none select-none' : '',
            activeTab === 'chat' ? 'flex-1 flex flex-col min-h-0' : '',
          )}
        >
          <Suspense fallback={<TabSkeleton />}>{renderTabContent()}</Suspense>
        </div>

        {shouldShowDisabledState && (
          <div className="absolute inset-0 flex items-start justify-center p-4">
            <div className="mt-4 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-foreground shadow-lg">
              This feature has been disabled by the event admin.
            </div>
          </div>
        )}
      </div>

      <DisabledTabDialog open={showDisabledTabDialog} onOpenChange={setShowDisabledTabDialog} />
    </>
  );
};

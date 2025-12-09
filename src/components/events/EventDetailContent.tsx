
import React from 'react';
import { Users, Calendar, MessageCircle, Camera, BarChart3, ClipboardList } from 'lucide-react';
import { TripChat } from '../TripChat';
import { GroupCalendar } from '../GroupCalendar';
import { UnifiedMediaHub } from '../UnifiedMediaHub';
import { CommentsWall } from '../CommentsWall';
import { EnhancedAgendaTab } from './EnhancedAgendaTab';
import { LineupTab } from './LineupTab';
import { EventTasksTab } from './EventTasksTab';
import { useEventPermissions } from '@/hooks/useEventPermissions';

import { EventData } from '../../types/events';
import { TripContext } from '@/types';
import { useTripVariant } from '../../contexts/TripVariantContext';

interface EventDetailContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowTripsPlusModal: () => void;
  tripId: string;
  basecamp: { name: string; address: string };
  eventData: EventData;
  tripContext: TripContext;
}

export const EventDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal,
  tripId,
  basecamp,
  eventData,
  tripContext
}: EventDetailContentProps) => {
  const { accentColors } = useTripVariant();
  const { isAdmin, isLoading: permissionsLoading } = useEventPermissions(tripId);

  // Updated Event tabs: Agenda, Calendar, Chat, Media, Line-up, Polls, Tasks
  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar, enabled: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: true },
    { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: eventData.chatEnabled !== false },
    { id: 'media', label: 'Media', icon: Camera, enabled: eventData.mediaUploadEnabled !== false },
    { id: 'lineup', label: 'Line-up', icon: Users, enabled: true },
    { id: 'polls', label: 'Polls', icon: BarChart3, enabled: eventData.pollsEnabled !== false },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: true }
  ];

  // Filter tabs based on enabled settings
  const visibleTabs = tabs.filter(tab => tab.enabled);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agenda':
        return (
          <EnhancedAgendaTab
            eventId={tripId}
            userRole={isAdmin ? 'organizer' : 'attendee'}
            pdfScheduleUrl={eventData.pdfScheduleUrl}
          />
        );
      case 'calendar':
        return <GroupCalendar tripId={tripId} />;
      case 'chat':
        return <TripChat enableGroupChat={true} showBroadcasts={true} isEvent={true} tripId={tripId} />;
      case 'media':
        return <UnifiedMediaHub tripId={tripId} />;
      case 'lineup':
        return (
          <LineupTab
            speakers={eventData.speakers || []}
            userRole={eventData.userRole || 'attendee'}
          />
        );
      case 'polls':
        return <CommentsWall tripId={tripId} />;
      case 'tasks':
        return <EventTasksTab eventId={tripId} isAdmin={isAdmin} />;
      default:
        return (
          <EnhancedAgendaTab
            eventId={tripId}
            userRole={isAdmin ? 'organizer' : 'attendee'}
            pdfScheduleUrl={eventData.pdfScheduleUrl}
          />
        );
    }
  };

  return (
    <>
      {/* Enhanced Tab Navigation for Events */}
      <div className="flex whitespace-nowrap gap-2 mb-2 justify-start">
        {visibleTabs.map((tab) => {
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

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderTabContent()}
      </div>
    </>
  );
};

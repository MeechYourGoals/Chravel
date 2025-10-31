
import React from 'react';
import { Sparkles, Users, Calendar, MessageCircle, Camera, BarChart3 } from 'lucide-react';
import { TripChat } from '../TripChat';
import { AIConciergeChat } from '../AIConciergeChat';
import { GroupCalendar } from '../GroupCalendar';
import { UnifiedMediaHub } from '../UnifiedMediaHub';
import { CommentsWall } from '../CommentsWall';
import { EnhancedAgendaTab } from './EnhancedAgendaTab';
import { SpeakerDirectory } from './SpeakerDirectory';

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

  // 🆕 Updated Events tab order (Alphabetical): Agenda, Calendar, Chat, Concierge, Media, Performers, Polls
  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar, enabled: true, eventOnly: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar, enabled: true },
    { id: 'chat', label: 'Chat', icon: MessageCircle, enabled: eventData.chatEnabled !== false },
    { id: 'ai-chat', label: 'Concierge', icon: Sparkles, enabled: eventData.conciergeEnabled === true },
    { id: 'media', label: 'Media', icon: Camera, enabled: eventData.mediaUploadEnabled !== false },
    { id: 'performers', label: 'Performers', icon: Users, enabled: true, eventOnly: true },
    { id: 'polls', label: 'Polls', icon: BarChart3, enabled: eventData.pollsEnabled !== false }
  ];

  // Filter tabs based on enabled settings
  const visibleTabs = tabs.filter(tab => tab.enabled);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <TripChat enableGroupChat={true} showBroadcasts={true} isEvent={true} tripId={tripId} />;
      case 'calendar':
        return <GroupCalendar tripId={tripId} />;
      case 'media':
        return <UnifiedMediaHub tripId={tripId} />;
      case 'performers':
        return (
          <SpeakerDirectory
            speakers={eventData.speakers || []}
            userRole={eventData.userRole || 'attendee'}
          />
        );
      case 'polls':
        return <CommentsWall tripId={tripId} />;
      case 'agenda':
        return (
          <EnhancedAgendaTab
            eventId={tripId}
            userRole={(eventData.userRole === 'speaker' ? 'attendee' : eventData.userRole) as 'attendee' | 'exhibitor' | 'organizer'}
            pdfScheduleUrl={eventData.pdfScheduleUrl}
          />
        );
      case 'ai-chat':
        return (
          <AIConciergeChat 
            tripId={tripId}
            basecamp={basecamp}
            isEvent={true}
          />
        );
      default:
        return <TripChat enableGroupChat={true} showBroadcasts={true} isEvent={true} tripId={tripId} />;
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
              {tab.eventOnly && (
                <Sparkles size={14} className={`text-${accentColors.primary}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="h-[calc(100vh-320px)] max-h-[1000px] min-h-[500px] overflow-hidden flex flex-col">
        {renderTabContent()}
      </div>
    </>
  );
};


import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Settings } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { EventData } from '../types/events';
import { useTripVariant } from '../contexts/TripVariantContext';
import { calculatePeopleCount, calculateDaysCount, calculateEventPlacesCount } from '../utils/tripStatsUtils';
import { getInitials } from '../utils/avatarUtils';
import { TravelerTooltip } from './ui/traveler-tooltip';

interface MobileEventCardProps {
  event: EventData;
}

export const MobileEventCard = ({ event }: MobileEventCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { accentColors } = useTripVariant();

  const handleViewEvent = () => {
    console.log('MobileEventCard - Navigating to event ID:', event.id);
    console.log('MobileEventCard - Full URL will be:', `/event/${event.id}`);
    navigate(`/event/${event.id}`);
  };

  if (!isMobile) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Technology & Culture': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'Economics & Policy': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'Fintech': return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'Media & Entertainment': return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      case 'Marketing & CX': return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'Personal Finance': return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30';
      case 'Music Awards': return 'from-violet-500/20 to-violet-600/20 border-violet-500/30';
      case 'Startup Showcase': return 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30';
      case 'Creator Economy': return 'from-rose-500/20 to-rose-600/20 border-rose-500/30';
      case 'Film Awards': return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 'Sports Ceremony': return 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30';
      default: return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getCategoryColor(event.category)} backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02]`}>
      {/* Events Badge */}
      <div className={`absolute top-3 right-3 z-10 bg-gradient-to-r ${accentColors.gradient} px-2 py-1 rounded-full flex items-center gap-1`}>
        <Calendar size={12} className="text-white" />
        <span className="text-xs font-bold text-white">EVENTS</span>
      </div>

      {/* Mobile Header */}
      <div className={`relative h-36 bg-gradient-to-br from-${accentColors.primary}/10 to-${accentColors.secondary}/10 p-4`}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=200&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-1">
            <div className="inline-block bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg mb-2">
              <span className="text-xs font-medium text-white">{event.category}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <MapPin size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Calendar size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{event.dateRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4">
        {/* Stats Grid - People, Days, Places */}
        <div className="grid grid-cols-3 gap-3 mb-4 bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">People</span>
            </div>
            <div className="text-sm font-bold text-white">{calculatePeopleCount(event)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Days</span>
            </div>
            <div className="text-sm font-bold text-white">{calculateDaysCount(event.dateRange)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
            </div>
            <div className="text-sm font-bold text-white">{calculateEventPlacesCount(event)}</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {event.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              {tag}
            </span>
          ))}
          {event.tags.length > 2 && (
            <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              +{event.tags.length - 2}
            </span>
          )}
        </div>

        {/* Team Members */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className={`text-${accentColors.primary}`} />
              <span className="text-sm text-gray-300 font-medium">Organizers</span>
            </div>
            <span className="text-xs text-gray-500">{event.participants.length} members</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {event.participants.slice(0, 3).map((participant, index) => (
                <TravelerTooltip key={participant.id} name={`${participant.name} - ${participant.role}`}>
                  <div
                    className="relative w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-xs font-semibold text-black border-2 border-gray-900"
                    style={{ zIndex: event.participants.length - index }}
                  >
                    {getInitials(participant.name)}
                  </div>
                </TravelerTooltip>
              ))}
            </div>
            {event.participants.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white ml-1">
                +{event.participants.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Group Chat Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-gray-400" />
            <span className="text-gray-400 text-sm">Group Chat</span>
          </div>
          <span className={`text-sm font-medium ${event.groupChatEnabled ? 'text-green-400' : 'text-gray-500'}`}>
            {event.groupChatEnabled ? 'On' : 'Off'}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleViewEvent}
          className={`w-full bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg`}
        >
          Manage Event
        </button>
      </div>
    </div>
  );
};

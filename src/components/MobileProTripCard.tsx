
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Crown } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ProTripData } from '../types/pro';
import { useTripVariant } from '../contexts/TripVariantContext';
import { TravelerTooltip } from './ui/traveler-tooltip';
import { calculatePeopleCount, calculateDaysCount, calculateProTripPlacesCount } from '../utils/tripStatsUtils';
import { processTeamMembers, processRoles } from '../utils/teamDisplayUtils';
import { getInitials } from '../utils/avatarUtils';

interface MobileProTripCardProps {
  trip: ProTripData;
}

export const MobileProTripCard = ({ trip }: MobileProTripCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { accentColors } = useTripVariant();

  const handleViewTrip = () => {
    navigate(`/tour/pro/${trip.id}`);
  };

  if (!isMobile) return null;

  // Process participants for display
  const participantsWithAvatars = trip.participants;

  // Process team members for display (mobile shows max 5)
  const { visible: visibleMembers, overflow: memberOverflow } = processTeamMembers(participantsWithAvatars, 5);

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02]">
      {/* Pro Badge */}
      <div className={`absolute top-3 right-3 z-10 bg-gradient-to-r ${accentColors.gradient} px-2 py-1 rounded-full flex items-center gap-1`}>
        <Crown size={12} className="text-black" />
        <span className="text-xs font-bold text-black">PRO</span>
      </div>

      {/* Mobile Header - Removed category display */}
      <div className={`relative h-36 bg-gradient-to-br from-${accentColors.primary}/10 to-${accentColors.secondary}/10 p-4`}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">
              {trip.title}
            </h3>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <MapPin size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium truncate">{trip.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Calendar size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{trip.dateRange}</span>
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
            <div className="text-sm font-bold text-white">{calculatePeopleCount(trip)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Days</span>
            </div>
            <div className="text-sm font-bold text-white">{calculateDaysCount(trip.dateRange)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
            </div>
            <div className="text-sm font-bold text-white">{calculateProTripPlacesCount(trip)}</div>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className={`text-${accentColors.primary}`} />
              <span className="text-sm text-gray-300 font-medium">Team</span>
            </div>
            <span className="text-xs text-gray-500">{participantsWithAvatars.length} members</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {visibleMembers.map((participant, index) => (
                <TravelerTooltip key={participant.id} name={`${participant.name} - ${participant.role}`}>
                  <div
                    className="relative"
                    style={{ zIndex: visibleMembers.length - index }}
                  >
                    <Avatar className="w-8 h-8 border-2 border-gray-900">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TravelerTooltip>
              ))}
            </div>
            {memberOverflow > 0 && (
              <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white ml-1">
                +{memberOverflow}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleViewTrip}
          className={`w-full bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-black font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg`}
        >
          Manage Tour
        </button>
      </div>
    </div>
  );
};

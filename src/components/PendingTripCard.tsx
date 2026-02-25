import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface Participant {
  id: number | string;
  name: string;
  avatar?: string;
}

interface PendingTrip {
  id: number | string;
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
  coverPhoto?: string;
  placesCount?: number;
  peopleCount?: number;
}

interface PendingTripCardProps {
  trip: PendingTrip;
}

export const PendingTripCard = ({ trip }: PendingTripCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Show message that trip is pending approval
    // Could also navigate to a "pending" view or show a toast
    alert(
      "This trip is pending approval from the organizer. You'll be notified once your request is reviewed.",
    );
  };

  const coverImage =
    trip.coverPhoto ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop';

  return (
    <div
      className="group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-yellow-500/30 rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg md:shadow-black/20 opacity-60 cursor-not-allowed"
      onClick={handleClick}
    >
      {/* Trip Image/Header - Responsive */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-transparent p-4 md:p-6">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: `url('${coverImage}')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="relative z-10 flex justify-between items-start h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-white/80 group-hover:text-yellow-300/80 transition-colors line-clamp-2">
                  {trip.title}
                </h3>
                {/* Pending Approval Badge */}
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 flex items-center gap-1"
                  >
                    <Clock size={12} className="animate-pulse" />
                    Pending Approval
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/60 mb-1 md:mb-3 text-sm md:text-base">
              <MapPin size={14} className="md:hidden text-yellow-400/60" />
              <MapPin size={18} className="hidden md:block text-yellow-400/60" />
              <span className="font-medium truncate">{trip.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm md:text-base">
              <Calendar size={14} className="md:hidden text-yellow-400/60" />
              <Calendar size={18} className="hidden md:block text-yellow-400/60" />
              <span className="font-medium truncate">{trip.dateRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Content - Responsive padding */}
      <div className="p-4 md:p-6">
        {/* Quick Stats - Responsive sizing */}
        <div className="flex justify-between items-center md:grid md:grid-cols-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white/60">
              {trip.peopleCount ?? trip.participants.length}
            </div>
            <div className="text-xs md:text-sm text-gray-500">People</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white/60">-</div>
            <div className="text-xs md:text-sm text-gray-500">Days</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white/60">
              {trip.placesCount ?? 0}
            </div>
            <div className="text-xs md:text-sm text-gray-500">Places</div>
          </div>
        </div>

        {/* Pending Message */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs md:text-sm text-yellow-300/90 font-medium mb-1">
                Waiting for organizer approval
              </p>
              <p className="text-xs text-yellow-300/70">
                Your join request has been submitted. The trip organizer will review it soon.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button - Disabled */}
        <button
          onClick={handleClick}
          disabled
          className="w-full bg-gray-800/50 text-gray-500 py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700/50 text-xs md:text-sm cursor-not-allowed"
        >
          Pending Approval
        </button>
      </div>
    </div>
  );
};

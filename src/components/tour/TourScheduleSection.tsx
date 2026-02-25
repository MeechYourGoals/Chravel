import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Mic, Music, Trophy, Briefcase, Hotel, Plane } from 'lucide-react';
import { Tour, TourTrip } from '../../types/pro';
import { useTripVariant } from '../../contexts/TripVariantContext';

interface TourScheduleSectionProps {
  tour: Tour;
}

export const TourScheduleSection = ({ tour }: TourScheduleSectionProps) => {
  const navigate = useNavigate();
  const { accentColors } = useTripVariant();

  const getCategoryIcon = (category: TourTrip['category']) => {
    switch (category) {
      case 'headline':
        return <Mic size={16} className={`text-${accentColors.primary}`} />;
      case 'private':
        return <Briefcase size={16} className={`text-${accentColors.secondary}`} />;
      case 'college':
        return <Trophy size={16} className="text-glass-green" />;
      case 'festival':
        return <Music size={16} className="text-purple-400" />;
      case 'corporate':
        return <Briefcase size={16} className="text-blue-400" />;
    }
  };

  const getStatusColor = (status: TourTrip['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400';
      case 'planned':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Schedule</h2>
        <button
          className={`bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white font-medium px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2`}
        >
          <Plus size={20} />
          Add Event
        </button>
      </div>

      <div className="grid gap-4">
        {tour.trips.map(trip => (
          <div
            key={trip.id}
            onClick={() => navigate(`/trip/${trip.id}`)}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-r from-${accentColors.primary}/30 to-${accentColors.secondary}/30 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  {getCategoryIcon(trip.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-lg font-semibold text-white group-hover:text-${accentColors.secondary} transition-colors mb-1`}
                  >
                    {trip.city}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <MapPin size={12} />
                      <span className="truncate">{trip.venue}</span>
                    </div>
                    <div className="text-gray-500 text-xs">{trip.venueAddress}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-4">
                <div className="text-right">
                  <div className="text-white font-medium text-sm md:text-base">
                    {new Date(trip.date).toLocaleDateString()}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </div>
                </div>
                <div
                  className={`w-2 h-2 bg-${accentColors.primary} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
                ></div>
              </div>
            </div>

            {/* Transportation & Accommodations Preview */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <Hotel size={12} className={`text-${accentColors.secondary}`} />
                  <span className="truncate">
                    {trip.accommodation?.name} - {trip.accommodation?.confirmationNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Plane size={12} className="text-glass-green" />
                  <span className="truncate">
                    {trip.transportation?.details} - {trip.transportation?.confirmationNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Hotel, Plane, Train, Car, MapPin, Calendar, Eye, EyeOff, Plus, Clock } from 'lucide-react';
import { TourTrip, TeamMember } from '../types/pro';
import { useAuth } from '../hooks/useAuth';
import { useTripVariant } from '../contexts/TripVariantContext';

interface TransportationAccommodationsProps {
  trip: TourTrip;
  currentUser: TeamMember;
}

export const TransportationAccommodations = ({
  trip,
  currentUser,
}: TransportationAccommodationsProps) => {
  const [showAccommodationDetails, setShowAccommodationDetails] = useState(false);
  const [showTransportationDetails, setShowTransportationDetails] = useState(false);
  const { accentColors } = useTripVariant();

  const canViewAccommodation = () => {
    if (!trip.accommodation?.isPrivate) return true;
    if (currentUser.permissions === 'admin') return true;
    return trip.accommodation?.allowedRoles?.includes(currentUser.role) || false;
  };

  const canViewTransportation = () => {
    if (!trip.transportation?.isPrivate) return true;
    if (currentUser.permissions === 'admin') return true;
    return trip.transportation?.allowedRoles?.includes(currentUser.role) || false;
  };

  const getTransportationIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane size={16} className="text-glass-blue" />;
      case 'train':
        return <Train size={16} className="text-glass-green" />;
      case 'car':
        return <Car size={16} className={`text-${accentColors.secondary}`} />;
      default:
        return <Car size={16} className={`text-${accentColors.primary}`} />;
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-white">
          Transportation & Accommodations
        </h2>
        <div
          className={`bg-gradient-to-r from-${accentColors.primary}/20 to-${accentColors.secondary}/20 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1`}
        >
          <span className={`text-${accentColors.primary} font-medium text-sm`}>PRO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accommodation Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 bg-gradient-to-r from-${accentColors.secondary}/30 to-${accentColors.primary}/30 backdrop-blur-sm rounded-xl flex items-center justify-center`}
              >
                <Hotel size={20} className={`text-${accentColors.secondary}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">Accommodation</h3>
            </div>
            {trip.accommodation?.isPrivate && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <EyeOff size={12} />
                <span>Private</span>
              </div>
            )}
          </div>

          {canViewAccommodation() && trip.accommodation ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">{trip.accommodation.name}</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={12}
                      className={`mt-1 text-${accentColors.primary} flex-shrink-0`}
                    />
                    <span>{trip.accommodation.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-glass-green" />
                    <span>
                      {new Date(trip.accommodation.checkIn).toLocaleDateString()} -{' '}
                      {new Date(trip.accommodation.checkOut).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {!showAccommodationDetails ? (
                <button
                  onClick={() => setShowAccommodationDetails(true)}
                  className={`text-${accentColors.secondary} hover:text-${accentColors.primary} text-sm font-medium transition-colors flex items-center gap-2`}
                >
                  <Eye size={12} />
                  Show Confirmation Details
                </button>
              ) : (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase">Confirmation Number</span>
                    <button
                      onClick={() => setShowAccommodationDetails(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <EyeOff size={12} />
                    </button>
                  </div>
                  <div className="text-white font-mono text-sm bg-white/10 rounded px-3 py-2">
                    {trip.accommodation.confirmationNumber}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 capitalize">
                    {trip.accommodation.type} Reservation
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <EyeOff size={24} className="mx-auto mb-2" />
                <p className="text-sm">Accommodation details are private</p>
                <p className="text-xs">Contact your trip manager for access</p>
              </div>
            </div>
          )}
        </div>

        {/* Transportation Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-glass-blue/30 to-glass-green/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {trip.transportation && getTransportationIcon(trip.transportation.type)}
              </div>
              <h3 className="text-lg font-semibold text-white">Transportation</h3>
            </div>
            {trip.transportation?.isPrivate && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <EyeOff size={12} />
                <span>Private</span>
              </div>
            )}
          </div>

          {canViewTransportation() && trip.transportation ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2 capitalize">
                  {trip.transportation.type} Details
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span>{trip.transportation.details}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-glass-blue" />
                    <span>{new Date(trip.transportation.dateTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!showTransportationDetails ? (
                <button
                  onClick={() => setShowTransportationDetails(true)}
                  className="text-glass-blue hover:text-glass-green text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Eye size={12} />
                  Show Confirmation Details
                </button>
              ) : (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase">Confirmation Number</span>
                    <button
                      onClick={() => setShowTransportationDetails(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <EyeOff size={12} />
                    </button>
                  </div>
                  <div className="text-white font-mono text-sm bg-white/10 rounded px-3 py-2">
                    {trip.transportation.confirmationNumber}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 capitalize">
                    {trip.transportation.type} Booking
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <EyeOff size={24} className="mx-auto mb-2" />
                <p className="text-sm">Transportation details are private</p>
                <p className="text-xs">Contact your trip manager for access</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Transportation/Accommodation Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          className={`flex-1 bg-gradient-to-r from-${accentColors.primary}/20 to-${accentColors.secondary}/20 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white hover:text-${accentColors.secondary} transition-all duration-300 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2`}
        >
          <Plus size={16} />
          Add Accommodation
        </button>
        <button className="flex-1 bg-gradient-to-r from-glass-blue/20 to-glass-green/20 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white hover:text-glass-blue transition-all duration-300 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2">
          <Plus size={16} />
          Add Transportation
        </button>
      </div>
    </div>
  );
};

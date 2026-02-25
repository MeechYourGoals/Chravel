import React, { useState } from 'react';
import { MapPin, Plus, Edit3, Calendar, Trash2 } from 'lucide-react';
import { AddPlaceModal } from './AddPlaceModal';
import { AddToCalendarButton } from './AddToCalendarButton';
import { BasecampLocation, PlaceWithDistance } from '../types/basecamp';
import { AddToCalendarData } from '../types/calendar';
import { Badge } from './ui/badge';

interface TripPinsCardProps {
  tripId: string; // Required: needed for calendar event creation
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation;
  onPlaceAdded: (place: PlaceWithDistance) => void;
  onPlaceRemoved: (placeId: string) => void;
  onEventAdded: (eventData: AddToCalendarData) => void;
  distanceUnit: string;
  preferredMode: string;
}

export const TripPinsCard = ({
  tripId,
  places,
  basecamp,
  onPlaceAdded,
  onPlaceRemoved,
  onEventAdded,
  distanceUnit,
  preferredMode,
}: TripPinsCardProps) => {
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl shadow-black/50 min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              places.length > 0
                ? 'bg-gradient-to-r from-red-600 to-red-700'
                : 'bg-gradient-to-r from-gray-600 to-gray-700'
            }`}
          >
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Trip Pins</h3>
            <p className="text-gray-400 text-sm">
              {places.length > 0 ? `${places.length} saved locations` : 'Save your trip locations'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddPlaceModalOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Edit3 size={20} />
        </button>
      </div>

      {places.length === 0 ? (
        /* No Places Saved */
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700 mb-6">
            <MapPin size={32} className="text-gray-400" />
          </div>

          <h4 className="text-xl font-bold text-white mb-3">Save Trip Pins</h4>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
            Start saving locations you want to visit or remember for your trip. Explore the map
            above and add places that catch your eye.
          </p>

          <button
            onClick={() => setIsAddPlaceModalOpen(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-xl shadow-green-500/25 font-semibold border border-green-500/50"
          >
            Save Pin
          </button>

          <div className="mt-8 space-y-2 text-sm text-gray-500">
            <p>• Places you add will be saved to Links for easy access</p>
            <p>• View distances from your basecamp when set</p>
            <p>• Add events directly to your calendar</p>
          </div>
        </div>
      ) : (
        /* Places List */
        <div className="flex-1 space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setIsAddPlaceModalOpen(true)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-all duration-200 border border-gray-700 hover:border-red-500/50 font-medium text-sm"
            >
              <Plus size={16} className="inline mr-2" />
              Add Another Pin
            </button>
          </div>

          {/* Places List */}
          <div className="space-y-3 flex-1 overflow-y-auto">
            {places.map(place => (
              <div key={place.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">{place.name}</h4>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30"
                      >
                        Linked
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-xs capitalize mb-2">{place.category}</p>

                    {place.distanceFromBasecamp && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                          <MapPin size={12} />
                          {place.distanceFromBasecamp[preferredMode]?.toFixed(1)}{' '}
                          {place.distanceFromBasecamp.unit} from basecamp
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <AddToCalendarButton
                        tripId={tripId}
                        placeName={place.name}
                        placeAddress={place.address}
                        category="activity"
                        onEventAdded={onEventAdded}
                        variant="pill"
                      />
                      <button
                        onClick={() => onPlaceRemoved(place.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={12} className="inline mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onPlaceAdded={onPlaceAdded}
        basecamp={basecamp}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { MapPin, Trash2, Navigation2, Calendar, Eye, EyeOff, Link } from 'lucide-react';
import { PlaceWithDistance, BasecampLocation, PlaceCategory, PlaceCategoryEnum } from '@/types/basecamp';
import { AddPlaceModal } from '../AddPlaceModal';
import { AddToCalendarButton } from '../AddToCalendarButton';
import { AddToCalendarData } from '@/types/calendar';
import { Badge } from '../ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

import { PersonalBasecamp } from '@/services/basecampService';

export interface LinksPanelProps {
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
  onPlaceAdded: (place: PlaceWithDistance) => void;
  onPlaceRemoved: (placeId: string) => void;
  onAddToLinks: (place: PlaceWithDistance) => Promise<boolean>;
  linkedPlaceIds: Set<string>;
  onEventAdded: (eventData: AddToCalendarData) => void;
  onCenterMap: (coords: { lat: number; lng: number }) => void;
  distanceUnit: string;
  preferredMode: string;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({
  places,
  basecamp,
  personalBasecamp,
  onPlaceAdded,
  onPlaceRemoved,
  onAddToLinks,
  linkedPlaceIds,
  onEventAdded,
  onCenterMap,
  distanceUnit,
  preferredMode
}) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const isProUser = subscription?.plan === 'pro';

  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(['all']));

  const availableCategories = PlaceCategoryEnum.filter(cat =>
    places.some(p => p.category === cat)
  );

  const categoryIcons: { [key in PlaceCategory]: React.ElementType } = {
    'Appetite': MapPin,
    'Activity': Calendar,
    'Accommodation': MapPin,
    'Attraction': Navigation2,
    'Other': Link,
  };

  const toggleCategory = (category: PlaceCategory | 'all') => {
    const newVisible = new Set(visibleCategories);
    if (category === 'all') {
      newVisible.clear();
      newVisible.add('all');
    } else {
      newVisible.delete('all');
      if (newVisible.has(category)) {
        newVisible.delete(category);
      } else {
        newVisible.add(category);
      }
      if (newVisible.size === 0) {
        newVisible.add('all');
      }
    }
    setVisibleCategories(newVisible);
  };

  const filteredPlaces =
    visibleCategories.has('all')
      ? places
      : places.filter(p => p.category && visibleCategories.has(p.category));

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
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
                <h3 className="text-lg font-bold text-white">Trip Links</h3>
                <p className="text-gray-400 text-xs">
                  {places.length > 0 ? `${places.length} saved links` : 'Save your trip links'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAddPlaceModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl transition-all font-medium text-sm flex items-center shadow-lg shadow-green-500/25"
            >
              +Add link
            </button>
          </div>
        </div>

        {/* Category Filters */}
        {availableCategories.length > 0 && (
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-400 font-medium mb-2">Filter by Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCategory('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  visibleCategories.has('all')
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Eye size={14} />
                All
              </button>
              {availableCategories.map(category => {
                const Icon = categoryIcons[category] || Link;
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      visibleCategories.has(category)
                        ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={14} />
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pins List */}
        {filteredPlaces.length === 0 ? (
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700 mb-4 mx-auto">
              <MapPin size={32} className="text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">
              {places.length === 0 ? 'Save Trip Links' : 'No links in this category'}
            </h4>
            <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
              {places.length === 0
                ? 'Start saving locations you want to visit or remember for your trip.'
                : 'Try selecting a different category or reset filters.'}
            </p>
            {places.length === 0 && (
              <div className="mt-6 space-y-1 text-xs text-gray-500">
                <p>• View distances from your basecamp</p>
                <p>• Add events directly to calendar</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-24 sm:pb-4">
            {filteredPlaces.map(place => (
              <div
                key={place.id}
                className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 hover:border-sky-500/30 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">{place.name}</h4>
                      {linkedPlaceIds.has(place.id) && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30"
                        >
                          Linked
                        </Badge>
                      )}
                    </div>

                    {place.category && (
                      <p className="text-gray-400 text-xs capitalize mb-2">{place.category}</p>
                    )}

                    {place.distanceFromBasecamp && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                          <MapPin size={12} />
                          {place.distanceFromBasecamp[preferredMode]?.toFixed(1)}{' '}
                          {place.distanceFromBasecamp.unit} from trip basecamp
                        </span>
                      </div>
                    )}

                    {isProUser && place.distanceFromPersonalBasecamp && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs">
                          <MapPin size={12} />
                          {place.distanceFromPersonalBasecamp[preferredMode]?.toFixed(1)}{' '}
                          {place.distanceFromPersonalBasecamp.unit} from personal basecamp
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <AddToCalendarButton
                        placeName={place.name}
                        placeAddress={place.address}
                        category="activity"
                        onEventAdded={onEventAdded}
                        variant="pill"
                      />
                      <button
                        onClick={() => onPlaceRemoved(place.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>

                  {place.coordinates && (
                    <button
                      onClick={() => onCenterMap(place.coordinates!)}
                      className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
                      title="Center map on this pin"
                    >
                      <Navigation2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onPlaceAdded={onPlaceAdded}
        basecamp={basecamp}
      />
    </>
  );
};

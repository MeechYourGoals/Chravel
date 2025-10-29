import React, { useState } from 'react';
import { Search, MapPin, Filter, Navigation2 } from 'lucide-react';
import { PlaceWithDistance, BasecampLocation } from '@/types/basecamp';

export interface PlacesPanelProps {
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation | null;
  onPlaceSelect: (place: PlaceWithDistance) => void;
  onCenterMap: (coords: { lat: number; lng: number }) => void;
}

export const PlacesPanel: React.FC<PlacesPanelProps> = ({
  places,
  basecamp,
  onPlaceSelect,
  onCenterMap
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = [
    'all',
    'restaurant',
    'attraction',
    'hotel',
    'activity',
    'fitness',
    'nightlife',
    'transportation'
  ];

  const filteredPlaces = places.filter(place => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || place.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 shadow-lg">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter size={14} className="text-gray-400 flex-shrink-0" />
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                  categoryFilter === category
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredPlaces.length === 0 ? (
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-8 text-center">
            <MapPin size={32} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-sm">
              {searchQuery || categoryFilter !== 'all' ? 'No places found' : 'No places saved yet'}
            </p>
          </div>
        ) : (
          filteredPlaces.map(place => (
            <div
              key={place.id}
              onClick={() => onPlaceSelect(place)}
              className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 hover:border-sky-500/30 hover:bg-gray-900 transition-all cursor-pointer shadow-lg group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold text-sm group-hover:text-sky-300 transition-colors">
                      {place.name}
                    </h4>
                    {place.category && (
                      <span className="text-xs text-gray-500 capitalize">{place.category}</span>
                    )}
                  </div>

                  {place.address && (
                    <p className="text-gray-400 text-xs mb-2 truncate">{place.address}</p>
                  )}

                  {place.distanceFromBasecamp && basecamp && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <MapPin size={12} />
                      <span>
                        {place.distanceFromBasecamp.driving?.toFixed(1) ||
                          place.distanceFromBasecamp.straightLine?.toFixed(1)}{' '}
                        {place.distanceFromBasecamp.unit} from basecamp
                      </span>
                    </div>
                  )}
                </div>

                {place.coordinates && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onCenterMap(place.coordinates!);
                    }}
                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
                    title="Center map on this place"
                  >
                    <Navigation2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

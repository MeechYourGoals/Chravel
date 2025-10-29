import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Navigation2, Calendar, Eye, EyeOff, Link } from 'lucide-react';
import { PlaceWithDistance, BasecampLocation } from '@/types/basecamp';
import { AddPlaceModal } from '../AddPlaceModal';
import { AddToCalendarButton } from '../AddToCalendarButton';
import { AddToCalendarData } from '@/types/calendar';
import { Badge } from '../ui/badge';
import { toast } from '@/hooks/use-toast';

export interface LinksPanelProps {
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation | null;
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
  onPlaceAdded,
  onPlaceRemoved,
  onAddToLinks,
  linkedPlaceIds,
  onEventAdded,
  onCenterMap,
  distanceUnit,
  preferredMode
}) => {
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(['all']));
  const [addingToLinks, setAddingToLinks] = useState<Set<string>>(new Set());

  const categories = Array.from(new Set(places.map(p => p.category).filter(Boolean)));

  const toggleCategory = (category: string) => {
    const newVisible = new Set(visibleCategories);
    if (category === 'all') {
      if (visibleCategories.has('all')) {
        newVisible.clear();
      } else {
        newVisible.clear();
        newVisible.add('all');
      }
    } else {
      newVisible.delete('all');
      if (visibleCategories.has(category)) {
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

  const handleAddToLinksClick = async (place: PlaceWithDistance) => {
    setAddingToLinks(prev => new Set(prev).add(place.id));
    try {
      const success = await onAddToLinks(place);
      if (success) {
        toast({
          title: "Added to Links",
          description: `${place.name} has been saved to your Media > Links section`,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to add",
          description: "Could not save to links. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving to links",
        variant: "destructive",
      });
    } finally {
      setAddingToLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(place.id);
        return newSet;
      });
    }
  };

  return (
    <>
      <div className="space-y-4">

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-400 font-medium mb-2">Filter by Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleCategory('all')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  visibleCategories.has('all')
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {visibleCategories.has('all') ? <Eye size={12} /> : <EyeOff size={12} />}
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category!)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                    visibleCategories.has(category!)
                      ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {visibleCategories.has(category!) ? <Eye size={12} /> : <EyeOff size={12} />}
                  {category}
                </button>
              ))}
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
              <>
                <button
                  onClick={() => setIsAddPlaceModalOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/25 font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} />
                  Add Link
                </button>
                <div className="mt-6 space-y-1 text-xs text-gray-500">
                  <p>• View distances from your basecamp</p>
                  <p>• Add events directly to calendar</p>
                  <p>• Syncs with Links for easy access</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
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
                          {place.distanceFromBasecamp.unit} from basecamp
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {!linkedPlaceIds.has(place.id) && (
                        <button
                          onClick={() => handleAddToLinksClick(place)}
                          disabled={addingToLinks.has(place.id)}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Link size={12} />
                          {addingToLinks.has(place.id) ? 'Adding...' : 'Add to Links'}
                        </button>
                      )}
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

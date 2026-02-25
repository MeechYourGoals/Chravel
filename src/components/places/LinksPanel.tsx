import React, { useState } from 'react';
import { MapPin, Trash2, Navigation2, Calendar, Eye, EyeOff, Link } from 'lucide-react';
import {
  PlaceWithDistance,
  BasecampLocation,
  PlaceCategory,
  PlaceCategoryEnum,
} from '@/types/basecamp';
import { AddPlaceModal } from '../AddPlaceModal';
import { AddToCalendarButton } from '../AddToCalendarButton';
import { AddToCalendarData } from '@/types/calendar';
import { Badge } from '../ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { TripLinksDisplay } from './TripLinksDisplay';
import { PersonalBasecamp } from '@/services/basecampService';

export interface LinksPanelProps {
  tripId: string;
  places: PlaceWithDistance[];
  basecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
  onPlaceAdded: (place: PlaceWithDistance) => void;
  onPlaceRemoved: (placeId: string) => void;
  onAddToLinks: (place: PlaceWithDistance) => Promise<boolean>;
  linkedPlaceIds: Set<string>;
  onEventAdded: (eventData: AddToCalendarData) => void;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({
  tripId,
  places,
  basecamp,
  personalBasecamp,
  onPlaceAdded,
  onPlaceRemoved,
  onAddToLinks,
  linkedPlaceIds,
  onEventAdded,
}) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const isProUser = subscription?.plan === 'pro';

  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(['all']));

  const availableCategories = PlaceCategoryEnum.filter(cat => places.some(p => p.category === cat));

  const categoryIcons: { [key in PlaceCategory]: React.ElementType } = {
    Appetite: MapPin,
    Activity: Calendar,
    Accommodation: MapPin,
    Attraction: Navigation2,
    Other: Link,
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

  const filteredPlaces = visibleCategories.has('all')
    ? places
    : places.filter(p => p.category && visibleCategories.has(p.category));

  return (
    <>
      <div className="space-y-6">
        {/* Trip Links from Database */}
        <TripLinksDisplay tripId={tripId} />
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

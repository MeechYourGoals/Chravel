import { useCallback } from 'react';
import { PlaceWithDistance } from '../types/basecamp';
import { supabase } from '@/integrations/supabase/client';

export const usePlacesLinkSync = () => {
  const mapPlaceCategoryToLink = (placeCategory: string): string => {
    switch (placeCategory) {
      case 'restaurant':
        return 'eats';
      case 'attraction':
        return 'day-activities';
      case 'hotel':
        return 'housing';
      case 'activity':
        return 'day-activities';
      case 'fitness':
        return 'fitness';
      case 'nightlife':
        return 'nightlife';
      case 'transportation':
        return 'transportation';
      default:
        return 'other';
    }
  };

  const generateMapsUrl = (place: PlaceWithDistance): string => {
    if (place.url) return place.url;
    if (place.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
  };

  const createLinkFromPlace = useCallback(
    async (place: PlaceWithDistance, userName: string = 'You', tripId: string, userId?: string) => {
      try {
        // Demo mode fallback - store in localStorage
        if (!userId) {
          console.warn('Demo mode: Link not persisted to database');
          const demoLinks = JSON.parse(localStorage.getItem(`demo_trip_links_${tripId}`) || '[]');
          demoLinks.push({
            place_id: place.id,
            name: place.name,
            url: generateMapsUrl(place),
            timestamp: Date.now(),
          });
          localStorage.setItem(`demo_trip_links_${tripId}`, JSON.stringify(demoLinks));
          return;
        }

        // Prepare link data for database
        const url = generateMapsUrl(place);
        const linkData = {
          trip_id: tripId,
          url: url,
          og_title: place.name,
          og_description: `Saved from Places${place.address ? `: ${place.address}` : ''} | place_id:${place.id}${place.coordinates ? ` | coords:${place.coordinates.lat},${place.coordinates.lng}` : ''}${place.category ? ` | category:${place.category}` : ''}`,
          domain: new URL(url).hostname,
          og_image_url: null,
          favicon_url: null,
        };

        // Insert into trip_link_index table
        const { data, error } = await supabase
          .from('trip_link_index')
          .insert(linkData)
          .select()
          .single();

        if (error) {
          console.error('Error creating link from place:', error);
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Failed to save link to database:', error);
        throw error;
      }
    },
    [],
  );

  const removeLinkByPlaceId = useCallback(
    async (placeId: string, tripId: string, userId?: string) => {
      try {
        // Demo mode fallback
        if (!userId) {
          const demoLinks = JSON.parse(localStorage.getItem(`demo_trip_links_${tripId}`) || '[]');
          const filtered = demoLinks.filter((link: any) => link.place_id !== placeId);
          localStorage.setItem(`demo_trip_links_${tripId}`, JSON.stringify(filtered));
          return;
        }

        // Find links with this place ID in og_description metadata
        const { data: existingLinks } = await supabase
          .from('trip_link_index')
          .select('id, og_description')
          .eq('trip_id', tripId);

        // Filter links that mention this place
        const linkToDelete = existingLinks?.find(link =>
          link.og_description?.includes(`place_id:${placeId}`),
        );

        if (linkToDelete) {
          await supabase.from('trip_link_index').delete().eq('id', linkToDelete.id);
        }
      } catch (error) {
        console.error('Failed to remove link:', error);
      }
    },
    [],
  );

  const updateLinkByPlaceId = useCallback(
    async (placeId: string, updatedPlace: PlaceWithDistance, tripId: string, userId?: string) => {
      try {
        // Demo mode fallback
        if (!userId) {
          const demoLinks = JSON.parse(localStorage.getItem(`demo_trip_links_${tripId}`) || '[]');
          const updated = demoLinks.map((link: any) =>
            link.place_id === placeId
              ? { ...link, name: updatedPlace.name, url: generateMapsUrl(updatedPlace) }
              : link,
          );
          localStorage.setItem(`demo_trip_links_${tripId}`, JSON.stringify(updated));
          return;
        }

        const { data: existingLinks } = await supabase
          .from('trip_link_index')
          .select('id, og_description')
          .eq('trip_id', tripId);

        const linkToUpdate = existingLinks?.find(link =>
          link.og_description?.includes(`place_id:${placeId}`),
        );

        if (linkToUpdate) {
          await supabase
            .from('trip_link_index')
            .update({
              og_title: updatedPlace.name,
              url: generateMapsUrl(updatedPlace),
              og_description: `Saved from Places${updatedPlace.address ? `: ${updatedPlace.address}` : ''} | place_id:${placeId}`,
            })
            .eq('id', linkToUpdate.id);
        }
      } catch (error) {
        console.error('Failed to update link:', error);
      }
    },
    [],
  );

  return {
    createLinkFromPlace,
    removeLinkByPlaceId,
    updateLinkByPlaceId,
  };
};

import { useState, useEffect } from 'react';
import { tripService } from '@/services/tripService';
import { supabase } from '@/integrations/supabase/client';
import { getTripById } from '@/data/tripsData';
import { useDemoMode } from './useDemoMode';

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

export const useTripMembers = (tripId?: string) => {
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { isDemoMode } = useDemoMode();

  const formatTripMembers = (dbMembers: any[]): TripMember[] => {
    return dbMembers.map(member => ({
      id: member.user_id,
      name: member.profiles?.display_name || member.profiles?.first_name || 'Unknown User',
      avatar: member.profiles?.avatar_url
    }));
  };

  const getMockFallbackMembers = (tripId: string): TripMember[] => {
    // CRITICAL: Only use mock data if tripId is ENTIRELY numeric (not a UUID)
    const isNumericOnly = /^\d+$/.test(tripId);
    if (!isNumericOnly) {
      // UUID trip - no mock fallback
      return [];
    }
    const numericTripId = parseInt(tripId, 10);
    const trip = getTripById(numericTripId);
    
    if (trip && trip.participants) {
      return trip.participants.map(participant => ({
        id: participant.id.toString(),
        name: participant.name,
        avatar: participant.avatar
      }));
    }
    
    // Default fallback if no trip found
    return [
      { id: 'user1', name: 'You' },
      { id: 'user2', name: 'Trip Organizer' }
    ];
  };

  const loadTripMembers = async (tripId: string) => {
    setLoading(true);
    
    try {
      // ⚡ PERFORMANCE: Fast path for demo mode with numeric IDs - skip database entirely
      const isNumericOnly = /^\d+$/.test(tripId);
      if (isDemoMode && isNumericOnly) {
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
        setLoading(false);
        return;
      }

      // Always try database first for authenticated trips
      const dbMembers = await tripService.getTripMembers(tripId);
      
      if (dbMembers && dbMembers.length > 0) {
        // Database has members - use them
        const formattedMembers = formatTripMembers(dbMembers);
        setTripMembers(formattedMembers);
      } else if (isDemoMode) {
        // Demo mode + no DB members = use mock fallback
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
      } else {
        // Production mode + no DB members = truly empty
        setTripMembers([]);
      }
    } catch (error) {
      // On error: demo gets mocks, production gets empty
      if (isDemoMode) {
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
      } else {
        setTripMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadTripMembers(tripId);
    }
  }, [tripId, isDemoMode]);

  // Real-time subscription for trip members - only when database queries succeed
  useEffect(() => {
    if (!tripId) return;

    let channel: any;

    // Only create subscription if we have a valid trip ID and database connection
    const createSubscription = async () => {
      try {
        // Test if we can connect to the database first
        const { data } = await supabase.from('trip_members').select('id').limit(1);
        
        if (data !== null) {
          channel = supabase
            .channel(`trip-members-${tripId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'trip_members',
                filter: `trip_id=eq.${tripId}`
              },
              () => {
                // Reload members when changes occur
                loadTripMembers(tripId);
              }
            )
            .subscribe();
        }
      } catch (error) {
      }
    };

    createSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tripId]);

  return {
    tripMembers,
    loading,
    refreshMembers: () => tripId && loadTripMembers(tripId)
  };
};
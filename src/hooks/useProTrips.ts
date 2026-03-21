import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveService } from '@/services/archiveService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { ProTripData } from '@/types/pro';
import { supabase } from '@/integrations/supabase/client';
import { proTripMockData } from '@/data/proTripMockData';

const PRO_TRIPS_QUERY_KEY = 'proTrips';

/**
 * Convert a Supabase trip row (RLS-scoped by auth.uid()) to ProTripData format.
 */
function mapSupabaseTripToProTripData(trip: Record<string, unknown>): ProTripData {
  const startDate = trip.start_date ? String(trip.start_date) : '';
  const endDate = trip.end_date ? String(trip.end_date) : '';
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : startDate || '';

  return {
    id: String(trip.id),
    title: String(trip.title || ''),
    description: String(trip.description || ''),
    location: String(trip.destination || ''),
    dateRange,
    coverPhoto: trip.cover_photo as string | undefined,
    card_color: trip.card_color as string | undefined,
    proTripCategory: trip.pro_trip_category as ProTripData['proTripCategory'],
    tags: (trip.tags as string[]) || [],
    participants: [],
    budget: { total: 0, spent: 0, categories: [] },
    itinerary: [],
    roster: [],
    roomAssignments: [],
    schedule: [],
    perDiem: { dailyRate: 0, currency: 'USD', startDate: '', endDate: '', participants: [] },
    settlement: [],
    medical: [],
    compliance: [],
    media: [],
    sponsors: [],
    trip_type: 'pro',
    archived: trip.is_archived === true,
    enabled_features: (trip.enabled_features as string[]) || [
      'chat',
      'calendar',
      'concierge',
      'media',
      'payments',
      'places',
      'polls',
      'tasks',
    ],
    privacy_mode: (trip.privacy_mode as 'standard' | 'high') || 'standard',
    ai_access_enabled: trip.ai_access_enabled !== false,
  };
}

export const useProTrips = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const {
    data: proTrips = [],
    isLoading,
    error: queryError,
  } = useQuery<ProTripData[]>({
    queryKey: [PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode],
    queryFn: async (): Promise<ProTripData[]> => {
      if (isDemoMode) {
        return Object.values(proTripMockData);
      }
      if (!user) return [];

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_type', 'pro')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pro trips: ${error.message}`);
      }

      return (data || []).map(trip =>
        mapSupabaseTripToProTripData(trip as Record<string, unknown>),
      );
    },
    enabled: isDemoMode || !!user,
  });

  const archiveTripMutation = useMutation({
    mutationFn: (id: string) => archiveService.archiveTrip(id, 'pro'),
    onMutate: async tripId => {
      await queryClient.cancelQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData(
        [PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode],
        (old: ProTripData[] | undefined) => (old ? old.filter(trip => trip.id !== tripId) : []),
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const hideTripMutation = useMutation({
    mutationFn: (id: string) => archiveService.hideTrip(id),
    onMutate: async tripId => {
      await queryClient.cancelQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData(
        [PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode],
        (old: ProTripData[] | undefined) => (old ? old.filter(trip => trip.id !== tripId) : []),
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const deleteTripForMeMutation = useMutation({
    mutationFn: ({ tripId, userId }: { tripId: string; userId: string }) =>
      archiveService.deleteTripForMe(tripId, userId),
    onMutate: async ({ tripId }) => {
      await queryClient.cancelQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData(
        [PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode],
        (old: ProTripData[] | undefined) => (old ? old.filter(trip => trip.id !== tripId) : []),
      );
      return { previousTrips };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([PRO_TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRO_TRIPS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  return {
    proTrips,
    loading: isLoading,
    error: queryError,
    archiveTrip: archiveTripMutation.mutateAsync,
    hideTrip: hideTripMutation.mutateAsync,
    deleteTripForMe: deleteTripForMeMutation.mutateAsync,
  };
};

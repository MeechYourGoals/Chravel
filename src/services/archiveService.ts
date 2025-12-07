import { supabase } from '@/integrations/supabase/client';

type TripType = 'consumer' | 'pro' | 'event';

// Hide a trip (privacy feature - separate from archive)
export const hideTrip = async (tripId: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_hidden: true })
    .eq('id', tripId);

  if (error) {
    console.error('Failed to hide trip:', error);
    throw error;
  }
};

// Unhide a trip
export const unhideTrip = async (tripId: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_hidden: false })
    .eq('id', tripId);

  if (error) {
    console.error('Failed to unhide trip:', error);
    throw error;
  }
};

// Check if a trip is hidden
export const isTripHidden = async (tripId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('trips')
    .select('is_hidden')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error('Failed to check hidden status:', error);
    return false;
  }

  return data?.is_hidden ?? false;
};

// Get hidden trips (only when show_hidden_trips preference is true)
export const getHiddenTrips = async (userId: string) => {
  const { data: hiddenTrips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('is_hidden', true)
    .eq('created_by', userId);

  if (error) {
    console.error('Failed to get hidden trips:', error);
    return [];
  }

  return hiddenTrips || [];
};

// Get archived trip count for stats
export const getArchivedTripCount = async (userId: string, tripType?: TripType): Promise<number> => {
  let query = supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('is_archived', true)
    .eq('created_by', userId);

  if (tripType) {
    const dbTripType = tripType === 'consumer' ? 'standard' : tripType;
    query = query.eq('trip_type', dbTripType);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Failed to get archived trip count:', error);
    return 0;
  }

  return count || 0;
};

// Archive a trip
export const archiveTrip = async (tripId: string, tripType: TripType, userId?: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_archived: true })
    .eq('id', tripId);

  if (error) {
    console.error('Failed to archive trip:', error);
    throw error;
  }
};

// Restore (unarchive) a trip
export const restoreTrip = async (tripId: string, tripType: TripType, userId?: string): Promise<void> => {
  // Check if user has reached their active trip limit
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_product_id')
      .eq('user_id', userId)
      .single();

    const tier = profile?.subscription_status === 'active' 
      ? (profile.subscription_product_id?.includes('explorer') ? 'explorer' : 'frequent-chraveler')
      : 'free';

    // Count current active trips
    const { count, error: countError } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('is_archived', false);

    if (countError) throw countError;

    const activeTripsLimit = tier === 'free' ? 3 : -1;
    if (activeTripsLimit !== -1 && (count || 0) >= activeTripsLimit) {
      throw new Error('TRIP_LIMIT_REACHED');
    }
  }

  const { error } = await supabase
    .from('trips')
    .update({ is_archived: false })
    .eq('id', tripId);

  if (error) {
    console.error('Failed to restore trip:', error);
    throw error;
  }
};

// Check if a trip is archived
export const isTripArchived = async (tripId: string, tripType: TripType, userId?: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('trips')
    .select('is_archived')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error('Failed to check archive status:', error);
    return false;
  }

  return data?.is_archived ?? false;
};

// Get all archived trips (excludes hidden trips - they have their own section)
export const getArchivedTrips = async (userId?: string) => {
  const { data: archivedTrips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('is_archived', true)
    .eq('is_hidden', false)  // Hidden trips should not appear in archive section
    .eq('created_by', userId || '');

  if (error) {
    console.error('Failed to get archived trips:', error);
    return {
      consumer: [],
      pro: [],
      events: [],
      total: 0
    };
  }

  // Separate by trip_type
  const consumer = archivedTrips?.filter(t => t.trip_type === 'consumer') || [];
  const pro = archivedTrips?.filter(t => t.trip_type === 'pro') || [];
  const events = archivedTrips?.filter(t => t.trip_type === 'event') || [];

  return {
    consumer,
    pro,
    events,
    total: archivedTrips?.length || 0
  };
};

// Filter active (non-archived) trips
export const filterActiveTrips = async <T extends { id: string | number }>(
  trips: T[], 
  tripType: TripType,
  userId?: string
): Promise<T[]> => {
  // Get all archived trip IDs from database
  const { data: archivedTrips, error } = await supabase
    .from('trips')
    .select('id')
    .eq('is_archived', true)
    .eq('trip_type', tripType);

  if (error) {
    console.error('Failed to filter active trips:', error);
    return trips;
  }

  const archivedIds = new Set(archivedTrips?.map(t => t.id) || []);
  return trips.filter(trip => !archivedIds.has(trip.id.toString()));
};

// Get trip archive status for display
export const getTripArchiveStatus = async (tripId: string, tripType: TripType, userId?: string) => {
  const isArchived = await isTripArchived(tripId, tripType, userId);
  return {
    isArchived,
    canArchive: !isArchived,
    canRestore: isArchived
  };
};

// Bulk archive operations
export const bulkArchiveTrips = async (tripIds: string[], tripType: TripType, userId?: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_archived: true })
    .in('id', tripIds);

  if (error) {
    console.error('Failed to bulk archive trips:', error);
    throw error;
  }
};

export const bulkRestoreTrips = async (tripIds: string[], tripType: TripType, userId?: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_archived: false })
    .in('id', tripIds);

  if (error) {
    console.error('Failed to bulk restore trips:', error);
    throw error;
  }
};

// Clear all archived trips (for admin/reset purposes)
export const clearAllArchivedTrips = async (userId?: string): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ is_archived: false })
    .eq('created_by', userId || '')
    .eq('is_archived', true);

  if (error) {
    console.error('Failed to clear archived trips:', error);
    throw error;
  }
};

// Analytics helpers
export const getArchiveAnalytics = async (userId?: string) => {
  const archived = await getArchivedTrips(userId);

  const { data: allTrips, error } = await supabase
    .from('trips')
    .select('id, trip_type')
    .eq('created_by', userId || '');

  if (error) {
    console.error('Failed to get archive analytics:', error);
    return {
      totalArchived: archived.total,
      archivedByType: {
        consumer: archived.consumer.length,
        pro: archived.pro.length,
        events: archived.events.length
      },
      archiveRate: {
        consumer: 0,
        pro: 0,
        events: 0
      }
    };
  }

  const totalConsumer = allTrips?.filter(t => t.trip_type === 'consumer').length || 1;
  const totalPro = allTrips?.filter(t => t.trip_type === 'pro').length || 1;
  const totalEvents = allTrips?.filter(t => t.trip_type === 'event').length || 1;

  return {
    totalArchived: archived.total,
    archivedByType: {
      consumer: archived.consumer.length,
      pro: archived.pro.length,
      events: archived.events.length
    },
    archiveRate: {
      consumer: archived.consumer.length / totalConsumer,
      pro: archived.pro.length / totalPro,
      events: archived.events.length / totalEvents
    }
  };
};

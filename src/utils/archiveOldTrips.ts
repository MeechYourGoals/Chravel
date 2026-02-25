import { supabase } from '@/integrations/supabase/client';

interface ArchiveStats {
  tripsArchived: number;
  mediaArchived: number;
  messagesArchived: number;
  eventsArchived: number;
  storageFreedMB: number;
}

/**
 * Archive trips that haven't been accessed in the specified number of days
 * This moves trip data to an archived state without deletion
 */
export async function archiveInactiveTrips(inactiveDays: number = 365): Promise<ArchiveStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  const stats: ArchiveStats = {
    tripsArchived: 0,
    mediaArchived: 0,
    messagesArchived: 0,
    eventsArchived: 0,
    storageFreedMB: 0,
  };

  try {
    // Find inactive trips (no activity since cutoff date)
    const { data: inactiveTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id, updated_at')
      .lt('updated_at', cutoffDate.toISOString())
      .eq('is_archived', false)
      .limit(100); // Process in batches

    if (tripsError) throw tripsError;
    if (!inactiveTrips || inactiveTrips.length === 0) {
      console.log('No inactive trips found to archive');
      return stats;
    }

    const tripIds = inactiveTrips.map(t => t.id);
    console.log(`Found ${tripIds.length} inactive trips to archive`);

    // Archive media (move to cold storage metadata, but keep records)
    const { data: mediaToArchive } = await supabase
      .from('trip_media_index')
      .select('id, file_size')
      .in('trip_id', tripIds);

    if (mediaToArchive) {
      const totalMediaSize = mediaToArchive.reduce((sum, m) => sum + (m.file_size || 0), 0);
      stats.mediaArchived = mediaToArchive.length;
      stats.storageFreedMB = totalMediaSize / (1024 * 1024);

      // Mark media as archived (metadata update)
      await supabase
        .from('trip_media_index')
        .update({
          metadata: {
            archived: true,
            archived_at: new Date().toISOString(),
          },
        })
        .in('trip_id', tripIds);
    }

    // Count messages for stats
    const { count: messageCount } = await supabase
      .from('trip_chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('trip_id', tripIds);
    stats.messagesArchived = messageCount || 0;

    // Count events for stats
    const { count: eventCount } = await supabase
      .from('trip_events')
      .select('*', { count: 'exact', head: true })
      .in('trip_id', tripIds);
    stats.eventsArchived = eventCount || 0;

    // Mark trips as archived
    const { error: archiveError } = await supabase
      .from('trips')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .in('id', tripIds);

    if (archiveError) throw archiveError;
    stats.tripsArchived = tripIds.length;

    console.log('Archive stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error archiving trips:', error);
    throw error;
  }
}

/**
 * Restore archived trip back to active state
 */
export async function restoreArchivedTrip(tripId: string): Promise<void> {
  try {
    // Unmark trip as archived
    const { error: tripError } = await supabase
      .from('trips')
      .update({
        is_archived: false,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId);

    if (tripError) throw tripError;

    // Restore media metadata
    const { error: mediaError } = await supabase
      .from('trip_media_index')
      .update({
        metadata: {
          archived: false,
          restored_at: new Date().toISOString(),
        },
      })
      .eq('trip_id', tripId);

    if (mediaError) throw mediaError;

    console.log(`Trip ${tripId} restored successfully`);
  } catch (error) {
    console.error('Error restoring trip:', error);
    throw error;
  }
}

/**
 * Get list of archived trips with summary statistics
 */
export async function getArchivedTripsSummary() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, archived_at, updated_at')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete permanently archived trips older than specified days
 * WARNING: This is permanent deletion, use with caution
 */
export async function deleteOldArchivedTrips(archiveAgeDays: number = 730): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - archiveAgeDays);

  try {
    // Find trips archived before cutoff
    const { data: oldTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('is_archived', true)
      .lt('archived_at', cutoffDate.toISOString());

    if (!oldTrips || oldTrips.length === 0) return 0;

    const tripIds = oldTrips.map(t => t.id);

    // Delete associated data (cascading deletes should handle most)
    await supabase.from('trip_media_index').delete().in('trip_id', tripIds);
    await supabase.from('trip_chat_messages').delete().in('trip_id', tripIds);
    await supabase.from('trip_events').delete().in('trip_id', tripIds);
    await supabase.from('trip_members').delete().in('trip_id', tripIds);

    // Delete trips
    await supabase.from('trips').delete().in('id', tripIds);

    console.log(`Permanently deleted ${tripIds.length} old archived trips`);
    return tripIds.length;
  } catch (error) {
    console.error('Error deleting old archived trips:', error);
    throw error;
  }
}

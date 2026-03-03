/**
 * Canonical trip/event deletion decision engine.
 *
 * Single source of truth for "what happens when a user removes a trip from their view."
 * All UI entry points (TripCard, TripGrid swipe, EventCard, MobileDetail pages)
 * MUST route through this service — never call archiveService directly for deletion.
 */
import { archiveService } from './archiveService';

export type DeletionAction = 'archived' | 'left';

export interface DeletionResult {
  action: DeletionAction;
  tripId: string;
}

export interface DeletionContext {
  tripId: string;
  userId: string;
  isCreator: boolean;
  /** If true, creator path uses archive (preserves trip for other members). */
  isDemoMode?: boolean;
}

/**
 * Decides and executes the correct deletion path:
 * - Creator → archive the trip (sets is_archived=true, trip persists for members).
 * - Non-creator member → leave the trip (removes trip_members row).
 *
 * Returns which action was taken so the UI can show the right toast.
 */
export async function executeDeleteTrip(ctx: DeletionContext): Promise<DeletionResult> {
  const { tripId, userId, isCreator } = ctx;

  if (import.meta.env.DEV) {
    console.log('[tripDeletionService] executeDeleteTrip', {
      tripId,
      userId,
      isCreator,
    });
  }

  if (isCreator) {
    // Creator path: archive (sets is_archived=true on the trips row).
    // This removes it from getUserTrips (which filters is_archived=false).
    await archiveService.archiveTrip(tripId, 'consumer');
    return { action: 'archived', tripId };
  }

  // Non-creator path: remove membership row.
  await archiveService.deleteTripForMe(tripId, userId);
  return { action: 'left', tripId };
}

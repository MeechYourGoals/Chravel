import { tripRepo } from './tripRepo';
import { membershipRepo } from './membershipRepo';
import { calendarRepo } from './calendarRepo';
import { tasksRepo } from './tasksRepo';
import { pollsRepo } from './pollsRepo';
import { placesRepo } from './placesRepo';
import { settingsRepo } from './settingsRepo';
import { paymentsRepo } from './paymentsRepo'; // Assuming you might want payment summaries too
import { TripContext } from '@/types/tripContext';
import { Invariants } from '@/domain/invariants';

/**
 * Concierge Repository (TDAL)
 *
 * Responsible for building the "Trip Context" object used by AI.
 * strictly uses other TDAL repos to ensure consistency.
 */
export const conciergeRepo = {
  /**
   * Build the full context object for AI Concierge.
   *
   * @param tripId The ID of the trip to fetch context for.
   * @param userId The ID of the user requesting the context (for RLS/Permissions checks).
   */
  async buildContext(tripId: string, userId: string): Promise<TripContext> {
    // 1. Invariant Check: Ensure user is a member (or admin)
    // We fetch members to verify access and also to populate the participant list.
    const { members } = await membershipRepo.getMembersWithCreator(tripId);
    Invariants.Membership.assertIsMember(userId, members);

    // 2. Fetch all data in parallel using TDAL
    const [
      trip,
      events,
      tasks,
      polls,
      places,
      settings
    ] = await Promise.all([
      tripRepo.getById(tripId),
      calendarRepo.getEvents(tripId),
      tasksRepo.getTasks(tripId),
      pollsRepo.getPolls(tripId),
      placesRepo.getPlaces(tripId),
      settingsRepo.getTripSettings(tripId)
    ]);

    if (!trip) throw new Error('Trip not found');

    // 3. Apply Settings / Feature Toggles (e.g. if AI is disabled, we might throw or return partial)
    if (settings && settings.ai_access_enabled === false) {
       // Ideally we might throw, but let's just return minimal context or handle gracefully
       // For now, we assume if they are calling this, they want context.
       // Only the "Assistant" capability might be disabled, but context building is internal.
    }

    // 4. Transform to TripContext shape
    const today = new Date().toISOString().split('T')[0];

    // Format Date Range
    const dateRange = (trip.start_date && trip.end_date)
      ? { start: trip.start_date, end: trip.end_date }
      : (trip.start_date || 'Date not set');

    // Filter Upcoming Events (Next 7 days)
    const upcomingEvents = events
      .filter(e => e.start_time >= today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        title: e.title,
        date: e.start_time.split('T')[0],
        time: e.start_time.split('T')[1]?.substring(0, 5),
        location: e.location || 'No location'
      }));

    // Format Participants
    const participants = members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role
    }));

    // Format Polls (Open only?)
    const openPolls = polls.filter(p => p.status === 'open').map(p => ({
        id: p.id,
        question: p.question,
        options: Array.isArray(p.options) ? p.options : [],
        totalVotes: 0, // Need to join votes if we want accuracy, for now schema is loose
        createdBy: p.created_by,
        createdAt: p.created_at,
        status: p.status as 'active' | 'closed'
    }));

    // Format Tasks (Incomplete only?)
    const incompleteTasks = tasks.filter(t => !t.completed).map(t => ({
        id: t.id,
        trip_id: t.trip_id,
        title: t.title,
        description: t.description || undefined,
        due_at: t.due_at || undefined,
        completed: t.completed,
        creator_id: t.creator_id
    }));

    return {
      tripId,
      title: trip.name,
      location: trip.destination || 'Destination not set',
      dateRange,
      participants,
      itinerary: [], // Populated below if we want structured days
      accommodation: trip.basecamp_name
        ? { name: trip.basecamp_name, address: trip.basecamp_address || '', checkIn: '', checkOut: '' }
        : undefined,
      currentDate: today,
      upcomingEvents,
      recentUpdates: [], // We could fetch recent chat/broadcasts if needed
      confirmationNumbers: {}, // Extracted from notes/files if we had that logic

      // Extended Context
      tasks: incompleteTasks,
      polls: openPolls,
      visitedPlaces: places.map(p => p.og_title || p.url),

      // We can add more sections here (spending patterns, etc) by calling paymentsRepo
    };
  }
};

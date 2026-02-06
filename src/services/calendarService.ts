import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/types/calendar';
import { demoModeService } from './demoModeService';
import { demoTripEventsByTripId } from '@/mockData/demoTripEvents';
import { calendarStorageService } from './calendarStorageService';
import { calendarOfflineQueue } from './calendarOfflineQueue';
import { offlineSyncService } from './offlineSyncService';
import { retryWithBackoff } from '@/utils/retry';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';

export interface TripEvent {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_category: string;
  include_in_itinerary: boolean;
  source_type: string;
  source_data: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  trip_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_category?: string;
  include_in_itinerary?: boolean;
  source_type?: string;
  source_data?: any;
  // Recurring event support
  recurrence_rule?: string;
  recurrence_exceptions?: string[];
  // Busy/free time blocking
  is_busy?: boolean;
  availability_status?: 'busy' | 'free' | 'tentative';
}

export const calendarService = {
  /**
   * Ensure user is a trip member before performing operations that require membership.
   * If user is the trip creator but not a member, automatically add them.
   * Super admins are always added as admin members.
   */
  async ensureTripMembership(tripId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is already a trip member
      const { data: existingMember } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        return true; // Already a member
      }

      // Get user email to check for super admin
      const { data: { user } } = await supabase.auth.getUser();
      const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

      // Check if user is the trip creator
      const { data: trip } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();

      if (trip?.created_by === userId || isSuperAdmin) {
        // User is the creator OR a super admin - add them as admin
        const { error: insertError } = await supabase
          .from('trip_members')
          .insert({
            trip_id: tripId,
            user_id: userId,
            role: 'admin',
            status: 'active'
          });

        if (insertError) {
          // Check if it's a duplicate error (user was added by another process)
          if (insertError.code === '23505') {
            return true; // Already a member (race condition)
          }
          if (import.meta.env.DEV) {
            console.warn('Failed to auto-add user as member:', insertError);
          }
          return false;
        }
        return true;
      }

      // User is neither a member nor the creator
      return false;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error ensuring trip membership:', error);
      }
      return false;
    }
  },

  /**
   * Check if the new event overlaps with any existing events.
   * Returns an array of conflicting event titles (empty if no conflicts).
   */
  async checkForConflicts(tripId: string, startTime: string, endTime?: string): Promise<string[]> {
    try {
      const events = await this.getTripEvents(tripId);
      const newStart = new Date(startTime).getTime();
      const newEnd = endTime ? new Date(endTime).getTime() : newStart + 3600000; // Default 1 hour if no end time

      const conflicts: string[] = [];
      
      for (const event of events) {
        const eventStart = new Date(event.start_time).getTime();
        const eventEnd = event.end_time 
          ? new Date(event.end_time).getTime() 
          : eventStart + 3600000; // Default 1 hour if no end time

        // Check if times overlap
        const overlaps = (newStart < eventEnd) && (newEnd > eventStart);
        if (overlaps) {
          conflicts.push(event.title);
        }
      }
      
      return conflicts;
    } catch (error) {
      console.warn('Could not check for conflicts:', error);
      return []; // Don't block on conflict check failure
    }
  },

  async createEvent(eventData: CreateEventData): Promise<{ event: TripEvent | null; conflicts: string[] }> {
    const conflicts: string[] = [];

    try {
      // Validate required fields
      if (!eventData.trip_id) {
        console.error('[calendarService] Missing trip_id in event data');
        throw new Error('Trip ID is required to create an event');
      }
      if (!eventData.title?.trim()) {
        console.error('[calendarService] Missing title in event data');
        throw new Error('Event title is required');
      }
      if (!eventData.start_time) {
        console.error('[calendarService] Missing start_time in event data');
        throw new Error('Event start time is required');
      }

      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();

      // Check for conflicts first (non-blocking - just for notification)
      const existingConflicts = await this.checkForConflicts(
        eventData.trip_id, 
        eventData.start_time, 
        eventData.end_time
      );
      conflicts.push(...existingConflicts);

      if (isDemoMode) {
        // Use localStorage for demo mode
        const event = await calendarStorageService.createEvent(eventData);
        return { event, conflicts };
      }

      // Check if offline - queue the operation
      if (!navigator.onLine) {
        const queueId = await calendarOfflineQueue.queueCreate(eventData.trip_id, eventData);

        // Also queue in unified sync service
        await offlineSyncService.queueOperation(
          'calendar_event',
          'create',
          eventData.trip_id,
          eventData
        );

        // Return optimistic event for immediate UI update
        const { data: { user } } = await supabase.auth.getUser();
        return {
          event: {
            id: queueId,
            ...eventData,
            created_by: user?.id || (eventData as any).created_by || user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
          } as TripEvent,
          conflicts
        };
      }

      // Use Supabase for authenticated users - direct insert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[calendarService] User not authenticated');
        throw new Error('You must be logged in to create events. Please sign in and try again.');
      }

      console.log('[calendarService] Creating event for trip:', eventData.trip_id, 'by user:', user.id);

      // Check if user is super admin
      const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

      // Ensure trip membership for RLS policies (unless super admin)
      if (!isSuperAdmin) {
        const hasMembership = await this.ensureTripMembership(eventData.trip_id, user.id);
        if (!hasMembership) {
          console.warn('[calendarService] User not a trip member and could not be added. Trip ID:', eventData.trip_id);
          // Don't throw here - let the insert fail with a more descriptive RLS error
          // The insert will fail if the user truly doesn't have access
        }
      } else {
        // Super admin: ensure they're a trip member with admin role
        console.log('[calendarService] Super admin detected, ensuring membership');
        await this.ensureTripMembership(eventData.trip_id, user.id);
      }

      // Direct insert - simpler and more reliable than RPC
      const createdEvent = await retryWithBackoff(
        async () => {
          const { data: directEvent, error: directError } = await supabase
            .from('trip_events')
            .insert({
              trip_id: eventData.trip_id,
              title: eventData.title,
              description: eventData.description || null,
              location: eventData.location || null,
              start_time: eventData.start_time,
              end_time: eventData.end_time || null,
              created_by: user.id,
              event_category: eventData.event_category || 'other',
              include_in_itinerary: eventData.include_in_itinerary ?? true,
              source_type: eventData.source_type || 'manual',
              source_data: eventData.source_data || {}
            })
            .select('*')
            .single();

          if (directError) {
            console.error('[calendarService] Insert failed:', directError);
            // Provide more specific error messages based on error type
            if (directError.code === '42501' || directError.message?.includes('RLS') || directError.message?.includes('policy')) {
              throw new Error('You do not have permission to add events to this trip. Please contact the trip admin.');
            }
            if (directError.code === '23503' || directError.message?.includes('foreign key')) {
              throw new Error('This trip no longer exists or is invalid.');
            }
            if (directError.code === '23505') {
              throw new Error('An event with this information already exists.');
            }
            throw new Error(directError.message || 'Failed to create event. Please try again.');
          }
          return directEvent;
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            if (import.meta.env.DEV) {
              console.warn(`Retry attempt ${attempt}/3 for creating calendar event:`, error.message);
            }
          }
        }
      );
      
      // Cache the created event
      await offlineSyncService.cacheEntity(
        'calendar_event',
        createdEvent.id,
        createdEvent.trip_id,
        createdEvent,
        createdEvent.version || 1
      );
      
      return { event: createdEvent, conflicts };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error creating event:', error);
      }

      // If offline, the operation was already queued above
      if (!navigator.onLine) {
        return { event: null, conflicts };
      }

      throw error; // Re-throw so the hook can catch and display the actual error
    }
  },

  async getTripEvents(tripId: string): Promise<TripEvent[]> {
    // Declare outside try block for catch block access
    let cachedEvents: any[] = [];
    
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      
      if (isDemoMode) {
        const storedEvents = await calendarStorageService.getEvents(tripId);
        const seededEvents = demoTripEventsByTripId[tripId] || [];

        if (storedEvents.length === 0 && seededEvents.length > 0) {
          await calendarStorageService.setEvents(tripId, seededEvents);
          return seededEvents;
        }

        return storedEvents;
      }

      // Try to load from cache first for instant display
      cachedEvents = await offlineSyncService.getCachedEntities(tripId, 'calendar_event');

      // Use Supabase with timezone-aware function for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback to direct query if no user
        const { data, error } = await supabase
          .from('trip_events')
          .select('*')
          .eq('trip_id', tripId)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }

      // Use timezone-aware function
      const { data: timezoneData, error: tzError } = await supabase
        .rpc('get_events_in_user_tz', {
          p_trip_id: tripId,
          p_user_id: user.id
        });

      if (tzError) {
        // Fallback to direct query if timezone function fails
        if (import.meta.env.DEV) {
          console.warn('Timezone function failed, using direct query:', tzError);
        }
        const { data, error } = await supabase
          .from('trip_events')
          .select('*')
          .eq('trip_id', tripId)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }

      // Fetch full event details with creator info
      if (!timezoneData || timezoneData.length === 0) {
        return [];
      }

      const eventIds = timezoneData.map((e: any) => e.id);
      const { data: fullEvents, error: fetchError } = await supabase
        .from('trip_events')
        .select('*')
        .in('id', eventIds)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      
      const events = fullEvents || [];
      
      // Cache events for offline access
      for (const event of events) {
        await offlineSyncService.cacheEntity(
          'calendar_event',
          event.id,
          event.trip_id,
          event,
          event.version || 1
        );
      }
      
      return events;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching events:', error);
      }

      // If fetch fails, return cached events if available
      if (cachedEvents.length > 0) {
        if (import.meta.env.DEV) {
          console.warn('Using cached events due to fetch error');
        }
        return cachedEvents.map(c => c.data as TripEvent);
      }

      return [];
    }
  },

  async updateEvent(eventId: string, updates: Partial<TripEvent>): Promise<boolean> {
    // Validate required parameter
    if (!eventId) {
      console.error('[calendarService] Missing eventId for update');
      throw new Error('Event ID is required to update an event');
    }

    // Check if in demo mode
    const isDemoMode = await demoModeService.isDemoModeEnabled();
    
    if (isDemoMode) {
      // Extract trip_id from the eventId or use updates
      const tripId = updates.trip_id || eventId.split('-')[0]; // Fallback logic
      const updatedEvent = await calendarStorageService.updateEvent(tripId, eventId, updates);
      if (!updatedEvent) {
        throw new Error('Failed to update event in demo mode');
      }
      return true;
    }

    // Check if offline - queue the operation
    if (!navigator.onLine) {
      const tripId = updates.trip_id || '';
      const version = (updates as any).version;
      
      await calendarOfflineQueue.queueUpdate(tripId, eventId, updates, version);
      await offlineSyncService.queueOperation(
        'calendar_event',
        'update',
        tripId,
        updates,
        eventId,
        version
      );
      
      return true; // Optimistic success
    }

    // Get current user for logging
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to update events. Please sign in and try again.');
    }

    console.log('[calendarService] Updating event:', eventId, 'by user:', user.id);

    // Use Supabase for authenticated users - use .select() to verify update happened
    const { data, error } = await supabase
      .from('trip_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('[calendarService] Update failed:', error);
      // Provide more specific error messages based on error type
      if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('policy')) {
        throw new Error('You do not have permission to update this event. Only the event creator or trip admin can edit it.');
      }
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        throw new Error('Event update failed — no matching event found or you do not have permission to edit it.');
      }
      throw new Error(error.message || 'Failed to update event. Please try again.');
    }

    // Verify we got data back (confirms update happened)
    if (!data) {
      console.error('[calendarService] Update returned no data - likely RLS blocked or event not found');
      throw new Error('Event update failed — no rows updated. You may not have permission to edit this event.');
    }

    console.log('[calendarService] Event updated successfully:', data.id);

    // Update cache with the returned data
    const cached = await offlineSyncService.getCachedEntity('calendar_event', eventId);
    if (cached) {
      await offlineSyncService.cacheEntity(
        'calendar_event',
        eventId,
        cached.tripId,
        data,
        data.version || cached.version || 1
      );
    }

    return true;
  },

  async deleteEvent(eventId: string, tripId?: string): Promise<boolean> {
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();

      if (isDemoMode) {
        // For demo mode, we need the trip ID to delete from localStorage
        if (!tripId) {
          if (import.meta.env.DEV) {
            console.error('Trip ID required for demo mode event deletion');
          }
          return false;
        }
        return await calendarStorageService.deleteEvent(tripId, eventId);
      }

      // Check if offline - queue the operation
      if (!navigator.onLine && tripId) {
        await calendarOfflineQueue.queueDelete(tripId, eventId);
        await offlineSyncService.queueOperation(
          'calendar_event',
          'delete',
          tripId,
          {},
          eventId
        );
        
        // Remove from cache
        await offlineSyncService.removeCachedEntity('calendar_event', eventId);
        
        return true; // Optimistic success
      }

      // Use Supabase for authenticated users
      const { error } = await supabase
        .from('trip_events')
        .delete()
        .eq('id', eventId);

      if (!error) {
        // Remove from cache
        await offlineSyncService.removeCachedEntity('calendar_event', eventId);
      }

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting event:', error);
      }
      return false;
    }
  },

  /**
   * Bulk create events in a single insert call.
   * Performs auth, super admin, and membership checks ONCE,
   * then inserts all events in one Supabase request.
   * Falls back to parallel batches of 5 if single insert fails.
   */
  async bulkCreateEvents(events: CreateEventData[]): Promise<{
    imported: number;
    failed: number;
    events: TripEvent[];
  }> {
    if (!events.length) {
      return { imported: 0, failed: 0, events: [] };
    }

    // 1. Auth check ONCE
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to import events.');

    // 2. Super admin check ONCE
    const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

    // 3. Membership check ONCE (all events share the same trip)
    const tripId = events[0].trip_id;
    await this.ensureTripMembership(tripId, user.id);

    // 4. Build insert rows
    const rows = events.map(e => ({
      trip_id: e.trip_id,
      title: e.title,
      description: e.description || null,
      location: e.location || null,
      start_time: e.start_time,
      end_time: e.end_time || null,
      created_by: user.id,
      event_category: e.event_category || 'other',
      include_in_itinerary: e.include_in_itinerary ?? true,
      source_type: e.source_type || 'manual',
      source_data: e.source_data || {},
    }));

    // 5. Single bulk insert
    console.log(`[calendarService] Bulk inserting ${rows.length} events for trip ${tripId}`);
    const { data, error } = await supabase
      .from('trip_events')
      .insert(rows)
      .select('*');

    if (!error && data) {
      console.log(`[calendarService] Bulk insert success: ${data.length} events`);
      // Cache all events in parallel (best-effort, don't block on cache failures)
      await Promise.all(
        data.map(event =>
          offlineSyncService.cacheEntity(
            'calendar_event',
            event.id,
            event.trip_id,
            event,
            event.version || 1
          ).catch(() => {})
        )
      );
      return { imported: data.length, failed: 0, events: data };
    }

    // 6. Fallback: parallel batches of 5
    console.warn('[calendarService] Bulk insert failed, falling back to batches:', error?.message);
    return await this.batchInsertFallback(rows, user.id);
  },

  /**
   * Fallback: insert events in parallel batches of 5.
   * Used when a single bulk insert fails (e.g., one bad row).
   */
  async batchInsertFallback(
    rows: Record<string, any>[],
    userId: string
  ): Promise<{ imported: number; failed: number; events: TripEvent[] }> {
    const BATCH_SIZE = 5;
    let imported = 0;
    let failed = 0;
    const allEvents: TripEvent[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const { data, error } = await supabase
            .from('trip_events')
            .insert(row as any)
            .select('*')
            .single();
          if (error) throw error;
          return data;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          imported++;
          allEvents.push(result.value);
        } else {
          failed++;
          if (result.status === 'rejected') {
            console.warn('[calendarService] Batch item failed:', result.reason?.message);
          }
        }
      }
    }

    console.log(`[calendarService] Batch fallback complete: ${imported} imported, ${failed} failed`);
    return { imported, failed, events: allEvents };
  },

  // Convert database event to CalendarEvent format
  convertToCalendarEvent(tripEvent: any): CalendarEvent {
    const startDate = new Date(tripEvent.start_time);
    return {
      id: tripEvent.id,
      title: tripEvent.title,
      date: startDate,
      time: startDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      location: tripEvent.location,
      description: tripEvent.description,
      createdBy: tripEvent.created_by,
      creatorName: tripEvent.creator?.display_name || 'Former Member',
      creatorAvatar: tripEvent.creator?.avatar_url,
      include_in_itinerary: tripEvent.include_in_itinerary,
      event_category: tripEvent.event_category as CalendarEvent['event_category'],
      source_type: tripEvent.source_type as any,
      source_data: tripEvent.source_data,
      // Recurring event support
      recurrence_rule: tripEvent.recurrence_rule,
      recurrence_exceptions: tripEvent.recurrence_exceptions,
      parent_event_id: tripEvent.parent_event_id,
      // Busy/free time blocking
      is_busy: tripEvent.is_busy ?? true,
      availability_status: tripEvent.availability_status || 'busy',
      end_time: tripEvent.end_time ? new Date(tripEvent.end_time) : undefined
    };
  },

  // Convert CalendarEvent to database format
  convertFromCalendarEvent(calendarEvent: CalendarEvent, tripId: string): CreateEventData {
    const startTime = new Date(calendarEvent.date);
    const [hours, minutes] = calendarEvent.time.split(':');
    startTime.setHours(parseInt(hours), parseInt(minutes));

    let endTime: string | undefined;
    if (calendarEvent.end_time) {
      endTime = calendarEvent.end_time.toISOString();
    }

    return {
      trip_id: tripId,
      title: calendarEvent.title,
      description: calendarEvent.description,
      start_time: startTime.toISOString(),
      end_time: endTime,
      location: calendarEvent.location,
      event_category: calendarEvent.event_category || 'other',
      include_in_itinerary: calendarEvent.include_in_itinerary,
      source_type: calendarEvent.source_type || 'manual',
      source_data: calendarEvent.source_data || {},
      // Recurring event support
      recurrence_rule: calendarEvent.recurrence_rule,
      recurrence_exceptions: calendarEvent.recurrence_exceptions,
      // Busy/free time blocking
      is_busy: calendarEvent.is_busy ?? true,
      availability_status: calendarEvent.availability_status || 'busy'
    };
  }
};
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TripEvent } from '@/services/calendarService';
import { tripKeys } from '@/lib/queryKeys';

const CHANNEL_PREFIX = 'trip_events';

/**
 * Shared real-time subscription for trip_events.
 * Updates TanStack Query cache on INSERT/UPDATE/DELETE.
 * Use a single channel name for consistency across desktop and mobile.
 */
export function useCalendarRealtime(tripId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId || !enabled) return;

    const channel = supabase
      .channel(`${CHANNEL_PREFIX}:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_events',
          filter: `trip_id=eq.${tripId}`,
        },
        payload => {
          queryClient.setQueryData<TripEvent[]>(tripKeys.calendar(tripId), (oldEvents = []) => {
            if (payload.eventType === 'INSERT') {
              const newEvent = payload.new as TripEvent;
              if (oldEvents.some(e => e.id === newEvent.id)) return oldEvents;
              return [...oldEvents, newEvent];
            }
            if (payload.eventType === 'UPDATE') {
              return oldEvents.map(event =>
                event.id === (payload.new as TripEvent).id ? (payload.new as TripEvent) : event,
              );
            }
            if (payload.eventType === 'DELETE') {
              return oldEvents.filter(event => event.id !== (payload.old as TripEvent).id);
            }
            return oldEvents;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, queryClient]);
}

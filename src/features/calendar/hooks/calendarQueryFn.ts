/**
 * Shared TanStack Query function factory for calendar events.
 *
 * Both useCalendarEvents and useCalendarManagement need to fetch trip events
 * from calendarService with identical error-tracking breadcrumbs. This factory
 * removes that duplication while allowing each hook to set its own timeout.
 */
import { calendarService } from '@/services/calendarService';
import { withTimeout } from '@/utils/timeout';
import { errorTracking } from '@/utils/errorTracking';
import { tripKeys } from '@/lib/queryKeys';
import type { TripEvent } from '@/types/calendar';

const DEFAULT_TIMEOUT_MS = 15_000;

export function createCalendarQueryFn(
  tripId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): () => Promise<TripEvent[]> {
  return async () => {
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();
    const queryKey = tripKeys.calendar(tripId).join('-');

    errorTracking.addBreadcrumb({
      category: 'api-call',
      message: 'calendar fetch start',
      level: 'info',
      data: { trip_id: tripId, start_timestamp: startTimestamp, query_key: queryKey },
    });

    try {
      const result = await withTimeout(
        calendarService.getTripEvents(tripId),
        timeoutMs,
        'Failed to load calendar events: Timeout',
      );

      const durationMs = Math.round(performance.now() - startTime);
      errorTracking.addBreadcrumb({
        category: 'api-call',
        message: 'calendar fetch finish',
        level: durationMs > 3000 ? 'warning' : 'info',
        data: {
          trip_id: tripId,
          count: result.length,
          duration_ms: durationMs,
          start_timestamp: startTimestamp,
          end_timestamp: new Date().toISOString(),
          query_key: queryKey,
          status: 'success',
        },
      });

      return result;
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - startTime);
      const errObj = err instanceof Error ? err : null;
      const isTimeout = errObj?.message?.includes('Timeout') || errObj?.name === 'TimeoutError';

      errorTracking.addBreadcrumb({
        category: 'api-call',
        message: isTimeout ? 'calendar fetch timeout' : 'calendar fetch finish',
        level: 'error',
        data: {
          trip_id: tripId,
          duration_ms: durationMs,
          start_timestamp: startTimestamp,
          end_timestamp: new Date().toISOString(),
          query_key: queryKey,
          status: isTimeout ? 'timeout' : 'error',
          error: errObj?.message || String(err),
        },
      });

      throw err;
    }
  };
}

/**
 * Push Notification Routing Handler
 * Builds routes from notification payloads and handles navigation
 */

import { ChravelPushPayload } from './push';

type NavigateFn = (path: string) => void;

/**
 * Build a route path from a push notification payload
 * Routes to the appropriate trip tab/view based on notification type
 */
export function buildRouteFromPayload(payload: ChravelPushPayload): string {
  const { type, tripId, threadId, messageId, eventId, pollId, taskId } = payload;
  
  // Base trip route
  let route = `/trip/${tripId}`;
  
  // Build query params based on notification type
  const params = new URLSearchParams();
  
  switch (type) {
    case 'chat_message':
      params.set('tab', 'chat');
      if (threadId) {
        params.set('thread', threadId);
      }
      if (messageId) {
        params.set('message', messageId);
      }
      break;
      
    case 'poll_update':
      params.set('tab', 'polls');
      if (pollId) {
        params.set('poll', pollId);
      }
      break;
      
    case 'task_update':
      params.set('tab', 'tasks');
      if (taskId) {
        params.set('task', taskId);
      }
      break;
      
    case 'calendar_event':
      params.set('tab', 'calendar');
      if (eventId) {
        params.set('event', eventId);
      }
      break;
      
    case 'broadcast':
      params.set('tab', 'chat');
      params.set('view', 'broadcasts');
      break;
      
    case 'trip_update':
    default:
      // Default to trip overview (no additional params)
      break;
  }
  
  const queryString = params.toString();
  return queryString ? `${route}?${queryString}` : route;
}

/**
 * Handle navigation from a push notification tap
 */
export function handleNotificationNavigation(
  payload: ChravelPushPayload,
  navigate: NavigateFn
): void {
  const route = buildRouteFromPayload(payload);
  console.log('[PushRouting] Navigating to:', route);
  navigate(route);
}

/**
 * Extract trip ID from a push payload (utility for quick checks)
 */
export function getTripIdFromPayload(payload: ChravelPushPayload | null): string | null {
  return payload?.tripId ?? null;
}

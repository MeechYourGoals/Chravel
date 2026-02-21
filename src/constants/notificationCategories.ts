/**
 * Canonical notification categories for Chravel.
 *
 * This is the SINGLE source of truth for all notification category values.
 * Backend (notificationUtils.ts), frontend (notificationService.ts), and
 * mock data must all normalize to these values.
 */

export const NOTIFICATION_CATEGORIES = [
  'chat_messages',
  'broadcasts',
  'calendar_events',
  'payments',
  'tasks',
  'polls',
  'trip_invites',
  'join_requests',
  'basecamp_updates',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * Maps all known notification type strings (from frontend, legacy, or
 * alternative naming) to their canonical NotificationCategory.
 *
 * If a type is not found, callers should fall back to null / handle explicitly.
 */
export const NOTIFICATION_TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  // Canonical (identity)
  chat_messages: 'chat_messages',
  broadcasts: 'broadcasts',
  calendar_events: 'calendar_events',
  payments: 'payments',
  tasks: 'tasks',
  polls: 'polls',
  trip_invites: 'trip_invites',
  join_requests: 'join_requests',
  basecamp_updates: 'basecamp_updates',

  // Frontend NotificationType aliases
  chat_message: 'chat_messages',
  chat: 'chat_messages',
  message: 'chat_messages',
  mention: 'chat_messages',
  broadcast: 'broadcasts',
  calendar: 'calendar_events',
  calendar_reminder: 'calendar_events',
  event: 'calendar_events',
  itinerary_update: 'calendar_events',
  trip_reminder: 'calendar_events',
  payment: 'payments',
  payment_request: 'payments',
  payment_split: 'payments',
  payment_alert: 'payments',
  task: 'tasks',
  task_assigned: 'tasks',
  poll: 'polls',
  poll_vote: 'polls',
  poll_created: 'polls',
  trip_invite: 'trip_invites',
  invite: 'trip_invites',
  join_request: 'join_requests',
  member_joined: 'join_requests',
  basecamp: 'basecamp_updates',
  trip_update: 'basecamp_updates',

  // Mock data aliases
  photos: 'chat_messages', // Media notifications route through chat

  // DB constraint aliases
  system: 'chat_messages', // System messages treated as chat-layer
};

/**
 * Normalizes any notification type string to a canonical NotificationCategory.
 * Returns null if the type is completely unknown.
 */
export function normalizeNotificationCategory(
  type: string | null | undefined,
): NotificationCategory | null {
  if (!type) return null;
  return NOTIFICATION_TYPE_TO_CATEGORY[type] ?? null;
}

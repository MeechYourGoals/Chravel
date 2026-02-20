/**
 * Notification Utilities
 *
 * Centralized utilities for notification preference checking, category gating,
 * and delivery method eligibility.
 */

// ============================================================================
// Types
// ============================================================================

export type NotificationCategory =
  | 'chat_messages'
  | 'broadcasts'
  | 'calendar_events'
  | 'payments'
  | 'tasks'
  | 'polls'
  | 'trip_invites'
  | 'join_requests'
  | 'basecamp_updates';

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_phone_number: string | null;
  chat_messages: boolean;
  broadcasts: boolean;
  calendar_events: boolean;
  payments: boolean;
  tasks: boolean;
  polls: boolean;
  trip_invites: boolean;
  join_requests: boolean;
  basecamp_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
  sms_sent_today?: number;
  last_sms_reset_date?: string;
}

export interface DeliveryDecision {
  createInApp: boolean;
  sendPush: boolean;
  sendEmail: boolean;
  sendSms: boolean;
  reason?: string;
}

// ============================================================================
// Category Eligibility Configuration
// ============================================================================

/**
 * Categories eligible for email delivery.
 * Only high-signal, important categories to avoid spam.
 */
export const EMAIL_ELIGIBLE_CATEGORIES: NotificationCategory[] = [
  'broadcasts',      // Important announcements from trip organizers
  'payments',        // Payment requests and settlements
  'basecamp_updates', // Location changes
];

/**
 * Categories eligible for SMS delivery.
 * High-urgency categories only - these warrant a text message.
 */
export const SMS_ELIGIBLE_CATEGORIES: NotificationCategory[] = [
  'broadcasts',       // Critical announcements from organizers
  'payments',         // Payment requests and deadlines
  'basecamp_updates', // Location/basecamp changes
  'calendar_events',  // Event updates and reminders
  'join_requests',    // New member join requests (for organizers)
  'tasks',            // Assigned tasks with actionable urgency
  'polls',            // New polls needing input
];

/**
 * Map notification type strings (from external callers) to database category columns.
 * This normalizes various naming conventions.
 */
export const TYPE_TO_CATEGORY_MAP: Record<string, NotificationCategory> = {
  // Direct mappings
  'chat_messages': 'chat_messages',
  'chat_message': 'chat_messages',
  'message': 'chat_messages',
  'chat': 'chat_messages',
  'mention': 'chat_messages',

  'broadcasts': 'broadcasts',
  'broadcast': 'broadcasts',

  'calendar_events': 'calendar_events',
  'calendar': 'calendar_events',
  'calendar_reminder': 'calendar_events',
  'event': 'calendar_events',
  'itinerary_update': 'calendar_events',

  'payments': 'payments',
  'payment': 'payments',
  'payment_request': 'payments',
  'payment_split': 'payments',
  'payment_alert': 'payments',

  'tasks': 'tasks',
  'task': 'tasks',
  'task_assigned': 'tasks',

  'polls': 'polls',
  'poll': 'polls',
  'poll_vote': 'polls',
  'poll_created': 'polls',

  'trip_invites': 'trip_invites',
  'trip_invite': 'trip_invites',
  'invite': 'trip_invites',

  'join_requests': 'join_requests',
  'join_request': 'join_requests',
  'member_joined': 'join_requests',

  'basecamp_updates': 'basecamp_updates',
  'basecamp': 'basecamp_updates',
  'trip_update': 'basecamp_updates',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize a notification type string to its database category.
 */
export function normalizeCategory(type: string): NotificationCategory | null {
  const normalized = TYPE_TO_CATEGORY_MAP[type.toLowerCase()];
  return normalized || null;
}

/**
 * Check if the current time is within quiet hours for a user.
 */
export function isQuietHours(
  prefs: Pick<NotificationPreferences, 'quiet_hours_enabled' | 'quiet_start' | 'quiet_end' | 'timezone'>
): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  try {
    const timezone = prefs.timezone || 'UTC';
    const now = new Date();

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentMinutes = hour * 60 + minute;

    // Parse quiet hours (format: "HH:mm")
    const [startHour, startMin] = (prefs.quiet_start || '22:00').split(':').map(Number);
    const [endHour, endMin] = (prefs.quiet_end || '08:00').split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle cases where quiet hours cross midnight
    if (startMinutes <= endMinutes) {
      // Same day: e.g., 09:00 - 17:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight: e.g., 22:00 - 08:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error('[notificationUtils] Error checking quiet hours:', error);
    return false;
  }
}

/**
 * Returns minutes until quiet hours end for the current user time.
 * Returns 0 if not currently in quiet hours.
 */
export function getMinutesUntilQuietHoursEnd(
  prefs: Pick<NotificationPreferences, 'quiet_hours_enabled' | 'quiet_start' | 'quiet_end' | 'timezone'>,
): number {
  if (!prefs.quiet_hours_enabled) return 0;

  try {
    const timezone = prefs.timezone || 'UTC';
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMin] = (prefs.quiet_start || '22:00').split(':').map(Number);
    const [endHour, endMin] = (prefs.quiet_end || '08:00').split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      const inQuiet = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      return inQuiet ? endMinutes - currentMinutes : 0;
    }

    // Quiet hours cross midnight
    if (currentMinutes >= startMinutes) {
      return 24 * 60 - currentMinutes + endMinutes;
    }

    if (currentMinutes < endMinutes) {
      return endMinutes - currentMinutes;
    }

    return 0;
  } catch (error) {
    console.error('[notificationUtils] Error computing quiet-hours delay:', error);
    return 0;
  }
}

/**
 * Check if a category is enabled for a user.
 */
export function isCategoryEnabled(
  category: NotificationCategory,
  prefs: NotificationPreferences
): boolean {
  return prefs[category] === true;
}

/**
 * Check if email delivery is allowed for a category.
 */
export function isEmailEligible(category: NotificationCategory): boolean {
  return EMAIL_ELIGIBLE_CATEGORIES.includes(category);
}

/**
 * Check if SMS delivery is allowed for a category.
 */
export function isSmsEligible(category: NotificationCategory): boolean {
  return SMS_ELIGIBLE_CATEGORIES.includes(category);
}

/**
 * Determine what delivery methods should be used for a notification.
 * This is the main decision function that enforces all rules.
 *
 * Rules:
 * 1. Category must be enabled for ANY notification to be created
 * 2. Push: category enabled + push_enabled + not in quiet hours
 * 3. Email: category enabled + email_enabled + category is email-eligible + not in quiet hours
 * 4. SMS: category enabled + sms_enabled + category is sms-eligible + phone number exists + not in quiet hours
 * 5. In-app: always created if category is enabled (even during quiet hours)
 */
/**
 * Categories that are permanently suppressed from all external delivery channels.
 * chat_messages removed: too high-volume for push/email/SMS.
 * Chat still works in-app; only outbound notifications are blocked.
 */
export const SUPPRESSED_CATEGORIES: NotificationCategory[] = ['chat_messages'];

export function getDeliveryDecision(
  category: NotificationCategory,
  prefs: NotificationPreferences
): DeliveryDecision {
  if (SUPPRESSED_CATEGORIES.includes(category)) {
    return {
      createInApp: false,
      sendPush: false,
      sendEmail: false,
      sendSms: false,
      reason: `Category '${category}' is permanently suppressed from notifications`,
    };
  }

  // Check if category is enabled first
  const categoryEnabled = isCategoryEnabled(category, prefs);

  if (!categoryEnabled) {
    return {
      createInApp: false,
      sendPush: false,
      sendEmail: false,
      sendSms: false,
      reason: `Category '${category}' is disabled by user`,
    };
  }

  // In-app is always created if category is enabled (even during quiet hours)
  const createInApp = true;

  // Check quiet hours for delivery methods
  const inQuietHours = isQuietHours(prefs);

  // Push: enabled + not quiet hours
  const sendPush = prefs.push_enabled && !inQuietHours;

  // Email: enabled + eligible category + not quiet hours
  const sendEmail = prefs.email_enabled && isEmailEligible(category) && !inQuietHours;

  // SMS: enabled + eligible category + phone exists + not quiet hours
  const sendSms = prefs.sms_enabled &&
                  isSmsEligible(category) &&
                  !!prefs.sms_phone_number &&
                  !inQuietHours;

  return {
    createInApp,
    sendPush,
    sendEmail,
    sendSms,
    reason: inQuietHours ? 'Delivery suppressed during quiet hours (in-app still created)' : undefined,
  };
}

/**
 * Default notification preferences for new users or when preferences not found.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'user_id'> = {
  push_enabled: true,
  email_enabled: false, // Default off to avoid spam for new users
  sms_enabled: false,
  sms_phone_number: null,
  chat_messages: false, // Permanently disabled: too high-volume for external notifications
  broadcasts: true,
  calendar_events: true,
  payments: true,
  tasks: true,
  polls: true,
  trip_invites: true,
  join_requests: true,
  basecamp_updates: true,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '08:00',
  timezone: 'UTC',
  sms_sent_today: 0,
  last_sms_reset_date: undefined,
};

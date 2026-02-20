/**
 * SMS Message Templates
 *
 * Global format rules:
 * - Prefix with "ChravelApp:"
 * - Keep under ~160 chars when possible
 * - Include trip/event context
 * - Keep message notifications privacy-safe
 */

export const SMS_BRAND_PREFIX = 'ChravelApp:';

export interface SmsTemplateData {
  tripName?: string;
  senderName?: string;
  amount?: number | string;
  currency?: string;
  location?: string;
  eventName?: string;
  eventTime?: string;
  preview?: string;
  taskTitle?: string;
  pollQuestion?: string;
}

export type SmsCategory =
  | 'basecamp_updates'
  | 'join_requests'
  | 'payments'
  | 'broadcasts'
  | 'calendar_events'
  | 'tasks'
  | 'polls'
  | 'calendar_bulk_import';

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, Math.max(maxLength - 3, 1))}...`;
}

export function formatTimeForTimezone(
  isoTime: string | undefined,
  timezone: string = 'America/Los_Angeles',
): string {
  if (!isoTime) return 'soon';

  try {
    const date = new Date(isoTime);
    if (Number.isNaN(date.getTime())) {
      return truncate(isoTime, 18);
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return truncate(isoTime, 18);
  }
}

export function generateSmsMessage(category: SmsCategory, data: SmsTemplateData): string {
  const tripName = truncate(data.tripName || 'your trip', 28);
  const senderName = truncate(data.senderName || 'Someone', 20);

  switch (category) {
    case 'broadcasts': {
      const preview = truncate(data.preview || 'Important update', 50);
      return `${SMS_BRAND_PREFIX} Broadcast in ${tripName} from ${senderName}: "${preview}"`;
    }

    case 'calendar_events': {
      const eventTitle = truncate(data.eventName || 'Upcoming event', 32);
      const atTime = truncate(data.eventTime || 'soon', 20);
      return `${SMS_BRAND_PREFIX} Reminder - ${eventTitle} in ${tripName} at ${atTime}. Tap to open.`;
    }

    case 'payments': {
      const amount = data.amount ?? '0';
      const currency = data.currency || '$';
      const value = typeof amount === 'number' ? amount.toFixed(2).replace(/\.00$/, '') : amount;
      const normalizedCurrency = currency === 'USD' ? '$' : `${currency} `;
      return `${SMS_BRAND_PREFIX} Payment - ${senderName} requested ${normalizedCurrency}${value} for ${tripName}.`;
    }

    case 'tasks': {
      const taskTitle = truncate(data.taskTitle || 'Task', 40);
      return `${SMS_BRAND_PREFIX} Task assigned - "${taskTitle}" in ${tripName}.`;
    }

    case 'polls': {
      const question = truncate(data.pollQuestion || 'New poll', 45);
      return `${SMS_BRAND_PREFIX} New poll in ${tripName}: "${question}"`;
    }

    case 'join_requests': {
      return `${SMS_BRAND_PREFIX} Join request - ${senderName} wants to join ${tripName}.`;
    }

    case 'basecamp_updates': {
      const location = truncate(data.location || 'new location', 45);
      return `${SMS_BRAND_PREFIX} Basecamp updated for ${tripName}: ${location}.`;
    }

    case 'calendar_bulk_import': {
      const count = data.amount ?? '0';
      return `${SMS_BRAND_PREFIX} ${count} calendar events added to ${tripName} via Smart Import. Open the app to review.`;
    }

    default:
      return `${SMS_BRAND_PREFIX} New update in ${tripName}. Open the app for details.`;
  }
}

export function isSmsEligibleCategory(category: string): category is SmsCategory {
  return [
    'basecamp_updates',
    'join_requests',
    'payments',
    'broadcasts',
    'calendar_events',
    'tasks',
    'polls',
    'calendar_bulk_import',
  ].includes(category);
}

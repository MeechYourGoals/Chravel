/**
 * Centralized Notification Content Builder
 *
 * Single source of truth for notification copy generation across all channels.
 * Ensures consistent messaging whether delivered via push, email, or SMS.
 *
 * Guiding principles:
 * - Clear, short, contextual, non-sensitive
 * - Action-driving ("open the app")
 * - No overly detailed payloads (exact addresses, full poll text, etc.)
 * - Include trip/event context (name, location, date range)
 */

import {
  buildTripContext,
  formatTripDisplayName,
  truncate,
} from './formatters';

export type NotificationContentType =
  | 'broadcast_posted'
  | 'calendar_event_added'
  | 'calendar_event_updated'
  | 'calendar_bulk_import'
  | 'payment_request'
  | 'payment_settled'
  | 'task_assigned'
  | 'task_completed'
  | 'poll_created'
  | 'join_request'
  | 'join_request_approved'
  | 'basecamp_updated'
  | 'trip_invite'
  | 'trip_reminder'
  | 'rsvp_update';

export type DeliveryChannel = 'push' | 'email' | 'sms';

export interface TripContext {
  tripName?: string;
  location?: string | string[];
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface NotificationContentInput {
  type: NotificationContentType;
  channel: DeliveryChannel;
  tripContext: TripContext;
  actorName?: string;
  count?: number;
  extra?: Record<string, string | number | undefined>;
}

export interface PushContent {
  title: string;
  body: string;
}

export interface EmailContent {
  subject: string;
  previewText: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  footerText: string;
}

export interface SmsContent {
  message: string;
}

export type NotificationContent = PushContent | EmailContent | SmsContent;

const BRAND_PREFIX = 'Chravel:';
const FROM_EMAIL = 'support@chravelapp.com';
const FROM_NAME = 'Chravel';
const APP_URL = 'https://app.chravelapp.com';

export { FROM_EMAIL, FROM_NAME };

function tripLabel(ctx: TripContext): string {
  return formatTripDisplayName(ctx.tripName);
}

function contextSuffix(ctx: TripContext): string {
  return buildTripContext(ctx);
}

function ctaUrl(tripId?: string): string {
  if (tripId) return `${APP_URL}/trip/${tripId}`;
  return APP_URL;
}

function footerLine(): string {
  return 'You received this because you have notifications enabled on Chravel. Manage your preferences in Settings.';
}

// ---------------------------------------------------------------------------
// Push notification content
// ---------------------------------------------------------------------------
function buildPushContent(input: NotificationContentInput): PushContent {
  const trip = tripLabel(input.tripContext);
  const ctx = contextSuffix(input.tripContext);
  const actor = input.actorName || 'Someone';

  switch (input.type) {
    case 'broadcast_posted':
      return {
        title: `New Broadcast in ${trip}`,
        body: `${actor} posted an announcement${ctx}. Open Chravel to review.`,
      };

    case 'calendar_event_added':
      return {
        title: `Calendar Updated in ${trip}`,
        body: `A calendar event was added${ctx}. Open Chravel for details.`,
      };

    case 'calendar_event_updated':
      return {
        title: `Calendar Updated in ${trip}`,
        body: `A calendar event was updated${ctx}. Open Chravel for details.`,
      };

    case 'calendar_bulk_import': {
      const count = input.count ?? 0;
      return {
        title: `${count} New Calendar Events Added`,
        body: `${trip}${ctx}. Added via Smart Import.`,
      };
    }

    case 'payment_request':
      return {
        title: `Payment Request in ${trip}`,
        body: `${actor} sent a payment request${ctx}. Open Chravel to review.`,
      };

    case 'payment_settled':
      return {
        title: `Payment Settled in ${trip}`,
        body: `A payment has been settled${ctx}. Open Chravel for details.`,
      };

    case 'task_assigned':
      return {
        title: `New Task in ${trip}`,
        body: `${actor} assigned you a task${ctx}. Open Chravel to review.`,
      };

    case 'task_completed':
      return {
        title: `Task Completed in ${trip}`,
        body: `A task has been completed${ctx}. Open Chravel for details.`,
      };

    case 'poll_created':
      return {
        title: `New Poll in ${trip}`,
        body: `${actor} created a poll${ctx}. Open Chravel to vote.`,
      };

    case 'join_request':
      return {
        title: `Join Request in ${trip}`,
        body: `${actor} wants to join${ctx}. Open Chravel to review.`,
      };

    case 'join_request_approved':
      return {
        title: `You've Been Approved!`,
        body: `You've been approved to join ${trip}${ctx}. Open Chravel to get started.`,
      };

    case 'basecamp_updated':
      return {
        title: `Basecamp Updated in ${trip}`,
        body: `The basecamp location has been updated${ctx}. Open Chravel for details.`,
      };

    case 'trip_invite':
      return {
        title: `Trip Invitation`,
        body: `${actor} invited you to ${trip}${ctx}. Open Chravel to respond.`,
      };

    case 'trip_reminder':
      return {
        title: `${trip} Starts Soon!`,
        body: `Your trip${ctx} begins soon. Open Chravel to prepare.`,
      };

    case 'rsvp_update':
      return {
        title: `RSVP Update in ${trip}`,
        body: `${actor} updated their RSVP${ctx}. Open Chravel for details.`,
      };

    default:
      return {
        title: `Update in ${trip}`,
        body: `You have an update${ctx}. Open Chravel for details.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Email notification content
// ---------------------------------------------------------------------------
function buildEmailContent(input: NotificationContentInput): EmailContent {
  const push = buildPushContent(input);
  const tripId = input.extra?.tripId as string | undefined;

  return {
    subject: push.title,
    previewText: push.body,
    heading: push.title,
    bodyText: push.body,
    ctaLabel: 'Open in Chravel',
    ctaUrl: ctaUrl(tripId),
    footerText: footerLine(),
  };
}

// ---------------------------------------------------------------------------
// SMS notification content
// ---------------------------------------------------------------------------
function buildSmsContent(input: NotificationContentInput): SmsContent {
  const push = buildPushContent(input);
  const smsBody = truncate(push.body, 140);
  return {
    message: `${BRAND_PREFIX} ${smsBody}`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build notification content for any type/channel combination.
 *
 * Usage:
 *   const content = buildNotificationContent({
 *     type: 'poll_created',
 *     channel: 'push',
 *     tripContext: { tripName: 'Japan Trip', location: ['Tokyo', 'Kyoto'], startDate: '2026-06-10', endDate: '2026-06-25' },
 *     actorName: 'Alex',
 *   });
 */
export function buildNotificationContent(input: NotificationContentInput): NotificationContent {
  switch (input.channel) {
    case 'push':
      return buildPushContent(input);
    case 'email':
      return buildEmailContent(input);
    case 'sms':
      return buildSmsContent(input);
    default:
      return buildPushContent(input);
  }
}

/**
 * Type guard helpers for narrowing content types.
 */
export function isPushContent(content: NotificationContent): content is PushContent {
  return 'title' in content && 'body' in content && !('subject' in content);
}

export function isEmailContent(content: NotificationContent): content is EmailContent {
  return 'subject' in content && 'ctaLabel' in content;
}

export function isSmsContent(content: NotificationContent): content is SmsContent {
  return 'message' in content && !('title' in content);
}

/**
 * Convenience: build content for all three channels at once.
 */
export function buildAllChannelContent(
  type: NotificationContentType,
  tripContext: TripContext,
  actorName?: string,
  count?: number,
  extra?: Record<string, string | number | undefined>,
): { push: PushContent; email: EmailContent; sms: SmsContent } {
  const base = { type, tripContext, actorName, count, extra };
  return {
    push: buildPushContent({ ...base, channel: 'push' }),
    email: buildEmailContent({ ...base, channel: 'email' }),
    sms: buildSmsContent({ ...base, channel: 'sms' }),
  };
}

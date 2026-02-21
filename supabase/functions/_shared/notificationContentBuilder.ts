/**
 * Centralized Notification Content Builder (Deno Edge Function version)
 *
 * Single source of truth for notification copy. Mirrors the frontend
 * contentBuilder but runs in Deno/Supabase Edge Functions.
 *
 * Guiding principles:
 * - Clear, short, contextual, non-sensitive
 * - Action-driving ("open the app")
 * - Include trip/event context (name, location, date range)
 */

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
  bodyHtml: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  footerText: string;
}

export interface SmsContent {
  message: string;
}

export type NotificationContent = PushContent | EmailContent | SmsContent;

const BRAND_PREFIX = 'ChravelApp:';
export const FROM_EMAIL = 'support@chravelapp.com';
export const FROM_NAME = 'ChravelApp';
const APP_URL = 'https://app.chravelapp.com';
const SETTINGS_URL = `${APP_URL}/settings`;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDateRange(start?: string | Date, end?: string | Date): string {
  if (!start) return '';
  const s = start instanceof Date ? start : new Date(start);
  if (isNaN(s.getTime())) return '';

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const fmtDay = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const fmtShort = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}`;

  if (!end) return fmtDay(s);
  const e = end instanceof Date ? end : new Date(end);
  if (isNaN(e.getTime())) return fmtDay(s);

  if (
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()
  )
    return fmtDay(s);

  if (s.getFullYear() === e.getFullYear()) return `${fmtShort(s)}\u2013${fmtDay(e)}`;

  return `${fmtDay(s)}\u2013${fmtDay(e)}`;
}

function formatLocationSummary(loc?: string | string[]): string {
  if (!loc) return '';
  const list = (Array.isArray(loc) ? loc : [loc]).filter(Boolean).map(l => l.trim());
  if (list.length === 0) return '';
  if (list.length <= 3) return list.join(', ');
  return `${list.slice(0, 2).join(', ')} +${list.length - 2} more`;
}

function formatTripName(name?: string): string {
  if (!name) return 'your trip';
  const t = name.trim();
  return t.length > 50 ? `${t.substring(0, 47)}...` : t;
}

function tripContext(ctx: TripContext): string {
  const parts: string[] = [];
  const loc = formatLocationSummary(ctx.location);
  if (loc) parts.push(loc);
  const dates = formatDateRange(ctx.startDate, ctx.endDate);
  if (dates) parts.push(dates);
  return parts.length > 0 ? ` (${parts.join(' \u2022 ')})` : '';
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : `${text.substring(0, Math.max(max - 3, 1))}...`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

function buildPush(input: NotificationContentInput): PushContent {
  const trip = formatTripName(input.tripContext.tripName);
  const ctx = tripContext(input.tripContext);
  const actor = input.actorName || 'Someone';

  switch (input.type) {
    case 'broadcast_posted':
      return {
        title: `New Broadcast in ${trip}`,
        body: `${actor} posted an announcement${ctx}. Open ChravelApp to review.`,
      };
    case 'calendar_event_added':
      return {
        title: `Calendar Updated in ${trip}`,
        body: `A calendar event was added${ctx}. Open ChravelApp for details.`,
      };
    case 'calendar_event_updated':
      return {
        title: `Calendar Updated in ${trip}`,
        body: `A calendar event was updated${ctx}. Open ChravelApp for details.`,
      };
    case 'calendar_bulk_import':
      return {
        title: `${input.count ?? 0} New Calendar Events Added`,
        body: `${trip}${ctx}. Added via Smart Import.`,
      };
    case 'payment_request':
      return {
        title: `Payment Request in ${trip}`,
        body: `${actor} sent a payment request${ctx}. Open ChravelApp to review.`,
      };
    case 'payment_settled':
      return {
        title: `Payment Settled in ${trip}`,
        body: `A payment has been settled${ctx}. Open ChravelApp for details.`,
      };
    case 'task_assigned':
      return {
        title: `New Task in ${trip}`,
        body: `${actor} assigned you a task${ctx}. Open ChravelApp to review.`,
      };
    case 'task_completed':
      return {
        title: `Task Completed in ${trip}`,
        body: `A task has been completed${ctx}. Open ChravelApp for details.`,
      };
    case 'poll_created':
      return {
        title: `New Poll in ${trip}`,
        body: `${actor} created a poll${ctx}. Open ChravelApp to vote.`,
      };
    case 'join_request':
      return {
        title: `Join Request in ${trip}`,
        body: `${actor} wants to join${ctx}. Open ChravelApp to review.`,
      };
    case 'join_request_approved':
      return {
        title: `You've Been Approved!`,
        body: `You've been approved to join ${trip}${ctx}. Open ChravelApp to get started.`,
      };
    case 'basecamp_updated':
      return {
        title: `Basecamp Updated in ${trip}`,
        body: `The basecamp location has been updated${ctx}. Open ChravelApp for details.`,
      };
    case 'trip_invite':
      return {
        title: `Trip Invitation`,
        body: `${actor} invited you to ${trip}${ctx}. Open ChravelApp to respond.`,
      };
    case 'trip_reminder':
      return {
        title: `${trip} Starts Soon!`,
        body: `Your trip${ctx} begins soon. Open ChravelApp to prepare.`,
      };
    case 'rsvp_update':
      return {
        title: `RSVP Update in ${trip}`,
        body: `${actor} updated their RSVP${ctx}. Open ChravelApp for details.`,
      };
    default:
      return {
        title: `Update in ${trip}`,
        body: `You have an update${ctx}. Open ChravelApp for details.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function buildEmail(input: NotificationContentInput): EmailContent {
  const push = buildPush(input);
  const tripId = input.extra?.tripId as string | undefined;
  const cta = tripId ? `${APP_URL}/trip/${tripId}` : APP_URL;

  const timestamp = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const bodyHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${escapeHtml(push.title)}</title></head>
<body style="margin:0;padding:0;background-color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:12px;border:1px solid #333;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #333;"><span style="font-size:20px;font-weight:700;color:#f59e0b;">ChravelApp</span><span style="float:right;font-size:12px;color:#888;">${escapeHtml(timestamp)}</span></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(push.title)}</h1>
<p style="margin:0 0 24px;font-size:16px;color:#ccc;line-height:1.6;">${escapeHtml(push.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#f59e0b;border-radius:8px;">
<a href="${escapeHtml(cta)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#000;font-size:16px;font-weight:600;text-decoration:none;">Open in ChravelApp</a>
</td></tr></table></td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #333;">
<p style="margin:0;font-size:12px;color:#666;line-height:1.5;">You received this because you have notifications enabled on ChravelApp.<br/><a href="${escapeHtml(SETTINGS_URL)}" style="color:#f59e0b;text-decoration:underline;">Manage notification settings</a></p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    subject: push.title,
    previewText: push.body,
    heading: push.title,
    bodyHtml,
    bodyText: `${push.title}\n\n${push.body}\n\nOpen in ChravelApp: ${cta}\n\n---\nYou received this because you have notifications enabled. Manage settings: ${SETTINGS_URL}`,
    ctaLabel: 'Open in ChravelApp',
    ctaUrl: cta,
    footerText: 'You received this because you have notifications enabled on ChravelApp.',
  };
}

// ---------------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------------

function buildSms(input: NotificationContentInput): SmsContent {
  const push = buildPush(input);
  return { message: `${BRAND_PREFIX} ${truncate(push.body, 140)}` };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildNotificationContent(input: NotificationContentInput): NotificationContent {
  switch (input.channel) {
    case 'push':
      return buildPush(input);
    case 'email':
      return buildEmail(input);
    case 'sms':
      return buildSms(input);
    default:
      return buildPush(input);
  }
}

export function buildAllChannelContent(
  type: NotificationContentType,
  tripContext: TripContext,
  actorName?: string,
  count?: number,
  extra?: Record<string, string | number | undefined>,
): { push: PushContent; email: EmailContent; sms: SmsContent } {
  const base = { type, tripContext, actorName, count, extra };
  return {
    push: buildPush({ ...base, channel: 'push' }),
    email: buildEmail({ ...base, channel: 'email' }),
    sms: buildSms({ ...base, channel: 'sms' }),
  };
}

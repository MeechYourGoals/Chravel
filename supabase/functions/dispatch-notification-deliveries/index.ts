import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getMinutesUntilQuietHoursEnd,
  isEmailEligible,
  isQuietHours,
  isSmsEligible,
  normalizeCategory,
  type NotificationCategory,
  type NotificationPreferences,
} from '../_shared/notificationUtils.ts';
import {
  formatTimeForTimezone,
  generateSmsMessage,
  type SmsTemplateData,
} from '../_shared/smsTemplates.ts';
import { sendWebPushNotification, type WebPushSubscription } from '../_shared/webPushUtils.ts';
import {
  buildNotificationContent,
  type EmailContent,
  type NotificationContentType,
  type TripContext,
} from '../_shared/notificationContentBuilder.ts';

type DeliveryChannel = 'push' | 'email' | 'sms';

interface DispatchRequest {
  deliveryIds?: string[];
  notificationIds?: string[];
  channels?: DeliveryChannel[];
  limit?: number;
  dryRun?: boolean;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  trip_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface DeliveryRow {
  id: string;
  notification_id: string;
  recipient_user_id: string;
  channel: DeliveryChannel;
  attempts: number;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface TripRow {
  id: string;
  name: string;
}

interface EntitlementRow {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

interface SmsOptInRow {
  user_id: string;
  phone_e164: string;
  verified: boolean;
  opted_in: boolean;
}

const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
const sendGridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'support@chravelapp.com';
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
const internalSecret = Deno.env.get('NOTIFICATION_DISPATCH_SECRET');

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:notifications@chravel.app';

function getDisplayName(profile?: ProfileRow): string {
  if (!profile) return 'Someone';
  return (
    profile.display_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    (profile.email ? profile.email.split('@')[0] : null) ||
    'Someone'
  );
}

function isUserSmsEntitled(entitlement?: EntitlementRow): boolean {
  if (!entitlement) return false;
  if (!['active', 'trialing'].includes((entitlement.status || '').toLowerCase())) return false;

  const plan = (entitlement.plan || '').toLowerCase();
  return ['frequent-chraveler', 'pro-starter', 'pro-growth', 'pro-enterprise'].includes(plan);
}

function mergePreferences(
  userId: string,
  raw?: Partial<NotificationPreferences>,
): NotificationPreferences {
  return {
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw || {}),
  } as NotificationPreferences;
}

function isCategoryEnabled(
  category: NotificationCategory | null,
  prefs: NotificationPreferences,
): boolean {
  if (!category) return true;
  return prefs[category] === true;
}

function parseMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata;
}

function categoryToContentType(
  category: NotificationCategory | null,
  metadata: Record<string, unknown>,
): NotificationContentType {
  if (!category) return 'broadcast_posted';

  if (category === 'calendar_events') {
    if (metadata.bulk_import || metadata.import_session_id) return 'calendar_bulk_import';
    if (metadata.updated) return 'calendar_event_updated';
    return 'calendar_event_added';
  }

  const map: Record<string, NotificationContentType> = {
    broadcasts: 'broadcast_posted',
    payments: metadata.settled ? 'payment_settled' : 'payment_request',
    tasks: metadata.completed ? 'task_completed' : 'task_assigned',
    polls: 'poll_created',
    join_requests: metadata.approved ? 'join_request_approved' : 'join_request',
    basecamp_updates: 'basecamp_updated',
    trip_invites: 'trip_invite',
  };

  return map[category] || 'broadcast_posted';
}

function buildTripContextFromRow(
  notification: NotificationRow,
  tripById: Map<string, TripRow>,
  metadata: Record<string, unknown>,
): TripContext {
  const tripName = notification.trip_id
    ? tripById.get(notification.trip_id)?.name
    : undefined;

  const location =
    typeof metadata.location === 'string'
      ? metadata.location
      : Array.isArray(metadata.locations)
        ? (metadata.locations as string[])
        : undefined;

  return {
    tripName,
    location,
    startDate: typeof metadata.start_date === 'string' ? metadata.start_date : undefined,
    endDate: typeof metadata.end_date === 'string' ? metadata.end_date : undefined,
  };
}

function getActorUserId(metadata: Record<string, unknown>): string | undefined {
  const actorId =
    metadata.actor_user_id || metadata.sender_id || metadata.requester_id || metadata.created_by;
  return typeof actorId === 'string' ? actorId : undefined;
}

function buildSmsTemplateData(
  notification: NotificationRow,
  category: NotificationCategory,
  tripName: string,
  senderName: string,
  timezone: string,
): SmsTemplateData {
  const metadata = parseMetadata(notification.metadata);
  const eventTimeRaw =
    (typeof metadata.event_time === 'string' && metadata.event_time) ||
    (typeof metadata.start_time === 'string' && metadata.start_time) ||
    undefined;

  return {
    tripName,
    senderName,
    amount:
      typeof metadata.amount === 'number' || typeof metadata.amount === 'string'
        ? (metadata.amount as number | string)
        : undefined,
    currency: typeof metadata.currency === 'string' ? metadata.currency : undefined,
    location:
      typeof metadata.new_location_name === 'string'
        ? metadata.new_location_name
        : typeof metadata.location === 'string'
          ? metadata.location
          : undefined,
    eventName:
      typeof metadata.event_title === 'string'
        ? metadata.event_title
        : typeof metadata.event_name === 'string'
          ? metadata.event_name
          : undefined,
    eventTime: formatTimeForTimezone(eventTimeRaw, timezone),
    preview: notification.message,
    taskTitle: typeof metadata.task_title === 'string' ? metadata.task_title : notification.title,
    pollQuestion:
      typeof metadata.poll_question === 'string' ? metadata.poll_question : notification.title,
  };
}

async function markDelivery(
  supabase: any,
  deliveryId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('notification_deliveries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deliveryId);
}

async function logDeliveryAttempt(
  supabase: any,
  params: {
    userId: string;
    channel: DeliveryChannel;
    title: string;
    body: string;
    recipient?: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from('notification_logs').insert({
    user_id: params.userId,
    type: params.channel,
    title: params.title,
    body: params.body,
    recipient: params.recipient || null,
    external_id: params.externalId || null,
    status: params.status,
    error_message: params.error || null,
    success: params.status === 'sent' ? 1 : 0,
    failure: params.status === 'sent' ? 0 : 1,
    data: params.metadata || {},
    sent_at: params.status === 'sent' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  });
}

async function sendSms(
  phoneNumber: string,
  message: string,
): Promise<{
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return { ok: false, error: 'Twilio credentials are not configured' };
  }

  const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: phoneNumber,
        Body: message,
      }),
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      error: `Twilio error ${response.status}: ${responseText.substring(0, 200)}`,
    };
  }

  try {
    const parsed = JSON.parse(responseText);
    return { ok: true, providerMessageId: parsed.sid };
  } catch {
    return { ok: true };
  }
}

async function sendEmail(
  to: string,
  subject: string,
  content: string,
): Promise<{
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}> {
  if (!sendGridApiKey) {
    return { ok: false, error: 'SendGrid API key is not configured' };
  }

  const emailPayload = {
    personalizations: [{ to: [{ email: to }], subject }],
    from: {
      email: sendGridFromEmail,
      name: 'Chravel Support',
    },
    content: [
      { type: 'text/html', value: content },
      { type: 'text/plain', value: content.replace(/<[^>]+>/g, '') },
    ],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `SendGrid error ${response.status}: ${body.substring(0, 200)}` };
  }

  return { ok: true };
}

async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}> {
  if (!fcmServerKey) {
    return { ok: false, error: 'FCM server key is not configured' };
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: { title, body },
      data,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    return { ok: false, error: `FCM error ${response.status}: ${responseText.substring(0, 200)}` };
  }

  try {
    const parsed = JSON.parse(responseText);
    if ((parsed.success || 0) > 0) {
      return {
        ok: true,
        providerMessageId: parsed.multicast_id ? String(parsed.multicast_id) : undefined,
      };
    }
    return { ok: false, error: parsed.results?.[0]?.error || 'No push delivery succeeded' };
  } catch {
    return { ok: true };
  }
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (internalSecret) {
    const providedSecret = req.headers.get('x-notification-secret');
    if (providedSecret !== internalSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized dispatch request' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = (await req.json().catch(() => ({}))) as DispatchRequest;
    const limit = Math.min(Math.max(body.limit || 100, 1), 500);
    const nowIso = new Date().toISOString();

    let deliveriesQuery = supabase
      .from('notification_deliveries')
      .select('id, notification_id, recipient_user_id, channel, attempts')
      .eq('status', 'queued')
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (body.deliveryIds?.length) {
      deliveriesQuery = deliveriesQuery.in('id', body.deliveryIds);
    }

    if (body.notificationIds?.length) {
      deliveriesQuery = deliveriesQuery.in('notification_id', body.notificationIds);
    }

    if (body.channels?.length) {
      deliveriesQuery = deliveriesQuery.in('channel', body.channels);
    }

    const { data: queuedRows, error: deliveriesError } = await deliveriesQuery;
    if (deliveriesError) {
      throw deliveriesError;
    }

    const deliveries = (queuedRows || []) as DeliveryRow[];
    if (deliveries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No queued deliveries' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const notificationIds = [...new Set(deliveries.map(delivery => delivery.notification_id))];
    const { data: notificationRows, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, trip_id, metadata')
      .in('id', notificationIds);

    if (notificationsError) {
      throw notificationsError;
    }

    const notifications = (notificationRows || []) as NotificationRow[];
    const notificationById = new Map<string, NotificationRow>(
      notifications.map(notification => [notification.id, notification]),
    );

    const recipientIds = [...new Set(notifications.map(notification => notification.user_id))];
    const tripIds = [
      ...new Set(notifications.map(notification => notification.trip_id).filter(Boolean)),
    ] as string[];

    const actorIds = [
      ...new Set(
        notifications
          .map(notification => getActorUserId(parseMetadata(notification.metadata)))
          .filter(Boolean),
      ),
    ] as string[];

    const profileIds = [...new Set([...recipientIds, ...actorIds])];

    const [
      { data: preferenceRows },
      { data: entitlementRows },
      { data: smsOptInRows },
      { data: tripRows },
      { data: profileRows },
      { data: pushTokenRows },
      { data: webPushRows },
    ] = await Promise.all([
      supabase.from('notification_preferences').select('*').in('user_id', recipientIds),
      supabase
        .from('user_entitlements')
        .select('user_id, plan, status, current_period_end')
        .in('user_id', recipientIds),
      supabase
        .from('sms_opt_in')
        .select('user_id, phone_e164, verified, opted_in')
        .in('user_id', recipientIds),
      tripIds.length
        ? supabase.from('trips').select('id, name').in('id', tripIds)
        : Promise.resolve({ data: [], error: null }),
      profileIds.length
        ? supabase
            .from('profiles')
            .select('user_id, display_name, first_name, last_name, email')
            .in('user_id', profileIds)
        : Promise.resolve({ data: [], error: null }),
      recipientIds.length
        ? supabase
            .from('push_device_tokens')
            .select('user_id, token')
            .in('user_id', recipientIds)
            .is('disabled_at', null)
        : Promise.resolve({ data: [], error: null }),
      recipientIds.length
        ? supabase
            .from('web_push_subscriptions')
            .select('*')
            .in('user_id', recipientIds)
            .eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const preferencesByUser = new Map<string, NotificationPreferences>();
    for (const userId of recipientIds) {
      const raw = (preferenceRows || []).find(row => row.user_id === userId);
      preferencesByUser.set(userId, mergePreferences(userId, raw || undefined));
    }

    const entitlementsByUser = new Map<string, EntitlementRow>(
      ((entitlementRows || []) as EntitlementRow[]).map(row => [row.user_id, row]),
    );
    const smsOptInByUser = new Map<string, SmsOptInRow>(
      ((smsOptInRows || []) as SmsOptInRow[]).map(row => [row.user_id, row]),
    );
    const tripById = new Map<string, TripRow>(
      ((tripRows || []) as TripRow[]).map(row => [row.id, row]),
    );
    const profileByUserId = new Map<string, ProfileRow>(
      ((profileRows || []) as ProfileRow[]).map(row => [row.user_id, row]),
    );

    const pushTokensByUser = new Map<string, string[]>();
    for (const tokenRow of pushTokenRows || []) {
      const list = pushTokensByUser.get(tokenRow.user_id) || [];
      list.push(tokenRow.token);
      pushTokensByUser.set(tokenRow.user_id, list);
    }

    const webPushByUser = new Map<string, WebPushSubscription[]>();
    for (const subRow of (webPushRows || []) as WebPushSubscription[]) {
      const list = webPushByUser.get(subRow.user_id) || [];
      list.push(subRow);
      webPushByUser.set(subRow.user_id, list);
    }

    const summary = {
      processed: 0,
      sent: { push: 0, email: 0, sms: 0 },
      failed: { push: 0, email: 0, sms: 0 },
      skipped: { push: 0, email: 0, sms: 0 },
      deferred: 0,
    };

    for (const delivery of deliveries) {
      const notification = notificationById.get(delivery.notification_id);
      if (!notification) {
        await markDelivery(supabase, delivery.id, {
          status: 'failed',
          error: 'Missing notification row',
          attempts: delivery.attempts + 1,
        });
        continue;
      }

      const userId = notification.user_id;
      const prefs = preferencesByUser.get(userId) || mergePreferences(userId);
      const metadata = parseMetadata(notification.metadata);
      const category = normalizeCategory(notification.type || '');
      const channel = delivery.channel;

      summary.processed++;

      if (!isCategoryEnabled(category, prefs)) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: `category_disabled:${category || 'unknown'}`,
          attempts: delivery.attempts + 1,
        });
        summary.skipped[channel]++;
        await logDeliveryAttempt(supabase, {
          userId,
          channel,
          title: notification.title,
          body: notification.message,
          status: 'skipped',
          error: `Category '${category || 'unknown'}' disabled`,
        });
        continue;
      }

      if (body.dryRun) {
        continue;
      }

      if (channel === 'push') {
        if (!prefs.push_enabled) {
          await markDelivery(supabase, delivery.id, {
            status: 'skipped',
            error: 'push_disabled',
            attempts: delivery.attempts + 1,
          });
          summary.skipped.push++;
          continue;
        }

        const fcmTokens = pushTokensByUser.get(userId) || [];
        const webPushSubs = webPushByUser.get(userId) || [];

        if (fcmTokens.length === 0 && webPushSubs.length === 0) {
          await markDelivery(supabase, delivery.id, {
            status: 'skipped',
            error: 'no_push_targets',
            attempts: delivery.attempts + 1,
          });
          summary.skipped.push++;
          continue;
        }

        let pushSucceeded = false;
        let pushError = '';
        const providerIds: string[] = [];

        // 1. Deliver to FCM if available
        if (fcmTokens.length > 0) {
          const pushResult = await sendPush(fcmTokens, notification.title, notification.message, {
            notificationId: notification.id,
            type: notification.type || 'notification',
            tripId: notification.trip_id,
          });
          if (pushResult.ok) {
            pushSucceeded = true;
            if (pushResult.providerMessageId)
              providerIds.push(`fcm:${pushResult.providerMessageId}`);
          } else {
            pushError = `fcm_failed:${pushResult.error}`;
          }
        }

        // 2. Deliver to Web Push if available
        if (webPushSubs.length > 0 && vapidPublicKey && vapidPrivateKey) {
          for (const sub of webPushSubs) {
            const webResult = await sendWebPushNotification(
              sub,
              {
                title: notification.title,
                body: notification.message,
                tag: `notif-${notification.id}`,
                data: {
                  notificationId: notification.id,
                  tripId: notification.trip_id,
                  type: notification.type,
                },
              },
              vapidPublicKey,
              vapidPrivateKey,
              vapidSubject,
            );
            if (webResult.success) {
              pushSucceeded = true;
              providerIds.push(`web:${sub.id}`);

              // Update last_used_at
              await supabase
                .from('web_push_subscriptions')
                .update({ last_used_at: new Date().toISOString(), failed_count: 0 })
                .eq('id', sub.id);
            } else {
              if (!pushSucceeded)
                pushError = (pushError ? pushError + '; ' : '') + `web_failed:${webResult.error}`;

              // Increment failure count
              await supabase.rpc('mark_web_push_subscription_failed', {
                subscription_id: sub.id,
                error_message: webResult.error,
              });
            }
          }
        }

        if (pushSucceeded) {
          await markDelivery(supabase, delivery.id, {
            status: 'sent',
            provider_message_id: providerIds.join(','),
            error: null,
            sent_at: new Date().toISOString(),
            attempts: delivery.attempts + 1,
          });
          summary.sent.push++;
          await logDeliveryAttempt(supabase, {
            userId,
            channel: 'push',
            title: notification.title,
            body: notification.message,
            status: 'sent',
            externalId: providerIds.join(','),
          });
        } else {
          await markDelivery(supabase, delivery.id, {
            status: 'failed',
            error: pushError || 'push_delivery_failed',
            attempts: delivery.attempts + 1,
          });
          summary.failed.push++;
          await logDeliveryAttempt(supabase, {
            userId,
            channel: 'push',
            title: notification.title,
            body: notification.message,
            status: 'failed',
            error: pushError,
          });
        }

        continue;
      }

      if (channel === 'email') {
        if (!prefs.email_enabled) {
          await markDelivery(supabase, delivery.id, {
            status: 'skipped',
            error: 'email_disabled',
            attempts: delivery.attempts + 1,
          });
          summary.skipped.email++;
          continue;
        }

        if (category && !isEmailEligible(category)) {
          await markDelivery(supabase, delivery.id, {
            status: 'skipped',
            error: `email_not_eligible:${category}`,
            attempts: delivery.attempts + 1,
          });
          summary.skipped.email++;
          continue;
        }

        const recipientEmail = profileByUserId.get(userId)?.email?.trim();
        if (!recipientEmail) {
          await markDelivery(supabase, delivery.id, {
            status: 'skipped',
            error: 'missing_email',
            attempts: delivery.attempts + 1,
          });
          summary.skipped.email++;
          continue;
        }

        const emailMeta = parseMetadata(notification.metadata);
        const contentType = categoryToContentType(category, emailMeta);
        const emailTripCtx = buildTripContextFromRow(notification, tripById, emailMeta);
        const actorUserId = getActorUserId(emailMeta);
        const emailActorName =
          (typeof emailMeta.sender_name === 'string' && emailMeta.sender_name) ||
          (typeof emailMeta.requester_name === 'string' && emailMeta.requester_name) ||
          getDisplayName(actorUserId ? profileByUserId.get(actorUserId) : undefined);

        const emailContent = buildNotificationContent({
          type: contentType,
          channel: 'email',
          tripContext: emailTripCtx,
          actorName: emailActorName,
          count: typeof emailMeta.count === 'number' ? emailMeta.count : undefined,
          extra: { tripId: notification.trip_id || undefined },
        }) as EmailContent;

        const emailResult = await sendEmail(
          recipientEmail,
          emailContent.subject,
          emailContent.bodyHtml,
        );
        if (emailResult.ok) {
          await markDelivery(supabase, delivery.id, {
            status: 'sent',
            provider_message_id: emailResult.providerMessageId || null,
            error: null,
            sent_at: new Date().toISOString(),
            attempts: delivery.attempts + 1,
          });
          summary.sent.email++;
          await logDeliveryAttempt(supabase, {
            userId,
            channel: 'email',
            title: notification.title,
            body: notification.message,
            recipient: recipientEmail,
            status: 'sent',
            externalId: emailResult.providerMessageId,
          });
        } else {
          await markDelivery(supabase, delivery.id, {
            status: 'failed',
            error: emailResult.error || 'email_delivery_failed',
            attempts: delivery.attempts + 1,
          });
          summary.failed.email++;
          await logDeliveryAttempt(supabase, {
            userId,
            channel: 'email',
            title: notification.title,
            body: notification.message,
            recipient: recipientEmail,
            status: 'failed',
            error: emailResult.error,
          });
        }

        continue;
      }

      // SMS
      if (!prefs.sms_enabled) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: 'sms_disabled',
          attempts: delivery.attempts + 1,
        });
        summary.skipped.sms++;
        continue;
      }

      if (!category || !isSmsEligible(category)) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: `sms_not_eligible:${category || 'unknown'}`,
          attempts: delivery.attempts + 1,
        });
        summary.skipped.sms++;
        continue;
      }

      const entitlement = entitlementsByUser.get(userId);
      if (!isUserSmsEntitled(entitlement)) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: 'sms_not_entitled',
          attempts: delivery.attempts + 1,
        });
        summary.skipped.sms++;

        // Auto-disable SMS preference when entitlement is missing.
        await supabase
          .from('notification_preferences')
          .update({ sms_enabled: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        await logDeliveryAttempt(supabase, {
          userId,
          channel: 'sms',
          title: notification.title,
          body: notification.message,
          status: 'skipped',
          error: 'User is not entitled for SMS delivery',
        });
        continue;
      }

      // sms_opt_in is optional: use it only when fully verified; otherwise use notification_preferences
      const optIn = smsOptInByUser.get(userId);
      const smsPhone =
        optIn?.opted_in && optIn?.verified ? optIn.phone_e164 : prefs.sms_phone_number || null;

      if (!smsPhone) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: 'missing_sms_phone',
          attempts: delivery.attempts + 1,
        });
        summary.skipped.sms++;
        continue;
      }

      // Check daily rate limit via RPC (handles DB reset on new day)
      const SMS_DAILY_LIMIT = 10;
      const { data: rateLimitRows, error: rateLimitErr } = await supabase.rpc(
        'check_sms_rate_limit',
        {
          p_user_id: userId,
          p_daily_limit: SMS_DAILY_LIMIT,
        },
      );

      const rateLimit =
        Array.isArray(rateLimitRows) && rateLimitRows.length > 0 ? rateLimitRows[0] : null;
      const allowed = rateLimit?.allowed ?? true;

      if (rateLimitErr) {
        console.error('[dispatch] Rate limit check failed:', rateLimitErr);
      }

      if (!allowed) {
        await markDelivery(supabase, delivery.id, {
          status: 'skipped',
          error: 'rate_limited',
          attempts: delivery.attempts + 1,
        });
        summary.skipped.sms++;
        await logDeliveryAttempt(supabase, {
          userId,
          channel: 'sms',
          title: notification.title,
          body: notification.message,
          status: 'skipped',
          error: `Daily limit of ${SMS_DAILY_LIMIT} SMS reached. Resets at ${rateLimit?.reset_at ?? 'midnight'}`,
        });
        continue;
      }

      if (isQuietHours(prefs)) {
        const delayMinutes = Math.max(getMinutesUntilQuietHoursEnd(prefs), 1);
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        await markDelivery(supabase, delivery.id, {
          status: 'queued',
          error: 'quiet_hours_deferred',
          next_attempt_at: nextAttemptAt,
        });
        summary.deferred++;
        continue;
      }

      const tripName = notification.trip_id
        ? tripById.get(notification.trip_id)?.name || 'your trip'
        : 'your trip';
      const actorUserId = getActorUserId(metadata);
      const senderName =
        (typeof metadata.sender_name === 'string' && metadata.sender_name) ||
        (typeof metadata.requester_name === 'string' && metadata.requester_name) ||
        getDisplayName(actorUserId ? profileByUserId.get(actorUserId) : undefined);

      const smsMessage = generateSmsMessage(
        category as Parameters<typeof generateSmsMessage>[0],
        buildSmsTemplateData(
          notification,
          category,
          tripName,
          senderName,
          prefs.timezone || 'America/Los_Angeles',
        ),
      );

      const smsResult = await sendSms(smsPhone, smsMessage);
      if (smsResult.ok) {
        // Increment local counter for batch consistency (persistence handled by RPC below)
        prefs.sms_sent_today = (prefs.sms_sent_today || 0) + 1;

        await markDelivery(supabase, delivery.id, {
          status: 'sent',
          provider_message_id: smsResult.providerMessageId || null,
          error: null,
          sent_at: new Date().toISOString(),
          attempts: delivery.attempts + 1,
        });
        summary.sent.sms++;
        await supabase.rpc('increment_sms_counter', { p_user_id: userId });
        await logDeliveryAttempt(supabase, {
          userId,
          channel: 'sms',
          title: notification.title,
          body: smsMessage,
          recipient: smsPhone,
          status: 'sent',
          externalId: smsResult.providerMessageId,
          metadata: { category },
        });
      } else {
        await markDelivery(supabase, delivery.id, {
          status: 'failed',
          error: smsResult.error || 'sms_delivery_failed',
          attempts: delivery.attempts + 1,
        });
        summary.failed.sms++;
        await logDeliveryAttempt(supabase, {
          userId,
          channel: 'sms',
          title: notification.title,
          body: smsMessage,
          recipient: smsPhone,
          status: 'failed',
          error: smsResult.error,
          metadata: { category },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        queued: deliveries.length,
        ...summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[dispatch-notification-deliveries] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

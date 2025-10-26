/**
 * Enhanced Push Notification Function with Membership-Scoped Topics
 * Supports:
 * - Trip-scoped notifications
 * - Badge count management per trip
 * - Topic subscription management
 * - Quiet hours respect
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for admin operations
);

interface TripNotificationPayload {
  tripId: string;
  eventId?: string;
  title: string;
  body: string;
  type: 'chat_message' | 'trip_update' | 'calendar_reminder' | 'payment_alert' | 'member_joined' | 'poll_created';
  data?: Record<string, any>;
  excludeUserIds?: string[]; // Don't send to these users (e.g., message sender)
  incrementBadge?: boolean; // Default true
}

serve(async (req) => {
  const { createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401);
    }

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const payload: TripNotificationPayload = await req.json();

    // Validate required fields
    if (!payload.tripId || !payload.title || !payload.body || !payload.type) {
      return createErrorResponse('Missing required fields: tripId, title, body, type', 400);
    }

    // Get trip members with their preferences
    const { data: members, error: membersError } = await supabase
      .from('trip_members')
      .select(`
        user_id,
        profiles!inner(user_id, full_name, timezone),
        notification_preferences!inner(
          push_enabled,
          email_enabled,
          trip_updates,
          chat_messages,
          calendar_reminders,
          payment_alerts,
          quiet_hours_enabled,
          quiet_start,
          quiet_end
        )
      `)
      .eq('trip_id', payload.tripId);

    if (membersError) {
      console.error('Error fetching trip members:', membersError);
      return createErrorResponse('Failed to fetch trip members', 500);
    }

    const results: any[] = [];
    const incrementBadge = payload.incrementBadge !== false;

    for (const member of members || []) {
      // Skip excluded users (e.g., the user who triggered the notification)
      if (payload.excludeUserIds?.includes(member.user_id)) {
        continue;
      }

      const prefs = member.notification_preferences;

      // Check if user has this type of notification enabled
      const typeEnabled = checkNotificationTypeEnabled(payload.type, prefs);
      if (!typeEnabled || !prefs.push_enabled) {
        console.log(`Skipping user ${member.user_id}: notification type disabled`);
        continue;
      }

      // Check quiet hours
      if (isQuietHours(prefs, member.profiles.timezone)) {
        console.log(`Skipping user ${member.user_id}: quiet hours`);
        continue;
      }

      // Get user's push tokens
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', member.user_id);

      if (!tokens || tokens.length === 0) {
        console.log(`No push tokens for user ${member.user_id}`);
        continue;
      }

      // Increment badge count if requested
      let badgeCount = 0;
      if (incrementBadge) {
        const { data: badgeData } = await supabase.rpc('increment_badge_count', {
          p_user_id: member.user_id,
          p_trip_id: payload.tripId,
          p_event_id: payload.eventId || null,
          p_increment: 1
        });
        badgeCount = badgeData || 0;
      }

      // Send push notification to each token
      for (const tokenInfo of tokens) {
        try {
          const result = await sendPushToToken(
            tokenInfo.token,
            tokenInfo.platform,
            payload.title,
            payload.body,
            badgeCount,
            {
              ...payload.data,
              tripId: payload.tripId,
              eventId: payload.eventId,
              notificationType: payload.type
            }
          );
          results.push({ userId: member.user_id, platform: tokenInfo.platform, success: result.success });
        } catch (error) {
          console.error(`Failed to send to user ${member.user_id}:`, error);
          results.push({ userId: member.user_id, platform: tokenInfo.platform, success: false, error: error.message });
        }
      }

      // Log notification
      await supabase.from('notification_logs').insert({
        user_id: member.user_id,
        type: 'push',
        title: payload.title,
        body: payload.body,
        data: payload.data,
        success: tokens.length,
        failure: 0
      });
    }

    return createSecureResponse(
      JSON.stringify({
        success: true,
        notificationsSent: results.filter(r => r.success).length,
        totalRecipients: results.length,
        results
      }),
      200,
      { 'Content-Type': 'application/json' }
    );

  } catch (error) {
    console.error('Trip notification error:', error);
    return createErrorResponse(error.message, 500);
  }
});

function checkNotificationTypeEnabled(
  type: string,
  prefs: any
): boolean {
  switch (type) {
    case 'chat_message':
      return prefs.chat_messages;
    case 'trip_update':
    case 'member_joined':
      return prefs.trip_updates;
    case 'calendar_reminder':
      return prefs.calendar_reminders;
    case 'payment_alert':
      return prefs.payment_alerts;
    case 'poll_created':
      return prefs.trip_updates;
    default:
      return true;
  }
}

function isQuietHours(prefs: any, timezone: string): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  try {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone || 'UTC' }));
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();

    const [startHour, startMin] = prefs.quiet_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

async function sendPushToToken(
  token: string,
  platform: string,
  title: string,
  body: string,
  badge: number,
  data: Record<string, any>
): Promise<{ success: boolean; messageId?: string }> {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

  if (!fcmServerKey) {
    throw new Error('FCM server key not configured');
  }

  const fcmPayload: any = {
    notification: {
      title,
      body,
      icon: '/chravel-icon.png',
      badge: badge.toString(),
      click_action: data.url || '/',
    },
    data: {
      ...data,
      badge: badge.toString()
    }
  };

  // Platform-specific configurations
  if (platform === 'ios') {
    fcmPayload.apns = {
      payload: {
        aps: {
          badge,
          sound: 'default',
          'content-available': 1
        }
      }
    };
  } else if (platform === 'android') {
    fcmPayload.android = {
      priority: 'high',
      notification: {
        badge,
        sound: 'default',
        channel_id: 'trip_notifications'
      }
    };
  } else {
    // Web
    fcmPayload.webpush = {
      headers: {
        TTL: '86400' // 24 hours
      },
      notification: {
        badge: '/chravel-badge.png',
        icon: '/chravel-icon.png'
      },
      fcm_options: {
        link: data.url || '/'
      }
    };
  }

  // Add the token
  fcmPayload.token = token;

  const response = await fetch('https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: fcmPayload }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('FCM error:', error);

    // Try legacy API as fallback
    return sendPushLegacy(token, title, body, badge, data);
  }

  const result = await response.json();
  return { success: true, messageId: result.name };
}

async function sendPushLegacy(
  token: string,
  title: string,
  body: string,
  badge: number,
  data: Record<string, any>
): Promise<{ success: boolean }> {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
        icon: '/chravel-icon.png',
        badge: badge.toString()
      },
      data: {
        ...data,
        badge: badge.toString()
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM legacy error: ${await response.text()}`);
  }

  return { success: true };
}

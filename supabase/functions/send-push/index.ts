/**
 * Send Push Notification Edge Function
 * 
 * Sends push notifications to users via FCM (Android/Web) and APNs (iOS).
 * 
 * Required secrets (to be configured in Supabase):
 * - FCM_SERVER_KEY: Firebase Cloud Messaging server key for Android/Web
 * - APNS_KEY_ID: Apple Push Notification service key ID
 * - APNS_TEAM_ID: Apple Developer Team ID
 * - APNS_PRIVATE_KEY: APNs private key (.p8 file contents)
 * - APNS_BUNDLE_ID: iOS app bundle ID (e.g., com.chravel.app)
 * 
 * @see docs/mobile/PUSH_NOTIFICATIONS.md for setup instructions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Push notification payload types
interface PushPayload {
  type: 'chat_message' | 'trip_update' | 'poll_update' | 'task_update' | 'calendar_event' | 'broadcast';
  tripId: string;
  threadId?: string;
  messageId?: string;
  eventId?: string;
  pollId?: string;
  taskId?: string;
}

interface NotificationContent {
  title: string;
  body: string;
  data?: PushPayload;
}

interface SendPushRequest {
  // Target: either userIds OR tripId (for all trip members except excludeUserId)
  userIds?: string[];
  tripId?: string;
  excludeUserId?: string; // Exclude sender from receiving notification
  
  // Notification content
  notification: NotificationContent;
}

interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_id: string | null;
  disabled_at: string | null;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// FCM (Firebase Cloud Messaging) - Android & Web
// ============================================================================

async function sendFCM(tokens: string[], notification: NotificationContent): Promise<{ success: string[]; failed: string[] }> {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  
  if (!fcmServerKey) {
    console.warn('[send-push] FCM_SERVER_KEY not configured, skipping FCM delivery');
    return { success: [], failed: tokens };
  }

  const success: string[] = [];
  const failed: string[] = [];

  // TODO: Implement actual FCM HTTP v1 API call
  // For now, log and mark as failed until FCM is configured
  // 
  // Reference: https://firebase.google.com/docs/cloud-messaging/send-message
  //
  // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `key=${fcmServerKey}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     registration_ids: tokens,
  //     notification: {
  //       title: notification.title,
  //       body: notification.body,
  //     },
  //     data: notification.data,
  //   }),
  // });

  console.log(`[send-push] FCM: Would send to ${tokens.length} tokens (TODO: implement FCM integration)`);
  
  // Mark all as failed until implemented
  failed.push(...tokens);

  return { success, failed };
}

// ============================================================================
// APNs (Apple Push Notification service) - iOS
// ============================================================================

async function sendAPNs(tokens: string[], notification: NotificationContent): Promise<{ success: string[]; failed: string[] }> {
  const apnsKeyId = Deno.env.get('APNS_KEY_ID');
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
  const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
  const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') || 'app.lovable.20feaa0409464c68a68d0eb88cc1b9c4';

  if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey) {
    console.warn('[send-push] APNs credentials not configured, skipping APNs delivery');
    return { success: [], failed: tokens };
  }

  const success: string[] = [];
  const failed: string[] = [];

  // TODO: Implement actual APNs HTTP/2 API call
  // For now, log and mark as failed until APNs is configured
  //
  // Reference: https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
  //
  // Steps:
  // 1. Create JWT token using APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY
  // 2. For each device token, POST to:
  //    Production: https://api.push.apple.com/3/device/{deviceToken}
  //    Sandbox: https://api.sandbox.push.apple.com/3/device/{deviceToken}
  // 3. Handle response codes (410 = token invalid, should disable)
  //
  // const payload = {
  //   aps: {
  //     alert: {
  //       title: notification.title,
  //       body: notification.body,
  //     },
  //     badge: 1,
  //     sound: 'default',
  //   },
  //   ...notification.data,
  // };

  console.log(`[send-push] APNs: Would send to ${tokens.length} tokens (TODO: implement APNs integration)`);
  
  // Mark all as failed until implemented
  failed.push(...tokens);

  return { success, failed };
}

// ============================================================================
// Web Push (for PWA / browser notifications)
// ============================================================================

async function sendWebPush(tokens: string[], notification: NotificationContent): Promise<{ success: string[]; failed: string[] }> {
  // TODO: Implement Web Push using VAPID
  // Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY secrets
  //
  // Reference: https://web.dev/push-notifications-overview/
  
  console.log(`[send-push] WebPush: Would send to ${tokens.length} tokens (TODO: implement Web Push)`);
  
  return { success: [], failed: tokens };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: SendPushRequest = await req.json();
    console.log('[send-push] Request:', JSON.stringify(body, null, 2));

    // Validate request
    if (!body.notification?.title || !body.notification?.body) {
      return new Response(
        JSON.stringify({ error: 'notification.title and notification.body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.userIds?.length && !body.tripId) {
      return new Response(
        JSON.stringify({ error: 'Either userIds or tripId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve target user IDs
    let targetUserIds: string[] = body.userIds || [];

    if (body.tripId && !body.userIds?.length) {
      // Fetch all trip members
      const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', body.tripId);

      if (membersError) {
        console.error('[send-push] Failed to fetch trip members:', membersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch trip members' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUserIds = (members || []).map(m => m.user_id);
    }

    // Exclude sender if specified
    if (body.excludeUserId) {
      targetUserIds = targetUserIds.filter(id => id !== body.excludeUserId);
    }

    if (targetUserIds.length === 0) {
      console.log('[send-push] No target users after filtering');
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Targeting ${targetUserIds.length} users`);

    // Fetch device tokens for target users (only active tokens)
    const { data: tokens, error: tokensError } = await supabase
      .from('push_device_tokens')
      .select('*')
      .in('user_id', targetUserIds)
      .is('disabled_at', null);

    if (tokensError) {
      console.error('[send-push] Failed to fetch device tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch device tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceTokens = (tokens || []) as DeviceToken[];
    console.log(`[send-push] Found ${deviceTokens.length} active device tokens`);

    if (deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, errors: [], message: 'No device tokens registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group tokens by platform
    const iosTokens = deviceTokens.filter(t => t.platform === 'ios').map(t => t.token);
    const androidTokens = deviceTokens.filter(t => t.platform === 'android').map(t => t.token);
    const webTokens = deviceTokens.filter(t => t.platform === 'web').map(t => t.token);

    console.log(`[send-push] Platforms: iOS=${iosTokens.length}, Android=${androidTokens.length}, Web=${webTokens.length}`);

    // Send to each platform
    const results: SendResult = { success: true, sent: 0, failed: 0, errors: [] };

    if (iosTokens.length > 0) {
      const apnsResult = await sendAPNs(iosTokens, body.notification);
      results.sent += apnsResult.success.length;
      results.failed += apnsResult.failed.length;
      
      // TODO: Disable invalid tokens (410 responses)
      // if (apnsResult.invalidTokens?.length) {
      //   await supabase.from('push_device_tokens')
      //     .update({ disabled_at: new Date().toISOString() })
      //     .in('token', apnsResult.invalidTokens);
      // }
    }

    if (androidTokens.length > 0) {
      const fcmResult = await sendFCM(androidTokens, body.notification);
      results.sent += fcmResult.success.length;
      results.failed += fcmResult.failed.length;
    }

    if (webTokens.length > 0) {
      const webResult = await sendWebPush(webTokens, body.notification);
      results.sent += webResult.success.length;
      results.failed += webResult.failed.length;
    }

    console.log(`[send-push] Complete: sent=${results.sent}, failed=${results.failed}`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-push] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders } from '../_shared/cors.ts';

// Push notification payload types
interface PushPayload {
  type:
    | 'chat_message'
    | 'trip_update'
    | 'poll_update'
    | 'task_update'
    | 'calendar_event'
    | 'broadcast';
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

async function sendFCM(
  tokens: string[],
  notification: NotificationContent,
): Promise<{ success: string[]; failed: string[] }> {
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

  console.log(
    `[send-push] FCM: Would send to ${tokens.length} tokens (TODO: implement FCM integration)`,
  );

  // Mark all as failed until implemented
  failed.push(...tokens);

  return { success, failed };
}

// ============================================================================
// APNs (Apple Push Notification service) - iOS
// ============================================================================

// APNs JWT cache - tokens are valid for 1 hour, we refresh at 50 minutes
let cachedApnsJwt: { token: string; expiresAt: number } | null = null;

/**
 * Generate APNs JWT for authentication
 * Uses ES256 (ECDSA with P-256 and SHA-256) as required by Apple
 */
async function generateApnsJwt(
  keyId: string,
  teamId: string,
  privateKeyPem: string,
): Promise<string> {
  // Check cache first
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && cachedApnsJwt.expiresAt > now + 600) {
    return cachedApnsJwt.token;
  }

  // JWT Header
  const header = {
    alg: 'ES256',
    kid: keyId,
  };

  // JWT Claims
  const claims = {
    iss: teamId,
    iat: now,
  };

  // Base64URL encode
  const encoder = new TextEncoder();
  const base64url = (data: Uint8Array | string): string => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;

  // Parse PEM private key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(signingInput),
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${signingInput}.${signatureB64}`;

  // Cache for 50 minutes (tokens valid for 1 hour)
  cachedApnsJwt = { token: jwt, expiresAt: now + 3000 };

  return jwt;
}

interface ApnsResult {
  success: string[];
  failed: string[];
  invalidTokens: string[];
}

async function sendAPNs(tokens: string[], notification: NotificationContent): Promise<ApnsResult> {
  const apnsKeyId = Deno.env.get('APNS_KEY_ID');
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
  const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
  const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') || 'com.chravel.app';
  const apnsEnvironment = Deno.env.get('APNS_ENVIRONMENT') || 'development'; // 'development' or 'production'

  if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey) {
    console.warn('[send-push] APNs credentials not configured, skipping APNs delivery');
    return { success: [], failed: tokens, invalidTokens: [] };
  }

  const success: string[] = [];
  const failed: string[] = [];
  const invalidTokens: string[] = [];

  try {
    // Generate JWT for APNs authentication
    const jwt = await generateApnsJwt(apnsKeyId, apnsTeamId, apnsPrivateKey);

    // APNs endpoint (production vs sandbox)
    const apnsHost =
      apnsEnvironment === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

    // Build the APNs payload
    const payload = JSON.stringify({
      aps: {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        badge: 1,
        sound: 'default',
        'mutable-content': 1,
      },
      // Include custom data for routing
      ...(notification.data || {}),
    });

    console.log(`[send-push] APNs: Sending to ${tokens.length} tokens via ${apnsHost}`);

    // Send to each device token
    // Note: In production, consider batching or using HTTP/2 multiplexing
    const results = await Promise.allSettled(
      tokens.map(async token => {
        const response = await fetch(`https://${apnsHost}/3/device/${token}`, {
          method: 'POST',
          headers: {
            authorization: `bearer ${jwt}`,
            'apns-topic': apnsBundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'apns-expiration': '0',
            'content-type': 'application/json',
          },
          body: payload,
        });

        if (response.ok) {
          return { token, success: true };
        }

        // Handle errors
        const status = response.status;
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // Ignore
        }

        // 410 Gone = invalid token (device unregistered)
        // 400 BadDeviceToken = malformed token
        if (status === 410 || (status === 400 && errorBody.includes('BadDeviceToken'))) {
          return { token, success: false, invalid: true, error: errorBody };
        }

        return { token, success: false, invalid: false, error: `${status}: ${errorBody}` };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          success.push(result.value.token);
        } else {
          failed.push(result.value.token);
          if (result.value.invalid) {
            invalidTokens.push(result.value.token);
          }
          console.warn(`[send-push] APNs failed for token: ${result.value.error}`);
        }
      } else {
        console.error(`[send-push] APNs request failed:`, result.reason);
      }
    }

    console.log(
      `[send-push] APNs complete: ${success.length} sent, ${failed.length} failed, ${invalidTokens.length} invalid`,
    );
  } catch (error) {
    console.error('[send-push] APNs error:', error);
    failed.push(...tokens);
  }

  return { success, failed, invalidTokens };
}

// ============================================================================
// Web Push (for PWA / browser notifications)
// ============================================================================

async function sendWebPush(
  tokens: string[],
  notification: NotificationContent,
): Promise<{ success: string[]; failed: string[] }> {
  // TODO: Implement Web Push using VAPID
  // Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY secrets
  //
  // Reference: https://web.dev/push-notifications-overview/

  console.log(
    `[send-push] WebPush: Would send to ${tokens.length} tokens (TODO: implement Web Push)`,
  );

  return { success: [], failed: tokens };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerUserId = userData.user.id;

    // Parse request
    const body: SendPushRequest = await req.json();

    // Authorization: If sending to a trip, verify the caller is a trip member
    if (body.tripId) {
      const { data: membership, error: memberError } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', body.tripId)
        .eq('user_id', callerUserId)
        .maybeSingle();
      if (memberError || !membership) {
        return new Response(
          JSON.stringify({ error: 'You must be a trip member to send notifications' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Validate request
    if (!body.notification?.title || !body.notification?.body) {
      return new Response(
        JSON.stringify({ error: 'notification.title and notification.body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!body.userIds?.length && !body.tripId) {
      return new Response(JSON.stringify({ error: 'Either userIds or tripId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        return new Response(JSON.stringify({ error: 'Failed to fetch trip members' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      targetUserIds = (members || []).map(m => m.user_id);
    }

    // Exclude sender if specified
    if (body.excludeUserId) {
      targetUserIds = targetUserIds.filter(id => id !== body.excludeUserId);
    }

    if (targetUserIds.length === 0) {
      console.log('[send-push] No target users after filtering');
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0, errors: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Failed to fetch device tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deviceTokens = (tokens || []) as DeviceToken[];
    console.log(`[send-push] Found ${deviceTokens.length} active device tokens`);

    if (deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          errors: [],
          message: 'No device tokens registered',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Group tokens by platform
    const iosTokens = deviceTokens.filter(t => t.platform === 'ios').map(t => t.token);
    const androidTokens = deviceTokens.filter(t => t.platform === 'android').map(t => t.token);
    const webTokens = deviceTokens.filter(t => t.platform === 'web').map(t => t.token);

    console.log(
      `[send-push] Platforms: iOS=${iosTokens.length}, Android=${androidTokens.length}, Web=${webTokens.length}`,
    );

    // Send to each platform
    const results: SendResult = { success: true, sent: 0, failed: 0, errors: [] };

    if (iosTokens.length > 0) {
      const apnsResult = await sendAPNs(iosTokens, body.notification);
      results.sent += apnsResult.success.length;
      results.failed += apnsResult.failed.length;

      // Disable invalid tokens (410 responses) to prevent future failures
      if (apnsResult.invalidTokens?.length) {
        console.log(`[send-push] Disabling ${apnsResult.invalidTokens.length} invalid iOS tokens`);
        const { error: disableError } = await supabase
          .from('push_device_tokens')
          .update({ disabled_at: new Date().toISOString() })
          .in('token', apnsResult.invalidTokens);

        if (disableError) {
          console.error('[send-push] Failed to disable invalid tokens:', disableError);
        }
      }
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

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-push] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

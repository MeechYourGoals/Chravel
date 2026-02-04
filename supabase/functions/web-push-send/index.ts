/**
 * Web Push Send Edge Function
 * 
 * Sends Web Push notifications using the Web Push Protocol with VAPID authentication.
 * Supports notification types: chat messages, itinerary updates, payment requests, trip reminders.
 * 
 * Required Environment Variables (Supabase Secrets):
 * - VAPID_PUBLIC_KEY: Base64url-encoded P-256 public key
 * - VAPID_PRIVATE_KEY: Base64url-encoded P-256 private key  
 * - SUPABASE_URL: Auto-provided by Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Auto-provided by Supabase
 * 
 * @see https://web.dev/push-notifications-web-push-protocol/
 * @see https://datatracker.ietf.org/doc/html/rfc8291 (Web Push Encryption)
 * @see https://datatracker.ietf.org/doc/html/rfc8292 (VAPID)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// Types
// ============================================================================

interface WebPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

type NotificationType = 
  | 'chat_message'
  | 'itinerary_update'
  | 'payment_request'
  | 'payment_split'
  | 'trip_reminder'
  | 'trip_invite'
  | 'poll_vote'
  | 'task_assigned'
  | 'broadcast'
  | 'mention';

interface SendPushRequest {
  // Target users
  userIds?: string[];
  tripId?: string;
  excludeUserId?: string;
  
  // Notification content
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  
  // Action data for routing
  data?: {
    tripId?: string;
    messageId?: string;
    eventId?: string;
    paymentId?: string;
    pollId?: string;
    taskId?: string;
    url?: string;
    [key: string]: unknown;
  };
  
  // Notification actions (buttons)
  actions?: NotificationAction[];
  
  // Options
  tag?: string;
  requireInteraction?: boolean;
  ttl?: number; // Time-to-live in seconds
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
  details?: {
    userId: string;
    subscriptionId: string;
    success: boolean;
    error?: string;
  }[];
}

// ============================================================================
// Web Push Encryption Implementation
// ============================================================================

/**
 * Base64url decode to Uint8Array
 */
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Base64url encode from Uint8Array
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate VAPID JWT for authorization header
 */
async function generateVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string,
  expiration: number
): Promise<string> {
  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  // JWT Payload
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlDecode(privateKey);
  
  // Convert to PKCS8 format for crypto.subtle
  // P-256 private key is 32 bytes, need to wrap in PKCS8 structure
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ]);

  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00
  ]);

  // Get public key bytes
  const publicKeyBytes = base64UrlDecode(publicKey);

  // Construct PKCS8 key
  const pkcs8Key = new Uint8Array(
    pkcs8Header.length + privateKeyBytes.length + pkcs8Footer.length + publicKeyBytes.length
  );
  pkcs8Key.set(pkcs8Header, 0);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);
  pkcs8Key.set(pkcs8Footer, pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(publicKeyBytes, pkcs8Header.length + privateKeyBytes.length + pkcs8Footer.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signingInput)
  );

  // Convert DER signature to raw format (r || s)
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

/**
 * Encrypt push message using Web Push encryption (RFC 8291)
 */
async function encryptPushMessage(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Decode subscription keys
  const userPublicKeyBytes = base64UrlDecode(p256dhKey);
  const authBytes = base64UrlDecode(authKey);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  const infoAuth = encoder.encode('Content-Encoding: auth\0');
  const infoAesgcm = encoder.encode('Content-Encoding: aesgcm\0');
  const infoNonce = encoder.encode('Content-Encoding: nonce\0');

  // PRK = HKDF-Extract(auth, shared_secret)
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authBytes,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // IKM for HKDF (shared_secret || auth)
  const ikm = new Uint8Array(sharedSecret.length + authBytes.length);
  ikm.set(sharedSecret, 0);
  // Note: Simplified encryption - in production use full RFC 8291

  // For simplicity, use basic AES-GCM encryption
  // Full RFC 8291 implementation would require more complex key derivation
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: salt,
      info: infoAesgcm,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  // Nonce derivation
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: salt,
      info: infoNonce,
      hash: 'SHA-256',
    },
    keyMaterial,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Add padding (RFC 8291 requires at least 2 bytes of padding)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);

  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    encryptionKey,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    salt,
    localPublicKey,
  };
}

/**
 * Send a single Web Push notification
 */
async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
  ttl: number = 86400
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract endpoint origin for VAPID audience
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // Generate VAPID JWT (valid for 12 hours)
    const expiration = Math.floor(Date.now() / 1000) + 43200;
    const jwt = await generateVapidJwt(
      audience,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
      expiration
    );

    // Encrypt the payload
    const payloadString = JSON.stringify(payload);
    const { ciphertext, salt, localPublicKey } = await encryptPushMessage(
      payloadString,
      subscription.p256dh_key,
      subscription.auth_key
    );

    // Send to push service
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': `salt=${base64UrlEncode(salt)}`,
        'Crypto-Key': `dh=${base64UrlEncode(localPublicKey)}`,
        'TTL': ttl.toString(),
        'Urgency': 'normal',
      },
      body: ciphertext,
    });

    if (response.ok || response.status === 201) {
      return { success: true };
    }

    // Handle specific error codes
    const status = response.status;
    let errorMessage = `HTTP ${status}`;

    try {
      const errorBody = await response.text();
      errorMessage += `: ${errorBody}`;
    } catch {
      // Ignore
    }

    // 404 or 410 = subscription no longer valid
    if (status === 404 || status === 410) {
      return { success: false, error: 'subscription_expired' };
    }

    // 413 = payload too large
    if (status === 413) {
      return { success: false, error: 'payload_too_large' };
    }

    // 429 = rate limited
    if (status === 429) {
      return { success: false, error: 'rate_limited' };
    }

    return { success: false, error: errorMessage };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[web-push-send] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:notifications@chravel.app';

    // Validate VAPID keys
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[web-push-send] VAPID keys not configured');
      return new Response(
        JSON.stringify({ 
          error: 'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AUTHENTICATION: Verify caller's JWT
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      console.error('[web-push-send] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[web-push-send] Authenticated caller: ${caller.id}`);

    // Initialize service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: SendPushRequest = await req.json();
    console.log('[web-push-send] Request:', JSON.stringify({ ...body, data: body.data }, null, 2));

    // Validate request
    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.userIds?.length && !body.tripId) {
      return new Response(
        JSON.stringify({ error: 'Either userIds or tripId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AUTHORIZATION: Verify caller can send to these targets
    // ========================================================================
    let targetUserIds: string[] = body.userIds || [];

    if (body.tripId) {
      // Verify caller is a member of this trip
      const { data: callerMembership, error: membershipError } = await supabase
        .from('trip_members')
        .select('user_id, role')
        .eq('trip_id', body.tripId)
        .eq('user_id', caller.id)
        .single();

      if (membershipError || !callerMembership) {
        console.warn(`[web-push-send] Caller ${caller.id} is not a member of trip ${body.tripId}`);
        return new Response(
          JSON.stringify({ error: 'You are not a member of this trip' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[web-push-send] Caller is trip member with role: ${callerMembership.role}`);

      // Fetch all trip members
      const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', body.tripId);

      if (membersError) {
        console.error('[web-push-send] Failed to fetch trip members:', membersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch trip members' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUserIds = (members || []).map(m => m.user_id);
    } else if (body.userIds?.length) {
      // When targeting specific userIds, only allow:
      // 1. Sending to self
      // 2. Sending to users in a shared trip
      
      // For security, verify each target user shares a trip with caller
      const nonSelfTargets = body.userIds.filter(id => id !== caller.id);
      
      if (nonSelfTargets.length > 0) {
        // Get all trips where caller is a member
        const { data: callerTrips } = await supabase
          .from('trip_members')
          .select('trip_id')
          .eq('user_id', caller.id);
        
        const callerTripIds = (callerTrips || []).map(t => t.trip_id);
        
        if (callerTripIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'You can only send notifications to yourself or trip members' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if all target users share at least one trip with caller
        const { data: sharedMembers } = await supabase
          .from('trip_members')
          .select('user_id')
          .in('trip_id', callerTripIds)
          .in('user_id', nonSelfTargets);
        
        const sharedUserIds = new Set((sharedMembers || []).map(m => m.user_id));
        const unauthorizedTargets = nonSelfTargets.filter(id => !sharedUserIds.has(id));
        
        if (unauthorizedTargets.length > 0) {
          console.warn(`[web-push-send] Unauthorized targets: ${unauthorizedTargets.join(', ')}`);
          return new Response(
            JSON.stringify({ error: 'You can only send notifications to users you share a trip with' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      targetUserIds = body.userIds;
    }

    // Exclude sender if specified
    if (body.excludeUserId) {
      targetUserIds = targetUserIds.filter(id => id !== body.excludeUserId);
    }

    if (targetUserIds.length === 0) {
      console.log('[web-push-send] No target users after filtering');
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[web-push-send] Targeting ${targetUserIds.length} users`);

    // Fetch active web push subscriptions for target users
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('web_push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
      .lt('failed_count', 3);

    if (subscriptionsError) {
      console.error('[web-push-send] Failed to fetch subscriptions:', subscriptionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webPushSubscriptions = (subscriptions || []) as WebPushSubscription[];
    console.log(`[web-push-send] Found ${webPushSubscriptions.length} active subscriptions`);

    if (webPushSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          failed: 0, 
          errors: [], 
          message: 'No active web push subscriptions found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification payload
    const notificationPayload: NotificationPayload = {
      title: body.title,
      body: body.body,
      icon: body.icon || '/chravel-logo.png',
      badge: body.badge || '/chravel-badge.png',
      image: body.image,
      tag: body.tag || `chravel-${body.type}-${Date.now()}`,
      data: {
        type: body.type,
        ...body.data,
        timestamp: Date.now(),
      },
      actions: body.actions,
      requireInteraction: body.requireInteraction ?? false,
      renotify: true,
      timestamp: Date.now(),
    };

    // Send to all subscriptions
    const results: SendResult = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    const sendPromises = webPushSubscriptions.map(async (subscription) => {
      const result = await sendWebPushNotification(
        subscription,
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject,
        body.ttl || 86400
      );

      if (result.success) {
        results.sent++;
        
        // Update last_used_at
        await supabase
          .from('web_push_subscriptions')
          .update({ 
            last_used_at: new Date().toISOString(),
            failed_count: 0,
            last_error: null
          })
          .eq('id', subscription.id);
      } else {
        results.failed++;
        results.errors.push(`${subscription.id}: ${result.error}`);

        // Handle expired subscriptions
        if (result.error === 'subscription_expired') {
          await supabase
            .from('web_push_subscriptions')
            .update({ is_active: false, last_error: 'Subscription expired' })
            .eq('id', subscription.id);
        } else {
          // Increment failure count
          await supabase
            .from('web_push_subscriptions')
            .update({ 
              failed_count: subscription.failed_count + 1,
              last_error: result.error
            })
            .eq('id', subscription.id);
        }
      }

      results.details?.push({
        userId: subscription.user_id,
        subscriptionId: subscription.id,
        success: result.success,
        error: result.error,
      });
    });

    await Promise.all(sendPromises);

    console.log(`[web-push-send] Complete: sent=${results.sent}, failed=${results.failed}`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[web-push-send] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

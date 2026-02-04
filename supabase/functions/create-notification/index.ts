/**
 * Create Notification Edge Function
 *
 * Centralized notification creation with full preference gating.
 * This is the single entry point for creating SYSTEM notifications that respects:
 * - Category toggles (e.g., broadcasts ON/OFF)
 * - Delivery method toggles (push/email/SMS)
 * - Email/SMS category eligibility restrictions
 * - Quiet hours
 *
 * SECURITY:
 * - This is NOT for user-to-user messaging (use chat for that)
 * - Trip notifications require caller to be trip organizer/admin
 * - Direct user targeting only allowed from internal edge functions
 *
 * In-app notifications are created if category is enabled (even during quiet hours).
 * Delivery methods are only triggered if enabled AND not in quiet hours.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  NotificationCategory,
  NotificationPreferences,
  normalizeCategory,
  getDeliveryDecision,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../_shared/notificationUtils.ts';

// ============================================================================
// Types
// ============================================================================

interface CreateNotificationRequest {
  // Target trip (required) - caller must be trip organizer/admin
  tripId: string;

  // Notification content
  type: string; // Will be normalized to NotificationCategory
  title: string;
  message: string;
  metadata?: Record<string, unknown>;

  // Options
  excludeUserId?: string; // Exclude this user (e.g., the sender)
  highPriority?: boolean;
}

// Roles that can send trip-wide notifications
const NOTIFICATION_SENDER_ROLES = ['organizer', 'admin', 'creator'];

interface NotificationResult {
  userId: string;
  inAppCreated: boolean;
  pushSent: boolean;
  emailSent: boolean;
  smsSent: boolean;
  skipped: boolean;
  reason?: string;
}

interface CreateNotificationResponse {
  success: boolean;
  results: NotificationResult[];
  totalProcessed: number;
  inAppCreated: number;
  pushSent: number;
  emailSent: number;
  smsSent: number;
  skipped: number;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    // ========================================================================
    // Authentication
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller's identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========================================================================
    // Parse Request
    // ========================================================================
    const body: CreateNotificationRequest = await req.json();

    if (!body.type || !body.title || !body.message) {
      return new Response(
        JSON.stringify({ error: 'type, title, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the notification type to a category
    const category = normalizeCategory(body.type);
    if (!category) {
      return new Response(
        JSON.stringify({ error: `Unknown notification type: ${body.type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-notification] Type: ${body.type} -> Category: ${category}`);

    // ========================================================================
    // Authorization Check
    // ========================================================================
    // This endpoint requires a tripId - it's for trip organizers to send
    // notifications to their trip members. Direct user targeting is not allowed.
    //
    // For system/internal notifications (cron jobs, triggers, etc.):
    // - Use send-trip-notification (for push)
    // - Or insert directly into notifications table via triggers

    if (!body.tripId) {
      return new Response(
        JSON.stringify({
          error: 'tripId is required. This endpoint is for sending notifications to trip members.',
          hint: 'For chat messages, use the chat feature. For system notifications, use database triggers.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is an organizer/admin of the trip
    const { data: membership, error: memberError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', body.tripId)
      .eq('user_id', caller.id)
      .maybeSingle();

    if (memberError) {
      console.error('[create-notification] Error checking membership:', memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify authorization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!membership || !NOTIFICATION_SENDER_ROLES.includes(membership.role)) {
      console.warn(`[create-notification] Unauthorized: User ${caller.id} is not an organizer/admin of trip ${body.tripId}`);
      return new Response(
        JSON.stringify({ error: 'You must be a trip organizer or admin to send notifications to this trip' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-notification] Authorized: User ${caller.id} has role '${membership.role}' in trip ${body.tripId}`);

    // ========================================================================
    // Determine Target Users (all trip members)
    // ========================================================================
    const { data: members, error: membersError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', body.tripId);

    if (membersError) {
      console.error('[create-notification] Error fetching trip members:', membersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch trip members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUserIds = (members || []).map(m => m.user_id);

    // Exclude specified user
    if (body.excludeUserId) {
      targetUserIds = targetUserIds.filter(id => id !== body.excludeUserId);
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          results: [],
          totalProcessed: 0,
          inAppCreated: 0,
          pushSent: 0,
          emailSent: 0,
          smsSent: 0,
          skipped: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-notification] Targeting ${targetUserIds.length} users`);

    // ========================================================================
    // Fetch Preferences for All Target Users
    // ========================================================================
    const { data: prefsData, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', targetUserIds);

    if (prefsError) {
      console.error('[create-notification] Error fetching preferences:', prefsError);
    }

    // Build a map of user preferences (with defaults for users without preferences)
    const prefsMap = new Map<string, NotificationPreferences>();
    for (const userId of targetUserIds) {
      const userPrefs = (prefsData || []).find(p => p.user_id === userId);
      if (userPrefs) {
        prefsMap.set(userId, userPrefs as NotificationPreferences);
      } else {
        // Use defaults for users without explicit preferences
        prefsMap.set(userId, {
          user_id: userId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        });
      }
    }

    // ========================================================================
    // Process Each User
    // ========================================================================
    const results: NotificationResult[] = [];
    const response: CreateNotificationResponse = {
      success: true,
      results: [],
      totalProcessed: targetUserIds.length,
      inAppCreated: 0,
      pushSent: 0,
      emailSent: 0,
      smsSent: 0,
      skipped: 0,
    };

    // Batch in-app notification inserts
    const inAppNotifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      trip_id: string | null;
      metadata: Record<string, unknown>;
      is_read: boolean;
      is_visible: boolean;
    }> = [];

    // Collect users for push/email/SMS
    const pushUsers: string[] = [];
    const emailUsers: Array<{ userId: string; email?: string }> = [];
    const smsUsers: Array<{ userId: string; phone: string }> = [];

    for (const userId of targetUserIds) {
      const prefs = prefsMap.get(userId)!;
      const decision = getDeliveryDecision(category, prefs);

      const result: NotificationResult = {
        userId,
        inAppCreated: false,
        pushSent: false,
        emailSent: false,
        smsSent: false,
        skipped: !decision.createInApp,
        reason: decision.reason,
      };

      if (decision.createInApp) {
        inAppNotifications.push({
          user_id: userId,
          type: body.type,
          title: body.title,
          message: body.message,
          trip_id: body.tripId,
          metadata: {
            ...body.metadata,
            category,
            high_priority: body.highPriority || false,
          },
          is_read: false,
          is_visible: true,
        });
        result.inAppCreated = true;
        response.inAppCreated++;
      } else {
        response.skipped++;
      }

      if (decision.sendPush) {
        pushUsers.push(userId);
        result.pushSent = true;
        response.pushSent++;
      }

      if (decision.sendEmail) {
        emailUsers.push({ userId });
        result.emailSent = true;
        response.emailSent++;
      }

      if (decision.sendSms && prefs.sms_phone_number) {
        smsUsers.push({ userId, phone: prefs.sms_phone_number });
        result.smsSent = true;
        response.smsSent++;
      }

      results.push(result);
    }

    // ========================================================================
    // Create In-App Notifications
    // ========================================================================
    if (inAppNotifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(inAppNotifications);

      if (insertError) {
        console.error('[create-notification] Error creating in-app notifications:', insertError);
        // Continue anyway - don't fail the whole request
      }
    }

    // ========================================================================
    // Send Push Notifications (to web-push-send function)
    // ========================================================================
    if (pushUsers.length > 0) {
      try {
        await supabase.functions.invoke('web-push-send', {
          body: {
            userIds: pushUsers,
            type: body.type,
            title: body.title,
            body: body.message,
            data: body.metadata,
          },
          headers: { Authorization: authHeader },
        });
      } catch (err) {
        console.error('[create-notification] Error sending push:', err);
      }
    }

    // ========================================================================
    // Send Email Notifications
    // ========================================================================
    if (emailUsers.length > 0) {
      // Fetch user emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', emailUsers.map(u => u.userId));

      for (const profile of profiles || []) {
        if (profile.email) {
          try {
            await supabase.functions.invoke('push-notifications', {
              body: {
                action: 'send_email',
                userId: profile.user_id,
                email: profile.email,
                subject: body.title,
                content: body.message,
              },
            });
          } catch (err) {
            console.error(`[create-notification] Error sending email to ${profile.user_id}:`, err);
          }
        }
      }
    }

    // ========================================================================
    // Send SMS Notifications
    // ========================================================================
    for (const smsUser of smsUsers) {
      try {
        await supabase.functions.invoke('push-notifications', {
          body: {
            action: 'send_sms',
            userId: smsUser.userId,
            phoneNumber: smsUser.phone,
            message: `${body.title}: ${body.message}`,
          },
        });
      } catch (err) {
        console.error(`[create-notification] Error sending SMS to ${smsUser.userId}:`, err);
      }
    }

    // ========================================================================
    // Log notification batch
    // ========================================================================
    await supabase.from('notification_logs').insert({
      user_id: caller.id,
      type: 'batch',
      title: body.title,
      body: body.message,
      data: {
        category,
        targetCount: targetUserIds.length,
        inAppCreated: response.inAppCreated,
        pushSent: response.pushSent,
        emailSent: response.emailSent,
        smsSent: response.smsSent,
        skipped: response.skipped,
      },
      success: response.inAppCreated + response.pushSent + response.emailSent + response.smsSent,
      failure: response.skipped,
      sent_at: new Date().toISOString(),
    });

    response.results = results;

    console.log(`[create-notification] Complete:`, {
      inApp: response.inAppCreated,
      push: response.pushSent,
      email: response.emailSent,
      sms: response.smsSent,
      skipped: response.skipped,
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

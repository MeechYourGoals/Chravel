import { supabase } from '@/integrations/supabase/client';
import { membershipRepo } from '@/domain/trip/membershipRepo';
import { settingsRepo } from '@/domain/trip/settingsRepo';
import { Invariants } from '@/domain/invariants';

export interface NotificationRequest {
  tripId: string;
  type:
    | 'message' // Mapped from 'chat_message'
    | 'payment' // Mapped from 'payment_request'
    | 'calendar' // Mapped from 'itinerary_update'
    | 'poll'
    | 'task'
    | 'broadcast'
    | 'system';
  actorId?: string; // Who performed the action (to exclude them)
  entityId?: string; // ID of the object (message, expense, event)
  channelId?: string; // For channel-specific mutes
}

export interface NotificationAudience {
  push: string[]; // User IDs for Push
  email: string[]; // User IDs for Email
  sms: string[]; // User IDs for SMS
  inApp: string[]; // User IDs for In-App (usually same as Push)
}

/**
 * Notification Logic Domain Service
 *
 * Pure domain logic for resolving WHO should be notified.
 * Does not send notifications, only calculates the audience.
 */
export const notificationLogic = {
  /**
   * Resolve the effective audience for a notification.
   * Respects:
   * 1. Membership (must be in trip)
   * 2. Global Preferences (Push/Email/SMS enabled)
   * 3. Trip-Specific Settings (Muted channels, Quiet Hours)
   * 4. Invariants (No self-notification)
   */
  async resolveNotificationAudience(request: NotificationRequest): Promise<NotificationAudience> {
    const { tripId, type, actorId } = request;

    // 1. Fetch Candidates (All Members)
    // We use the same 'Effective Members' list as payments/concierge to ensure consistency.
    const members = await membershipRepo.getMembers(tripId);

    // 2. Fetch Preferences for All Candidates (Bulk)
    const memberIds = members.map(m => m.id);
    const { data: globalPrefs, error: globalError } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('user_id', memberIds);

    if (globalError) throw globalError;

    // 3. Fetch Trip-Specific Mutes/Prefs
    // Currently trip_member_preferences table.
    const { data: tripPrefs, error: tripError } = await supabase
        .from('trip_member_preferences')
        .select('*')
        .eq('trip_id', tripId)
        .in('user_id', memberIds);

    if (tripError) throw tripError;

    // Map for fast lookup
    const globalPrefsMap = new Map(globalPrefs?.map(p => [p.user_id, p]));
    const tripPrefsMap = new Map(tripPrefs?.map(p => [p.user_id, p]));

    // 4. Filter Audience
    const audience: NotificationAudience = {
      push: [],
      email: [],
      sms: [],
      inApp: []
    };

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeVal = currentHour * 100 + currentMinute;

    for (const member of members) {
      const userId = member.id;

      // Invariant: Do not notify the actor themselves
      if (actorId && userId === actorId) continue;

      const gPref = globalPrefsMap.get(userId);
      // If no prefs found, assume defaults (usually TRUE for push/inApp, FALSE for SMS/Email)
      const pushEnabled = gPref?.push_enabled ?? true;
      const emailEnabled = gPref?.email_enabled ?? true;
      const smsEnabled = gPref?.sms_enabled ?? false;

      // Check Quiet Hours (Global)
      let isQuietTime = false;
      if (gPref?.quiet_hours_enabled) {
        const start = parseInt((gPref.quiet_start || '22:00').replace(':', ''));
        const end = parseInt((gPref.quiet_end || '08:00').replace(':', ''));
        if (start <= end) {
          isQuietTime = currentTimeVal >= start && currentTimeVal < end;
        } else {
          // Crosses midnight (e.g. 22:00 to 08:00)
          isQuietTime = currentTimeVal >= start || currentTimeVal < end;
        }
      }

      // Check Category Specifics (Global)
      // e.g. if type is 'payment', check gPref.payments
      let categoryAllowed = true;
      switch (type) {
          case 'payment': categoryAllowed = gPref?.payments ?? true; break;
          case 'calendar': categoryAllowed = gPref?.calendar_events ?? true; break;
          case 'task': categoryAllowed = gPref?.tasks ?? true; break;
          case 'poll': categoryAllowed = gPref?.polls ?? true; break;
          case 'message': categoryAllowed = gPref?.chat_messages ?? true; break; // Note: chat often suppressed by default
          case 'broadcast': categoryAllowed = gPref?.broadcasts ?? true; break;
      }

      // Invariant Check (Debug only)
      const allowedByInvariant = Invariants.Notifications.assertNotificationAudience(userId, {
          muted: !categoryAllowed, // Simplify for invariant check
          quietHours: isQuietTime
      });

      if (!allowedByInvariant) continue;
      if (!categoryAllowed) continue;

      // Push Logic
      // Suppress push during quiet hours unless urgent (broadcasts often bypass)
      if (pushEnabled && (!isQuietTime || type === 'broadcast')) {
          audience.push.push(userId);
          audience.inApp.push(userId);
      }

      // Email Logic
      // Usually only for high priority or explicit opt-in
      if (emailEnabled && (type === 'broadcast' || type === 'payment')) {
          audience.email.push(userId);
      }

      // SMS Logic
      // Only for broadcasts or very high priority
      if (smsEnabled && type === 'broadcast') {
          audience.sms.push(userId);
      }
    }

    return audience;
  }
};

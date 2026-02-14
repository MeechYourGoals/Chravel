import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { formatTimeForTimezone } from '../_shared/smsTemplates.ts';

interface CalendarReminderRow {
  id: string;
  event_id: string;
  trip_id: string;
  recipient_user_id: string;
  reminder_type: '3h' | '1h' | '15m';
  reminder_at: string;
}

interface TripEventRow {
  id: string;
  trip_id: string;
  title: string;
  start_time: string;
}

interface TripRow {
  id: string;
  name: string;
}

interface PreferenceTimezoneRow {
  user_id: string;
  timezone: string | null;
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const nowIso = new Date().toISOString();
    const { data: dueRows, error: dueError } = await supabase
      .from('calendar_reminders')
      .select('id, event_id, trip_id, recipient_user_id, reminder_type, reminder_at')
      .is('sent_at', null)
      .lte('reminder_at', nowIso)
      .order('reminder_at', { ascending: true })
      .limit(250);

    if (dueError) {
      throw dueError;
    }

    const reminders = (dueRows || []) as CalendarReminderRow[];
    if (reminders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No due reminders',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const eventIds = [...new Set(reminders.map(reminder => reminder.event_id))];
    const tripIds = [...new Set(reminders.map(reminder => reminder.trip_id))];
    const userIds = [...new Set(reminders.map(reminder => reminder.recipient_user_id))];

    const [{ data: eventRows }, { data: tripRows }, { data: timezoneRows }] = await Promise.all([
      supabase
        .from('trip_events')
        .select('id, trip_id, title, start_time')
        .in('id', eventIds),
      supabase
        .from('trips')
        .select('id, name')
        .in('id', tripIds),
      supabase
        .from('notification_preferences')
        .select('user_id, timezone')
        .in('user_id', userIds),
    ]);

    const eventsById = new Map<string, TripEventRow>(
      ((eventRows || []) as TripEventRow[]).map(event => [event.id, event]),
    );
    const tripsById = new Map<string, TripRow>(
      ((tripRows || []) as TripRow[]).map(trip => [trip.id, trip]),
    );
    const timezoneByUser = new Map<string, string>(
      ((timezoneRows || []) as PreferenceTimezoneRow[]).map(row => [
        row.user_id,
        row.timezone || 'America/Los_Angeles',
      ]),
    );

    const createdNotificationIds: string[] = [];
    let skipped = 0;

    for (const reminder of reminders) {
      const event = eventsById.get(reminder.event_id);
      if (!event) {
        skipped++;
        await supabase
          .from('calendar_reminders')
          .update({
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);
        continue;
      }

      const tripName = tripsById.get(event.trip_id)?.name || 'your trip';
      const timezone = timezoneByUser.get(reminder.recipient_user_id) || 'America/Los_Angeles';
      const formattedTime = formatTimeForTimezone(event.start_time, timezone);

      const title = `Reminder: ${event.title}`;
      const message = `${event.title} in ${tripName} starts at ${formattedTime}.`;

      const { data: insertedNotification, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: reminder.recipient_user_id,
          trip_id: event.trip_id,
          type: 'calendar_events',
          title,
          message,
          metadata: {
            event_id: event.id,
            event_title: event.title,
            event_time: event.start_time,
            reminder_type: reminder.reminder_type,
            trip_name: tripName,
            source: 'calendar_reminder',
          },
        })
        .select('id')
        .single();

      if (insertError || !insertedNotification?.id) {
        console.error('[event-reminders] Failed to create notification', {
          reminderId: reminder.id,
          error: insertError,
        });
        continue;
      }

      createdNotificationIds.push(insertedNotification.id);

      await supabase
        .from('calendar_reminders')
        .update({
          notification_id: insertedNotification.id,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);
    }

    let dispatchResult: unknown = null;
    if (createdNotificationIds.length > 0) {
      const secret = Deno.env.get('NOTIFICATION_DISPATCH_SECRET');
      const { data: dispatchData, error: dispatchError } = await supabase.functions.invoke(
        'dispatch-notification-deliveries',
        {
          body: {
            notificationIds: createdNotificationIds,
            limit: createdNotificationIds.length * 3,
          },
          headers: secret ? { 'x-notification-secret': secret } : undefined,
        },
      );

      if (dispatchError) {
        console.error('[event-reminders] Dispatch invoke failed:', dispatchError);
      } else {
        dispatchResult = dispatchData;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        due: reminders.length,
        notifications_created: createdNotificationIds.length,
        reminders_skipped: skipped,
        dispatch: dispatchResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[event-reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

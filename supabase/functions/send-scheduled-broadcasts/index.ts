import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { createSecureResponse, createErrorResponse } from "../_shared/securityHeaders.ts";

/**
 * Edge function to send scheduled broadcasts
 * This should be called by a cron job (e.g., Supabase Cron or external scheduler)
 * every minute to check for broadcasts that need to be sent
 */
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time (with 1 minute buffer to account for cron timing)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Find broadcasts scheduled for sending
    const { data: scheduledBroadcasts, error: fetchError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('is_sent', false)
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now.toISOString())
      .gte('scheduled_for', oneMinuteAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled broadcasts:', fetchError);
      return createErrorResponse('Failed to fetch scheduled broadcasts', 500);
    }

    if (!scheduledBroadcasts || scheduledBroadcasts.length === 0) {
      return createSecureResponse({
        success: true,
        message: 'No scheduled broadcasts to send',
        count: 0
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each scheduled broadcast
    for (const broadcast of scheduledBroadcasts) {
      try {
        // Mark as sent
        const { error: updateError } = await supabase
          .from('broadcasts')
          .update({ is_sent: true })
          .eq('id', broadcast.id);

        if (updateError) {
          throw updateError;
        }

        // Get trip members to notify
        const { data: members, error: membersError } = await supabase
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', broadcast.trip_id)
          .eq('status', 'active')
          .neq('user_id', broadcast.created_by); // Don't notify the sender

        if (membersError) {
          throw membersError;
        }

        // Send push notifications if priority warrants it
        if (broadcast.priority === 'urgent' || broadcast.priority === 'reminder') {
          if (members && members.length > 0) {
            const userIds = members.map(m => m.user_id);
            const { data: tokens } = await supabase
              .from('push_tokens')
              .select('token')
              .in('user_id', userIds);

            if (tokens && tokens.length > 0) {
              // Invoke push notification function
              const { error: pushError } = await supabase.functions.invoke('push-notifications', {
                body: {
                  action: 'send_push',
                  userId: broadcast.created_by,
                  tokens: tokens.map(t => t.token),
                  title: broadcast.priority === 'urgent' ? '🚨 Urgent Broadcast' : '📢 Scheduled Broadcast',
                  body: broadcast.message.substring(0, 100),
                  data: {
                    type: 'broadcast',
                    broadcastId: broadcast.id,
                    tripId: broadcast.trip_id,
                    url: `/trips/${broadcast.trip_id}/broadcasts`
                  }
                }
              });

              if (pushError) {
                console.warn(`Failed to send push for broadcast ${broadcast.id}:`, pushError);
              }
            }
          }
        }

        results.sent++;
      } catch (error) {
        console.error(`Error processing broadcast ${broadcast.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed++;
        results.errors.push(`Broadcast ${broadcast.id}: ${errorMessage}`);
      }
    }

    return createSecureResponse({
      success: true,
      message: `Processed ${scheduledBroadcasts.length} scheduled broadcasts`,
      results
    });

  } catch (error) {
    console.error('Error in send-scheduled-broadcasts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(errorMessage, 500);
  }
});

/**
 * Client-side tool executor for Gemini Live voice sessions.
 *
 * Voice tool calls arrive over WebSocket (not through the edge function),
 * so they must be executed directly from the client using the authenticated
 * Supabase client. RLS ensures the user has permission on the trip.
 */
import { supabase } from '@/integrations/supabase/client';

export async function executeVoiceToolCall(
  functionName: string,
  args: Record<string, unknown>,
  tripId: string,
): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || null;

  switch (functionName) {
    case 'addToCalendar': {
      const title = String(args.title || 'Untitled Event');
      const startTimeRaw = String(args.startTime || '');
      const startTime = new Date(startTimeRaw).toISOString();
      const endTime = args.endTime
        ? new Date(String(args.endTime)).toISOString()
        : new Date(new Date(startTimeRaw).getTime() + 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('trip_events').insert({
        trip_id: tripId,
        title,
        start_time: startTime,
        end_time: endTime,
        location: args.location ? String(args.location) : null,
        description: args.description ? String(args.description) : null,
        created_by: userId,
      });

      if (error) return { error: error.message };
      return { success: true, message: `Created event "${title}"` };
    }

    case 'createTask': {
      const content = String(args.content || '');

      const { error } = await supabase.from('trip_tasks').insert({
        trip_id: tripId,
        content,
        created_by: userId,
        due_date: args.dueDate ? String(args.dueDate) : null,
      });

      if (error) return { error: error.message };
      return { success: true, message: `Created task: "${content}"` };
    }

    case 'createPoll': {
      const question = String(args.question || '');
      const rawOptions = Array.isArray(args.options) ? args.options : [];
      const pollOptions = rawOptions.map((opt: unknown, i: number) => ({
        id: `opt_${i}`,
        text: String(opt),
        votes: 0,
      }));

      const { error } = await supabase.from('trip_polls').insert({
        trip_id: tripId,
        question,
        options: pollOptions,
        created_by: userId,
        status: 'active',
      });

      if (error) return { error: error.message };
      return {
        success: true,
        message: `Created poll: "${question}" with ${rawOptions.length} options`,
      };
    }

    case 'getPaymentSummary': {
      const { data: payments, error } = await supabase
        .from('trip_payment_messages')
        .select('id, amount, currency, description')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return { error: error.message };

      const list = (payments || []) as Array<{
        id: string;
        amount: number;
        currency: string;
        description: string;
      }>;
      const totalSpent = list.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        success: true,
        totalPayments: list.length,
        totalSpent,
        recentPayments: list.slice(0, 5).map(p => ({
          description: p.description,
          amount: p.amount,
        })),
      };
    }

    case 'searchPlaces': {
      const query = String(args.query || '');
      return {
        success: true,
        message: `To find "${query}", check the Places tab in the app for detailed results with maps.`,
        places: [],
      };
    }

    default:
      return { error: `Unknown tool: ${functionName}` };
  }
}

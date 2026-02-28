import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRequest } from '@/hooks/useGeminiLive';

interface UseVoiceToolHandlerOptions {
  tripId: string;
  userId: string;
}

/**
 * Client-side tool executor for Gemini Live voice tool calls.
 *
 * Handles write operations (calendar, tasks, polls) via Supabase
 * and returns stub responses for tools that need server-side APIs.
 */
export function useVoiceToolHandler({ tripId, userId }: UseVoiceToolHandlerOptions) {
  const tripIdRef = useRef(tripId);
  tripIdRef.current = tripId;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const handleToolCall = useCallback(
    async (call: ToolCallRequest): Promise<Record<string, unknown>> => {
      const { name, args } = call;
      const currentTripId = tripIdRef.current;
      const currentUserId = userIdRef.current;

      switch (name) {
        case 'addToCalendar': {
          const title = args.title as string;
          const startTime = args.startTime as string;
          const endTime = (args.endTime as string) || null;
          const location = (args.location as string) || null;
          const description = (args.description as string) || null;

          const { data, error } = await supabase
            .from('trip_events')
            .insert({
              trip_id: currentTripId,
              created_by: currentUserId,
              title,
              start_time: startTime,
              end_time: endTime,
              location,
              description,
              source_type: 'voice_concierge',
            })
            .select('id, title, start_time')
            .single();

          if (error) {
            return {
              success: false,
              error: `Could not add "${title}" to the calendar: ${error.message}`,
            };
          }
          return {
            success: true,
            actionType: 'addToCalendar',
            message: `Added "${title}" to the calendar`,
            event: { id: data.id, title: data.title, startTime: data.start_time },
          };
        }

        case 'createTask': {
          const content = args.content as string;
          const dueDate = (args.dueDate as string) || null;

          const { data, error } = await supabase
            .from('trip_tasks')
            .insert({
              trip_id: currentTripId,
              creator_id: currentUserId,
              title: content,
              due_at: dueDate,
            })
            .select('id, title')
            .single();

          if (error) {
            return {
              success: false,
              error: `Could not create task: ${error.message}`,
            };
          }
          return {
            success: true,
            actionType: 'createTask',
            message: `Created task: "${content}"`,
            task: { id: data.id, title: data.title },
          };
        }

        case 'createPoll': {
          const question = args.question as string;
          const options = (args.options as string[]) || [];

          const pollOptions = options.map((opt, idx) => ({
            id: `opt-${idx}`,
            text: opt,
            votes: 0,
          }));

          const { data, error } = await supabase
            .from('trip_polls')
            .insert({
              trip_id: currentTripId,
              created_by: currentUserId,
              question,
              options: pollOptions,
              status: 'open',
            })
            .select('id, question')
            .single();

          if (error) {
            return {
              success: false,
              error: `Could not create poll: ${error.message}`,
            };
          }
          return {
            success: true,
            actionType: 'createPoll',
            message: `Created poll: "${question}" with ${options.length} options`,
            poll: { id: data.id, question: data.question, options },
          };
        }

        case 'getPaymentSummary': {
          const { data: expenses, error } = await supabase
            .from('trip_expenses')
            .select('id, amount, description, paid_by, created_at, is_settled')
            .eq('trip_id', currentTripId)
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) {
            return {
              success: false,
              error: `Could not fetch payment summary: ${error.message}`,
            };
          }

          const total = (expenses ?? []).reduce(
            (sum: number, e: { amount: number }) => sum + (e.amount || 0),
            0,
          );
          const unsettled = (expenses ?? []).filter(
            (e: { is_settled: boolean | null }) => !e.is_settled,
          );
          const unsettledTotal = unsettled.reduce(
            (sum: number, e: { amount: number }) => sum + (e.amount || 0),
            0,
          );

          return {
            success: true,
            totalExpenses: total,
            unsettledCount: unsettled.length,
            unsettledTotal,
            recentExpenses: (expenses ?? [])
              .slice(0, 5)
              .map((e: { description: string | null; amount: number; paid_by: string | null }) => ({
                description: e.description,
                amount: e.amount,
                paidBy: e.paid_by,
              })),
          };
        }

        // Google Maps tools — return a message directing to the chat.
        // The model will still speak a useful response based on context.
        case 'searchPlaces':
          return {
            success: true,
            message: `Search noted. Voice mode has limited place search — try asking in the text chat for full results with photos and maps.`,
            places: [],
          };

        case 'getPlaceDetails':
          return {
            success: true,
            message: `For detailed place info with photos, hours, and reviews, try the text chat.`,
          };

        case 'getDirectionsETA':
          return {
            success: true,
            message: `For detailed directions with a map, try asking in the text chat. I can give you a general idea based on what I know.`,
          };

        case 'getTimezone':
          return {
            success: true,
            message: `Timezone lookup is available in the text chat.`,
          };

        case 'getStaticMapUrl':
          return {
            success: true,
            message: `Map images are displayed in the text chat. Try asking there for a visual map.`,
          };

        case 'searchWeb':
          return {
            success: true,
            message: `Web search results are best viewed in the text chat where I can show source links.`,
          };

        case 'searchImages':
          return {
            success: true,
            message: `Image search results are displayed in the text chat.`,
          };

        case 'getDistanceMatrix':
          return {
            success: true,
            message: `Distance comparisons are best viewed in the text chat.`,
          };

        case 'validateAddress':
          return {
            success: true,
            message: `Address validation is available in the text chat.`,
          };

        default:
          return {
            success: false,
            error: `Unknown tool: ${name}`,
          };
      }
    },
    [],
  );

  return { handleToolCall };
}

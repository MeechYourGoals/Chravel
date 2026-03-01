import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRequest } from '@/hooks/useGeminiLive';

interface UseVoiceToolHandlerOptions {
  tripId: string;
  userId: string;
}

/** Validate a value is a non-empty string, optionally capped at maxLen */
const requireString = (val: unknown, label: string, maxLen = 500): string => {
  if (typeof val !== 'string' || !val.trim()) {
    throw new Error(`${label} is required and must be a non-empty string`);
  }
  return val.trim().slice(0, maxLen);
};

/** Validate a value looks like an ISO-8601 datetime string */
const validateDatetime = (val: unknown, label: string): string | null => {
  if (val == null || val === '') return null;
  if (typeof val !== 'string') throw new Error(`${label} must be a date string`);
  const d = new Date(val);
  if (isNaN(d.getTime())) throw new Error(`${label} is not a valid date: "${val}"`);
  return d.toISOString();
};

/** Validate an optional string, returning null if empty */
const optionalString = (val: unknown, maxLen = 1000): string | null => {
  if (val == null || val === '') return null;
  if (typeof val !== 'string') return null;
  return val.trim().slice(0, maxLen);
};

/**
 * Client-side tool executor for Gemini Live voice tool calls.
 *
 * Handles write operations (calendar, tasks, polls) via Supabase
 * and returns stub responses for tools that need server-side APIs.
 *
 * All write tools validate inputs before touching the database to
 * prevent malformed data from voice transcription errors.
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

      // Gate: refuse writes if auth context is missing
      if (!currentUserId || !currentTripId) {
        return { success: false, error: 'Missing user or trip context — cannot execute tool' };
      }

      try {
        switch (name) {
          case 'addToCalendar': {
            const title = requireString(args.title, 'title', 200);
            const startTime = validateDatetime(args.startTime, 'startTime');
            if (!startTime) {
              return { success: false, error: 'startTime is required for calendar events' };
            }
            const endTime = validateDatetime(args.endTime, 'endTime');
            const location = optionalString(args.location, 300);
            const description = optionalString(args.description, 1000);

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
            const content = requireString(args.content ?? args.title, 'content', 300);
            const dueDate = validateDatetime(args.dueDate ?? args.due_at, 'dueDate');

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
            const question = requireString(args.question, 'question', 300);
            const rawOptions = args.options;
            if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
              return {
                success: false,
                error: 'A poll requires at least 2 options',
              };
            }
            const options = rawOptions
              .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
              .slice(0, 10)
              .map(o => o.trim().slice(0, 200));

            if (options.length < 2) {
              return {
                success: false,
                error: 'A poll requires at least 2 valid text options',
              };
            }

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
                status: 'active',
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
            const { data: payments, error } = await supabase
              .from('trip_payment_messages')
              .select('id, amount, description, created_by, created_at, is_settled')
              .eq('trip_id', currentTripId)
              .order('created_at', { ascending: false })
              .limit(20);

            if (error) {
              return {
                success: false,
                error: `Could not fetch payment summary: ${error.message}`,
              };
            }

            const rows = payments ?? [];
            const total = rows.reduce(
              (sum: number, e: { amount: number }) => sum + (Number(e.amount) || 0),
              0,
            );
            const unsettled = rows.filter((e: { is_settled: boolean | null }) => !e.is_settled);
            const unsettledTotal = unsettled.reduce(
              (sum: number, e: { amount: number }) => sum + (Number(e.amount) || 0),
              0,
            );

            return {
              success: true,
              totalExpenses: total,
              unsettledCount: unsettled.length,
              unsettledTotal,
              recentExpenses: rows
                .slice(0, 5)
                .map(
                  (e: {
                    description: string | null;
                    amount: number;
                    created_by: string | null;
                  }) => ({
                    description: e.description,
                    amount: Number(e.amount),
                    paidBy: e.created_by,
                  }),
                ),
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
      } catch (validationError) {
        // Catch validation errors from requireString / validateDatetime
        return {
          success: false,
          error:
            validationError instanceof Error ? validationError.message : 'Invalid tool arguments',
        };
      }
    },
    [],
  );

  return { handleToolCall };
}

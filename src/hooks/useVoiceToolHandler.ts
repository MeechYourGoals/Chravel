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
            // Edge function declares param as `datetime`; handle both naming conventions
            const startTime = validateDatetime(args.datetime ?? args.startTime, 'datetime');
            if (!startTime) {
              return { success: false, error: 'datetime is required for calendar events' };
            }
            const endTime = validateDatetime(args.endDatetime ?? args.endTime, 'endTime');
            const location = optionalString(args.location, 300);
            const description = optionalString(args.notes ?? args.description, 1000);

            // B4: Route to pending buffer instead of direct write
            // intentional: trip_pending_actions not yet in generated Supabase types
            const { data: pendingEvent, error: pendingError } = await (supabase as any)
              .from('trip_pending_actions')
              .insert({
                trip_id: currentTripId,
                user_id: currentUserId,
                tool_name: 'addToCalendar',
                tool_call_id: call.id || null,
                payload: {
                  title,
                  start_time: startTime,
                  end_time: endTime,
                  location,
                  description,
                  created_by: currentUserId,
                },
                source_type: 'voice_concierge',
              })
              .select('id')
              .single();

            if (pendingError) {
              return {
                success: false,
                error: `Could not queue calendar event: ${pendingError.message}`,
              };
            }
            return {
              success: true,
              actionType: 'addToCalendar',
              pending: true,
              message: `I'd like to add "${title}" to the calendar. Please confirm in the chat.`,
              pendingActionId: pendingEvent.id,
            };
          }

          case 'createTask': {
            const content = requireString(args.content ?? args.title, 'content', 300);
            const dueDate = validateDatetime(args.dueDate ?? args.due_at, 'dueDate');

            // B4: Route to pending buffer instead of direct write
            // intentional: trip_pending_actions not yet in generated Supabase types
            const { data: pendingTask, error: pendingError } = await (supabase as any)
              .from('trip_pending_actions')
              .insert({
                trip_id: currentTripId,
                user_id: currentUserId,
                tool_name: 'createTask',
                tool_call_id: call.id || null,
                payload: {
                  title: content,
                  due_at: dueDate,
                  creator_id: currentUserId,
                },
                source_type: 'voice_concierge',
              })
              .select('id')
              .single();

            if (pendingError) {
              return {
                success: false,
                error: `Could not queue task: ${pendingError.message}`,
              };
            }
            return {
              success: true,
              actionType: 'createTask',
              pending: true,
              message: `I'd like to create a task: "${content}". Please confirm in the chat.`,
              pendingActionId: pendingTask.id,
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
              voters: [],
            }));

            // B4: Route to pending buffer instead of direct write
            // intentional: trip_pending_actions not yet in generated Supabase types
            const { data: pendingPoll, error: pendingError } = await (supabase as any)
              .from('trip_pending_actions')
              .insert({
                trip_id: currentTripId,
                user_id: currentUserId,
                tool_name: 'createPoll',
                tool_call_id: call.id || null,
                payload: {
                  question,
                  options: pollOptions,
                  created_by: currentUserId,
                },
                source_type: 'voice_concierge',
              })
              .select('id')
              .single();

            if (pendingError) {
              return {
                success: false,
                error: `Could not queue poll: ${pendingError.message}`,
              };
            }
            return {
              success: true,
              actionType: 'createPoll',
              pending: true,
              message: `I'd like to create a poll: "${question}" with ${options.length} options. Please confirm in the chat.`,
              pendingActionId: pendingPoll.id,
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

          // Server-side bridge tools — execute via the execute-concierge-tool edge
          // function so voice mode returns real data that Gemini can speak aloud.
          // Includes Google Maps/Web tools and all new agentic tools.
          // RLS is enforced via the user's JWT on the edge function.
          case 'searchPlaces':
          case 'getPlaceDetails':
          case 'getDirectionsETA':
          case 'getTimezone':
          case 'getStaticMapUrl':
          case 'searchWeb':
          case 'searchImages':
          case 'getDistanceMatrix':
          case 'validateAddress':
          case 'savePlace':
          case 'setBasecamp':
          case 'addToAgenda':
          case 'searchFlights':
          case 'emitSmartImportPreview':
          case 'emitReservationDraft':
          // falls through — new agentic tools (routed through server-side functionExecutor)
          case 'updateCalendarEvent':
          case 'deleteCalendarEvent':
          case 'updateTask':
          case 'deleteTask':
          case 'searchTripData':
          case 'searchTripArtifacts':
          case 'detectCalendarConflicts':
          case 'createBroadcast':
          case 'createNotification':
          case 'getWeatherForecast':
          case 'convertCurrency':
          case 'browseWebsite':
          case 'makeReservation':
          case 'settleExpense':
          case 'generateTripImage':
          case 'setTripHeaderImage':
          case 'getDeepLink':
          case 'explainPermission':
          case 'verify_artifact': {
            const { data: toolData, error: toolError } = await supabase.functions.invoke(
              'execute-concierge-tool',
              {
                body: {
                  toolName: name,
                  args,
                  tripId: currentTripId,
                },
              },
            );

            if (toolError) {
              return {
                success: false,
                error: `Tool "${name}" failed: ${toolError.message ?? 'Unknown error'}`,
              };
            }

            // The edge function returns the tool result directly; pass it through.
            return (toolData as Record<string, unknown>) ?? { success: true };
          }

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

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRequest } from '@/hooks/useGeminiLive';
import { telemetry } from '@/telemetry/service';

interface UseVoiceToolHandlerOptions {
  tripId: string;
  userId: string;
}

/**
 * Extract idempotency key from tool call args.
 * Voice tool declarations require this field on mutating tools,
 * but the model may omit it — return undefined in that case.
 */
const extractIdempotencyKey = (args: Record<string, unknown>): string | undefined => {
  const key = args.idempotency_key;
  if (typeof key === 'string' && key.trim().length > 0) return key.trim();
  return undefined;
};

/** Tool names that perform write mutations and should be deduplicated */
const MUTATING_CLIENT_TOOLS = new Set(['addToCalendar', 'createTask', 'createPoll']);

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

  /**
   * Client-side idempotency cache.
   * Keyed by idempotency_key from tool call args.
   * Prevents duplicate writes when Gemini retries a tool call
   * (common during barge-in or connection hiccups).
   * Cleared when the session ends via resetIdempotencyCache().
   */
  const idempotencyCacheRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const handleToolCall = useCallback(
    async (call: ToolCallRequest): Promise<Record<string, unknown>> => {
      const { name, args } = call;
      const currentTripId = tripIdRef.current;
      const currentUserId = userIdRef.current;
      const toolStartMs = performance.now();

      // Gate: refuse writes if auth context is missing
      if (!currentUserId || !currentTripId) {
        return { success: false, error: 'Missing user or trip context — cannot execute tool' };
      }

      // Idempotency guard: if we've already executed this exact tool call, return cached result
      const idempotencyKey = extractIdempotencyKey(args);
      if (idempotencyKey && MUTATING_CLIENT_TOOLS.has(name)) {
        const cached = idempotencyCacheRef.current.get(idempotencyKey);
        if (cached) {
          telemetry.track('voice_tool_executed', {
            trip_id: currentTripId,
            tool_name: name,
            success: true,
            deduplicated: true,
            latency_ms: Math.round(performance.now() - toolStartMs),
          });
          return { ...cached, _deduplicated: true };
        }
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
                // DB-level dedup via partial unique index on (trip_id, idempotency_key)
                ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
              } as Record<string, unknown>)
              .select('id, title, start_time')
              .single();

            if (error) {
              return {
                success: false,
                error: `Could not add "${title}" to the calendar: ${error.message}`,
              };
            }
            const calResult = {
              success: true,
              actionType: 'addToCalendar',
              message: `Added "${title}" to the calendar`,
              event: { id: data.id, title: data.title, startTime: data.start_time },
            };
            if (idempotencyKey) idempotencyCacheRef.current.set(idempotencyKey, calResult);
            return calResult;
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
                source_type: 'voice_concierge',
                ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
              } as Record<string, unknown>)
              .select('id, title')
              .single();

            if (error) {
              return {
                success: false,
                error: `Could not create task: ${error.message}`,
              };
            }
            const taskResult = {
              success: true,
              actionType: 'createTask',
              message: `Created task: "${content}"`,
              task: { id: data.id, title: data.title },
            };
            if (idempotencyKey) idempotencyCacheRef.current.set(idempotencyKey, taskResult);
            return taskResult;
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
                source_type: 'voice_concierge',
                ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
              } as Record<string, unknown>)
              .select('id, question')
              .single();

            if (error) {
              return {
                success: false,
                error: `Could not create poll: ${error.message}`,
              };
            }
            const pollResult = {
              success: true,
              actionType: 'createPoll',
              message: `Created poll: "${question}" with ${options.length} options`,
              poll: { id: data.id, question: data.question, options },
            };
            if (idempotencyKey) idempotencyCacheRef.current.set(idempotencyKey, pollResult);
            return pollResult;
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
        telemetry.track('voice_tool_executed', {
          trip_id: currentTripId,
          tool_name: name,
          success: false,
          deduplicated: false,
          latency_ms: Math.round(performance.now() - toolStartMs),
        });
        return {
          success: false,
          error:
            validationError instanceof Error ? validationError.message : 'Invalid tool arguments',
        };
      }
    },
    [],
  );

  /** Clear the idempotency cache — call when a voice session ends. */
  const resetIdempotencyCache = useCallback(() => {
    idempotencyCacheRef.current.clear();
  }, []);

  return { handleToolCall, resetIdempotencyCache };
}

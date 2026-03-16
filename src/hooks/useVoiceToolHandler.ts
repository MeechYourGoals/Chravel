import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRequest } from '@/hooks/useGeminiLive';

interface UseVoiceToolHandlerOptions {
  tripId: string;
  userId: string;
}

/** Bridge Gemini Live tool calls to the shared server-side concierge executor. */
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
        const normalizedArgs =
          args && typeof args === 'object' && !Array.isArray(args)
            ? { ...(args as Record<string, unknown>) }
            : {};
        if (call.id && typeof normalizedArgs.idempotency_key !== 'string') {
          normalizedArgs.idempotency_key = call.id;
        }

        const { data: toolData, error: toolError } = await supabase.functions.invoke(
          'execute-concierge-tool',
          {
            body: {
              toolName: name,
              args: normalizedArgs,
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

        return (toolData as Record<string, unknown>) ?? { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed',
        };
      }
    },
    [],
  );

  return { handleToolCall };
}

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ToolCallRequest } from '@/hooks/useGeminiLive';

interface UseVoiceToolHandlerOptions {
  tripId: string;
  userId: string;
}

const normalizeArgs = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to the empty-object default below.
    }
  }

  return {};
};

/**
 * Voice tool executor for Gemini Live function calls.
 *
 * The text concierge already has a single hardened execution path on the server,
 * so live mode reuses that same edge function for parity instead of maintaining
 * a divergent client-only tool implementation.
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
        const { data: toolData, error: toolError } = await supabase.functions.invoke(
          'execute-concierge-tool',
          {
            body: {
              toolName: name,
              args: normalizeArgs(args),
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
          error: error instanceof Error ? error.message : `Tool "${name}" failed`,
        };
      }
    },
    [],
  );

  return { handleToolCall };
}

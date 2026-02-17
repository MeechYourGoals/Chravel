import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export const CONCIERGE_FUNCTION_NAME = 'lovable-concierge';
export const DEMO_CONCIERGE_FUNCTION_NAME = 'demo-concierge';

export interface ConciergeInvokeBody extends Record<string, unknown> {
  message: string;
}

export interface ConciergeInvokeResponse {
  response?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sources?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    source?: string;
  }>;
  citations?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    source?: string;
  }>;
  googleMapsWidget?: string | null;
  status?: string;
  [key: string]: unknown;
}

export interface ConciergeInvokeOptions {
  demoMode?: boolean;
}

// ========== SSE STREAMING TYPES ==========

export interface StreamChunkEvent {
  type: 'chunk';
  text: string;
}

export interface StreamFunctionCallEvent {
  type: 'function_call';
  name: string;
  result: Record<string, unknown>;
}

export interface StreamMetadataEvent {
  type: 'metadata';
  usage?: ConciergeInvokeResponse['usage'];
  sources?: ConciergeInvokeResponse['sources'];
  googleMapsWidget?: string | null;
  model?: string;
  functionCalls?: string[];
}

export interface StreamErrorEvent {
  type: 'error';
  message: string;
}

export interface StreamDoneEvent {
  type: 'done';
}

export type ConciergeStreamEvent =
  | StreamChunkEvent
  | StreamFunctionCallEvent
  | StreamMetadataEvent
  | StreamErrorEvent
  | StreamDoneEvent;

export interface ConciergeStreamCallbacks {
  onChunk: (text: string) => void;
  onMetadata: (metadata: StreamMetadataEvent) => void;
  onFunctionCall?: (name: string, result: Record<string, unknown>) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export async function invokeConcierge(
  body: ConciergeInvokeBody,
  options: ConciergeInvokeOptions = {},
): Promise<{ data: ConciergeInvokeResponse | null; error: { message?: string } | null }> {
  const functionName = options.demoMode ? DEMO_CONCIERGE_FUNCTION_NAME : CONCIERGE_FUNCTION_NAME;
  return supabase.functions.invoke<ConciergeInvokeResponse>(functionName, {
    body,
  });
}

/**
 * Invoke the concierge with streaming enabled. Uses a raw fetch call because
 * supabase.functions.invoke does not support ReadableStream responses.
 *
 * The edge function returns Server-Sent Events when `stream: true` is in the
 * request body. Each SSE `data:` line contains a JSON-encoded event.
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function invokeConciergeStream(
  body: ConciergeInvokeBody,
  callbacks: ConciergeStreamCallbacks,
  options: ConciergeInvokeOptions = {},
): { abort: () => void } {
  const abortController = new AbortController();

  // Fire-and-forget the async read loop; errors are routed through callbacks.
  (async () => {
    try {
      // Get the current session token for auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        callbacks.onError('Not authenticated');
        callbacks.onDone();
        return;
      }

      const functionName = options.demoMode
        ? DEMO_CONCIERGE_FUNCTION_NAME
        : CONCIERGE_FUNCTION_NAME;

      const url = `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_PUBLIC_ANON_KEY,
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        await response.text().catch(() => '');
        callbacks.onError('AI service temporarily unavailable. Please try again.');
        callbacks.onDone();
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      // If the server did not return SSE (e.g. Lovable fallback), parse as JSON
      if (!contentType.includes('text/event-stream')) {
        const data = (await response.json()) as ConciergeInvokeResponse;
        if (data.response) {
          callbacks.onChunk(data.response);
        }
        callbacks.onMetadata({
          type: 'metadata',
          usage: data.usage,
          sources: data.sources || data.citations,
          googleMapsWidget: data.googleMapsWidget,
        });
        callbacks.onDone();
        return;
      }

      // Parse the SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines (SSE event boundary)
        const parts = buffer.split('\n\n');
        // The last element may be an incomplete event — keep it in the buffer
        buffer = parts.pop() || '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6);
            if (!jsonStr.trim()) continue;

            let event: ConciergeStreamEvent;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            switch (event.type) {
              case 'chunk':
                callbacks.onChunk(event.text);
                break;
              case 'metadata':
                callbacks.onMetadata(event);
                break;
              case 'function_call':
                callbacks.onFunctionCall?.(event.name, event.result);
                break;
              case 'error':
                callbacks.onError(event.message);
                break;
              case 'done':
                callbacks.onDone();
                return;
            }
          }
        }
      }

      // Stream ended without an explicit done event — still call onDone
      callbacks.onDone();
    } catch (err) {
      if (abortController.signal.aborted) return;
      callbacks.onError(err instanceof Error ? err.message : 'Stream connection failed');
      callbacks.onDone();
    }
  })();

  return { abort: () => abortController.abort() };
}

export async function pingConcierge() {
  return invokeConcierge({ message: 'ping' });
}

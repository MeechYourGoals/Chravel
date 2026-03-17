interface EdgeFunctionErrorLike {
  message?: string;
  context?: unknown;
}

interface EdgeFunctionErrorBody {
  error?: string;
  message?: string;
}

const hasJson = (value: unknown): value is { json: () => Promise<unknown> } =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as { json?: unknown }).json === 'function';

const isEdgeFunctionErrorBody = (value: unknown): value is EdgeFunctionErrorBody =>
  Boolean(value) && typeof value === 'object';

/**
 * Extract user-meaningful error messages from Supabase Edge Function invoke failures.
 * Handles generic non-2xx wrapper errors by parsing `error.context` response bodies.
 */
export const extractEdgeFunctionErrorMessage = async (
  error: EdgeFunctionErrorLike,
  fallback: string,
): Promise<string> => {
  if (!error) return fallback;

  if (error.context) {
    try {
      const rawBody = hasJson(error.context) ? await error.context.json() : error.context;
      if (isEdgeFunctionErrorBody(rawBody)) {
        const contextMessage = rawBody.error || rawBody.message;
        if (contextMessage && contextMessage.trim().length > 0) {
          return contextMessage;
        }
      }
    } catch {
      // Response body may be non-JSON or already consumed.
    }
  }

  const message = error.message?.trim();
  if (!message) return fallback;

  // Supabase wrapper message for non-2xx responses is not user-actionable.
  if (message.includes('Edge Function returned a non-2xx status code')) {
    return fallback;
  }

  return message;
};

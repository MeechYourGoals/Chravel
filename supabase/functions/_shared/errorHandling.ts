import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Sanitizes error messages for client responses while logging full details server-side
 * Prevents information disclosure of internal implementation details
 */
export function sanitizeErrorForClient(error: unknown): string {
  // Always log full error server-side for debugging
  console.error('[EDGE_FUNCTION_ERROR]', {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle Zod validation errors with field-level details but no schema info
  if (error instanceof z.ZodError) {
    const fieldErrors = error.errors.map(e => e.path.join('.')).join(', ');
    return `Invalid request data${fieldErrors ? `: ${fieldErrors}` : ''}. Please check your input.`;
  }

  // Map known error patterns to safe, user-friendly messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Authentication errors
    if (message.includes('jwt') || message.includes('token') || message.includes('auth')) {
      return 'Authentication failed. Please sign in again.';
    }

    // Authorization errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'You do not have permission to perform this action.';
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'The requested resource was not found.';
    }

    // Database errors (hide all implementation details)
    if (
      message.includes('relation') ||
      message.includes('column') ||
      message.includes('constraint')
    ) {
      return 'A database error occurred. Please try again.';
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many requests. Please slow down and try again later.';
    }

    // API errors (external services)
    if (message.includes('api error') || message.includes('external service')) {
      return 'An external service error occurred. Please try again later.';
    }

    // Validation errors (specific but not revealing schema)
    if (
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('missing')
    ) {
      return 'Invalid input provided. Please check your data and try again.';
    }
  }

  // Default generic error message
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Enhanced error response creator that sanitizes errors
 */
export function createSanitizedErrorResponse(
  error: unknown,
  status: number = 500,
  corsHeaders: Record<string, string> = {},
): Response {
  const sanitizedMessage = sanitizeErrorForClient(error);

  return new Response(JSON.stringify({ error: sanitizedMessage }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Type-safe error logger that structures error information
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): void {
  console.error(`[${context}]`, {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    metadata,
    timestamp: new Date().toISOString(),
  });
}

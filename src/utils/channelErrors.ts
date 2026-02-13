/**
 * Channel-specific error mapping utilities.
 *
 * Maps raw Supabase / network errors into user-friendly toast messages.
 * In development builds, extra technical detail is appended for debugging.
 */

const isDev = import.meta.env.DEV;

/** Structured error returned from channel operations */
export interface ChannelOperationError {
  /** User-facing title for the toast */
  title: string;
  /** User-facing description */
  description: string;
  /** The raw Supabase/network error for logging */
  raw?: unknown;
}

/**
 * Categorise a Supabase error (or generic JS error) and return a
 * user-friendly message suitable for a toast notification.
 */
export function mapChannelSendError(error: unknown): ChannelOperationError {
  // Supabase errors are objects with code / message / details
  const code = (error as { code?: string })?.code ?? '';
  const message = (error as { message?: string })?.message ?? '';
  const details = (error as { details?: string })?.details ?? '';
  const status = (error as { status?: number })?.status;

  // Combine for pattern matching
  const combined = `${code} ${message} ${details}`.toLowerCase();

  // --- Permission / RLS errors ---
  if (
    combined.includes('row-level security') ||
    combined.includes('permission denied') ||
    combined.includes('new row violates') ||
    code === '42501' ||
    code === '42000'
  ) {
    return {
      title: 'Cannot send message',
      description: "You don't have access to post in this channel yet.",
      raw: error,
    };
  }

  // --- Channel not found / deleted ---
  if (
    combined.includes('violates foreign key') ||
    combined.includes('not present in table') ||
    code === '23503'
  ) {
    return {
      title: 'Channel unavailable',
      description: 'This channel no longer exists or has been archived.',
      raw: error,
    };
  }

  // --- Not null / validation constraints ---
  if (code === '23502' || combined.includes('null value in column')) {
    return {
      title: 'Invalid message',
      description: 'The message could not be sent — some required data was missing.',
      raw: error,
    };
  }

  // --- Network / timeout errors ---
  if (
    combined.includes('fetch') ||
    combined.includes('networkerror') ||
    combined.includes('timeout') ||
    combined.includes('aborted') ||
    combined.includes('econnrefused') ||
    status === 0 ||
    (error instanceof TypeError && message.includes('fetch'))
  ) {
    return {
      title: 'Connection issue',
      description: "Couldn't reach the server. Check your connection and try again.",
      raw: error,
    };
  }

  // --- Rate limit ---
  if (status === 429 || combined.includes('rate limit')) {
    return {
      title: 'Slow down',
      description: "You're sending messages too quickly. Wait a moment and try again.",
      raw: error,
    };
  }

  // --- Generic fallback ---
  return {
    title: 'Message failed to send',
    description: 'Something went wrong. Please try again.',
    raw: error,
  };
}

/**
 * Format the description for a toast.
 * In DEV mode, appends the raw code+message for debugging.
 */
export function formatToastDescription(mapped: ChannelOperationError): string {
  if (!isDev || !mapped.raw) return mapped.description;

  const code = (mapped.raw as { code?: string })?.code ?? '';
  const message = (mapped.raw as { message?: string })?.message ?? '';
  const devSuffix = code || message ? ` (code: ${code || '?'}, msg: ${message || '?'})` : '';
  return `${mapped.description}${devSuffix}`;
}

/**
 * Validates message content before sending.
 * Returns a ChannelOperationError if invalid, or null if OK.
 */
export function validateMessageContent(content: string): ChannelOperationError | null {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      title: 'Empty message',
      description: "Message can't be empty.",
    };
  }

  if (trimmed.length > 5000) {
    return {
      title: 'Message too long',
      description: 'Please keep your message under 5000 characters.',
    };
  }

  return null;
}

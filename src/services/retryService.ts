import { errorHandlingService, ErrorContext } from './errorHandlingService';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  backoff: true,
  onRetry: () => {},
  shouldRetry: (error) => {
    // Don't retry on validation errors or auth errors
    if (error?.code === 'VALIDATION_ERROR' || error?.code === 'AUTH_ERROR') {
      return false;
    }
    // Retry on network errors, timeouts, 5xx errors
    return true;
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!opts.shouldRetry(error)) {
        console.log('[Retry] Error not retryable, aborting');
        throw error;
      }

      // Check if this was the last attempt
      if (attempt === opts.maxRetries) {
        console.error('[Retry] Max retries reached', { attempt, error, context });
        break;
      }

      // Calculate delay with exponential backoff
      const delay = opts.backoff 
        ? opts.delayMs * Math.pow(2, attempt)
        : opts.delayMs;

      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${delay}ms`, {
        error: error?.message || String(error),
        context,
      });

      opts.onRetry(attempt + 1, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  errorHandlingService.handleError(lastError, context);
  throw lastError;
}

/**
 * Wrap a service function with retry logic
 */
export function withRetryWrapper<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: ErrorContext,
  options?: RetryOptions
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    return withRetry(() => fn(...args), context, options);
  };
}

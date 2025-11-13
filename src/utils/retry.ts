/**
 * Retry utility with exponential backoff
 *
 * Automatically retries failed async operations with increasing delays
 * between attempts to handle transient network failures gracefully.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Callback fired on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
  /** Callback fired when all retries are exhausted */
  onFailure?: (error: Error) => void;
}

/**
 * Retries an async function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries fail
 *
 * @example
 * ```ts
 * const data = await retryWithBackoff(
 *   async () => await fetchData(),
 *   {
 *     maxRetries: 3,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt} due to:`, error.message);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
    onFailure
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If we've exhausted all retries, throw the error
      if (attempt >= maxRetries) {
        if (onFailure) {
          onFailure(lastError);
        }
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      // Notify caller of retry attempt
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Checks if an error is retryable
 * Network errors, timeouts, and 5xx server errors are retryable
 * 4xx client errors are not retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.message?.includes('timeout')) {
    return true;
  }

  // HTTP status codes
  if (error.status || error.code) {
    const status = error.status || error.code;
    // Retry on 5xx server errors and 429 (rate limit)
    if (status >= 500 || status === 429) {
      return true;
    }
    // Don't retry on 4xx client errors (except 429)
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Retry with conditional logic - only retry if error is retryable
 */
export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    onRetry: (attempt, error) => {
      if (!isRetryableError(error)) {
        if (import.meta.env.DEV) {
          console.warn('Error is not retryable, skipping retry:', error);
        }
        throw error;
      }
      if (options.onRetry) {
        options.onRetry(attempt, error);
      }
    }
  });
}

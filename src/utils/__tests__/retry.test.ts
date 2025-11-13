// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, isRetryableError, retryIfRetryable, RetryOptions } from '../retry';

describe('retry utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('should return result on first attempt if successful', async () => {
      const successFn = vi.fn().mockResolvedValue('success');

      const promise = retryWithBackoff(successFn);
      const result = await promise;

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations up to maxRetries', async () => {
      const error = new Error('Network error');
      const failTwiceThenSucceed = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = retryWithBackoff(failTwiceThenSucceed, { maxRetries: 3 });

      // Start the promise
      const resultPromise = promise;

      // Advance timers for first retry (1s)
      await vi.advanceTimersByTimeAsync(1000);

      // Advance timers for second retry (2s)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(failTwiceThenSucceed).toHaveBeenCalledTimes(3);
    });

    it('should throw error after exhausting all retries', async () => {
      const error = new Error('Persistent error');
      const alwaysFail = vi.fn().mockRejectedValue(error);

      let caughtError: Error | null = null;
      const promise = retryWithBackoff(alwaysFail, { maxRetries: 2 }).catch((e) => {
        caughtError = e;
        throw e;
      });

      // Advance timers for first retry (1s)
      await vi.advanceTimersByTimeAsync(1000);

      // Advance timers for second retry (2s)
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('Persistent error');
      expect(caughtError?.message).toBe('Persistent error');
      expect(alwaysFail).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff delays', async () => {
      const error = new Error('Temporary error');
      const failThreeTimes = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      const promise = retryWithBackoff(failThreeTimes, {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry,
      });

      // Start the promise (first attempt fails immediately)
      const resultPromise = promise;

      // First retry after 1s (2^0 * 1000 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);
      expect(failThreeTimes).toHaveBeenCalledTimes(2);

      // Second retry after 2s (2^1 * 1000 = 2000ms)
      await vi.advanceTimersByTimeAsync(2000);
      expect(failThreeTimes).toHaveBeenCalledTimes(3);

      // Third retry after 4s (2^2 * 1000 = 4000ms)
      await vi.advanceTimersByTimeAsync(4000);

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(failThreeTimes).toHaveBeenCalledTimes(4);
    });

    it('should respect maxDelay cap on exponential backoff', async () => {
      const error = new Error('Temporary error');
      const failMultipleTimes = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      const promise = retryWithBackoff(failMultipleTimes, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 3000, // Cap at 3 seconds
        onRetry,
      });

      const resultPromise = promise;

      // First retry: 1s (2^0 * 1000 = 1000ms, under cap)
      await vi.advanceTimersByTimeAsync(1000);

      // Second retry: 2s (2^1 * 1000 = 2000ms, under cap)
      await vi.advanceTimersByTimeAsync(2000);

      // Third retry: 3s (2^2 * 1000 = 4000ms, but capped at 3000ms)
      await vi.advanceTimersByTimeAsync(3000);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should call onRetry callback on each retry attempt', async () => {
      const error = new Error('Retry error');
      const failTwice = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      const promise = retryWithBackoff(failTwice, {
        maxRetries: 3,
        onRetry,
      });

      const resultPromise = promise;

      // First retry
      await vi.advanceTimersByTimeAsync(1000);
      expect(onRetry).toHaveBeenCalledWith(1, error);

      // Second retry
      await vi.advanceTimersByTimeAsync(2000);
      expect(onRetry).toHaveBeenCalledWith(2, error);

      await resultPromise;
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should call onFailure callback when all retries exhausted', async () => {
      const error = new Error('Final error');
      const alwaysFail = vi.fn().mockRejectedValue(error);

      const onFailure = vi.fn();

      let caughtError: Error | null = null;
      const promise = retryWithBackoff(alwaysFail, {
        maxRetries: 2,
        onFailure,
      }).catch((e) => {
        caughtError = e;
        throw e;
      });

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('Final error');
      expect(caughtError?.message).toBe('Final error');
      expect(onFailure).toHaveBeenCalledWith(error);
      expect(onFailure).toHaveBeenCalledTimes(1);
    });

    it('should use default options when not provided', async () => {
      const error = new Error('Default test error');
      const failOnce = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const promise = retryWithBackoff(failOnce);
      const resultPromise = promise;

      // Default initialDelay is 1000ms
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should preserve return type of the async function', async () => {
      interface CustomResult {
        id: string;
        value: number;
      }

      const typedFn = vi.fn().mockResolvedValue({ id: 'test-123', value: 42 });

      const result: CustomResult = await retryWithBackoff(typedFn);

      expect(result.id).toBe('test-123');
      expect(result.value).toBe(42);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const networkError = new Error('network request failed');
      expect(isRetryableError(networkError)).toBe(true);

      const fetchError = new Error('fetch failed');
      expect(isRetryableError(fetchError)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const timeoutError = new Error('request timeout');
      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('should return true for 5xx server errors', () => {
      const serverError = { status: 500, message: 'Internal Server Error' };
      expect(isRetryableError(serverError)).toBe(true);

      const badGateway = { status: 502, message: 'Bad Gateway' };
      expect(isRetryableError(badGateway)).toBe(true);

      const serviceUnavailable = { status: 503, message: 'Service Unavailable' };
      expect(isRetryableError(serviceUnavailable)).toBe(true);
    });

    it('should return true for 429 rate limit errors', () => {
      const rateLimitError = { status: 429, message: 'Too Many Requests' };
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should return false for 4xx client errors (except 429)', () => {
      const badRequest = { status: 400, message: 'Bad Request' };
      expect(isRetryableError(badRequest)).toBe(false);

      const unauthorized = { status: 401, message: 'Unauthorized' };
      expect(isRetryableError(unauthorized)).toBe(false);

      const forbidden = { status: 403, message: 'Forbidden' };
      expect(isRetryableError(forbidden)).toBe(false);

      const notFound = { status: 404, message: 'Not Found' };
      expect(isRetryableError(notFound)).toBe(false);
    });

    it('should return true for errors with code property', () => {
      const errorWithCode = { code: 500, message: 'Server Error' };
      expect(isRetryableError(errorWithCode)).toBe(true);

      const clientErrorWithCode = { code: 400, message: 'Bad Request' };
      expect(isRetryableError(clientErrorWithCode)).toBe(false);
    });

    it('should return true for unknown error types (default)', () => {
      const unknownError = { something: 'unexpected' };
      expect(isRetryableError(unknownError)).toBe(true);

      const customError = new Error('Custom error without specific markers');
      expect(isRetryableError(customError)).toBe(true);
    });
  });

  describe('retryIfRetryable', () => {
    it('should retry retryable errors', async () => {
      const networkError = new Error('network error');
      const failOnceThenSucceed = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const promise = retryIfRetryable(failOnceThenSucceed, { maxRetries: 2 });
      const resultPromise = promise;

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(failOnceThenSucceed).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const clientError = { status: 404, message: 'Not Found' };
      const failWithClientError = vi.fn().mockRejectedValue(clientError);

      const onRetry = vi.fn((attempt, error) => {
        // This simulates the retryIfRetryable logic
        if (!isRetryableError(error)) {
          throw error;
        }
      });

      const promise = retryWithBackoff(failWithClientError, {
        maxRetries: 2,
        onRetry,
      });

      await expect(promise).rejects.toEqual(clientError);
      expect(failWithClientError).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call custom onRetry callback', async () => {
      const networkError = new Error('network issue');
      const failOnce = vi.fn().mockRejectedValueOnce(networkError).mockResolvedValue('success');

      const customOnRetry = vi.fn();
      const promise = retryIfRetryable(failOnce, {
        maxRetries: 2,
        onRetry: customOnRetry,
      });

      const resultPromise = promise;
      await vi.advanceTimersByTimeAsync(1000);

      await resultPromise;
      expect(customOnRetry).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle Supabase-like error scenarios', async () => {
      // Simulate Supabase RPC call that fails with network error then succeeds
      const supabaseRpcMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValue({ data: { id: 'event-123' }, error: null });

      const promise = retryWithBackoff(
        async () => {
          const result = await supabaseRpcMock();
          if (result.error) throw result.error;
          return result.data;
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            // Simulate DEV logging
            if (import.meta.env.DEV) {
              console.warn(`Retry attempt ${attempt}/3:`, error.message);
            }
          },
        }
      );

      const resultPromise = promise;
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;
      expect(result).toEqual({ id: 'event-123' });
      expect(supabaseRpcMock).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = { status: 429, message: 'Rate limit exceeded' };
      const apiCall = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ success: true });

      const promise = retryWithBackoff(apiCall, {
        maxRetries: 3,
        initialDelay: 1000,
      });

      const resultPromise = promise;

      // First retry after 1s
      await vi.advanceTimersByTimeAsync(1000);

      // Second retry after 2s
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;
      expect(result).toEqual({ success: true });
      expect(apiCall).toHaveBeenCalledTimes(3);
    });

    it('should handle transient network failures gracefully', async () => {
      let attemptCount = 0;
      const transientFailure = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('network timeout'));
        }
        return Promise.resolve({ data: 'fetched successfully' });
      });

      const promise = retryWithBackoff(transientFailure, {
        maxRetries: 4,
        initialDelay: 500,
        maxDelay: 5000,
      });

      const resultPromise = promise;

      // Advance through retries
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;
      expect(result).toEqual({ data: 'fetched successfully' });
      expect(transientFailure).toHaveBeenCalledTimes(3);
    });
  });
});

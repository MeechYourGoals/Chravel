import { useState, useCallback } from 'react';
import { errorTracking } from '@/services/errorTracking';
import { useToast } from '@/hooks/use-toast';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryableMutationResult<T> {
  execute: (...args: any[]) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  reset: () => void;
}

/**
 * Hook for executing mutations with automatic retry logic
 *
 * Usage:
 * ```ts
 * const { execute, isLoading, error, retryCount } = useRetryableMutation(
 *   async (fileId: string) => {
 *     return await uploadFile(fileId);
 *   },
 *   {
 *     maxRetries: 3,
 *     retryDelay: 1000,
 *     backoffMultiplier: 2
 *   }
 * );
 *
 * await execute('file123');
 * ```
 */
export function useRetryableMutation<T>(
  mutationFn: (...args: any[]) => Promise<T>,
  config: RetryConfig = {},
): RetryableMutationResult<T> {
  const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2, onRetry } = config;

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          errorTracking.addBreadcrumb({
            category: 'api-call',
            message: `Mutation attempt ${attempt + 1}/${maxRetries + 1}`,
            level: 'info',
            data: { args: args.slice(0, 2) },
          });

          const result = await mutationFn(...args);

          setIsLoading(false);
          setRetryCount(attempt);

          if (attempt > 0) {
            toast({
              title: 'Success',
              description: `Operation succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`,
            });
          }

          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          errorTracking.captureException(lastError, {
            context: 'RetryableMutation',
            additionalData: {
              attempt: attempt + 1,
              maxRetries,
              willRetry: attempt < maxRetries,
            },
          });

          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(backoffMultiplier, attempt);

            if (onRetry) {
              onRetry(attempt + 1, lastError);
            }

            toast({
              title: 'Retrying...',
              description: `Attempt ${attempt + 1} failed. Retrying in ${delay / 1000}s`,
              variant: 'default',
            });

            await sleep(delay);
            attempt++;
            setRetryCount(attempt);
          } else {
            break;
          }
        }
      }

      // All retries exhausted
      setIsLoading(false);
      setError(lastError);
      setRetryCount(maxRetries);

      toast({
        title: 'Operation Failed',
        description: `Failed after ${maxRetries} ${maxRetries === 1 ? 'retry' : 'retries'}. Please try again later.`,
        variant: 'destructive',
      });

      throw lastError;
    },
    [mutationFn, maxRetries, retryDelay, backoffMultiplier, onRetry, toast],
  );

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    retryCount,
    reset,
  };
}

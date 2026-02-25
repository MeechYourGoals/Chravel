import { useState, useCallback } from 'react';
import { errorHandlingService, ErrorContext } from '@/services/errorHandlingService';
import { withRetry, RetryOptions } from '@/services/retryService';

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  retryOptions?: RetryOptions;
  context?: ErrorContext;
}

export const useAsyncOperation = <T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {},
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      setError(null);

      try {
        let result: T;

        if (options.retryOptions) {
          // Execute with retry logic
          result = await withRetry(() => operation(...args), options.context, options.retryOptions);
        } else {
          // Execute directly
          result = await operation(...args);
        }

        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        setError(err);
        errorHandlingService.handleError(err, options.context);
        options.onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [operation, options],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
};

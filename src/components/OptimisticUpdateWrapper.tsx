import { useState, useCallback, ReactNode } from 'react';
import { errorTracking } from '@/services/errorTracking';

interface OptimisticUpdateConfig<T, TResult = void> {
  onMutate: (variables: T) => void;
  onSuccess?: (data: TResult, variables: T) => void;
  onError: (error: Error, variables: T) => void;
  mutationFn: (variables: T) => Promise<TResult>;
}

/**
 * Higher-order component for optimistic UI updates
 *
 * Usage:
 * ```tsx
 * const { execute, isLoading } = useOptimisticUpdate({
 *   onMutate: (newMember) => {
 *     setMembers(prev => [...prev, newMember]);
 *   },
 *   onError: (error, newMember) => {
 *     setMembers(prev => prev.filter(m => m.id !== newMember.id));
 *   },
 *   mutationFn: async (newMember) => {
 *     return await inviteMember(newMember);
 *   }
 * });
 *
 * await execute(newMemberData);
 * ```
 */
export function useOptimisticUpdate<T, TResult = void>(config: OptimisticUpdateConfig<T, TResult>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (variables: T): Promise<TResult | undefined> => {
      setIsLoading(true);
      setError(null);

      // Apply optimistic update immediately
      try {
        config.onMutate(variables);
      } catch (mutateError) {
        const err = mutateError instanceof Error ? mutateError : new Error(String(mutateError));
        errorTracking.captureException(err, {
          context: 'OptimisticUpdate:onMutate',
        });
      }

      try {
        // Execute actual mutation
        const result = await config.mutationFn(variables);

        // Call success handler
        if (config.onSuccess) {
          config.onSuccess(result, variables);
        }

        setIsLoading(false);
        return result;
      } catch (mutationError) {
        const err =
          mutationError instanceof Error ? mutationError : new Error(String(mutationError));

        // Revert optimistic update
        config.onError(err, variables);

        // Track error
        errorTracking.captureException(err, {
          context: 'OptimisticUpdate:mutation',
          additionalData: { variables },
        });

        setError(err);
        setIsLoading(false);
        throw err;
      }
    },
    [config],
  );

  return {
    execute,
    isLoading,
    error,
    reset: () => {
      setError(null);
      setIsLoading(false);
    },
  };
}

/**
 * Component wrapper for optimistic updates
 */
interface OptimisticUpdateWrapperProps<T> {
  children: (props: {
    execute: (variables: T) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
  }) => ReactNode;
  config: OptimisticUpdateConfig<T>;
}

export function OptimisticUpdateWrapper<T>({ children, config }: OptimisticUpdateWrapperProps<T>) {
  const { execute, isLoading, error } = useOptimisticUpdate(config);

  return <>{children({ execute, isLoading, error })}</>;
}

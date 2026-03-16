import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance defaults - individual queries can override
      staleTime: 30 * 1000, // 30 seconds - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache after unmount
      refetchOnWindowFocus: false, // Disable aggressive refetching
      refetchOnReconnect: 'always', // But refetch when reconnecting
      retry: 1, // Single retry on failure
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

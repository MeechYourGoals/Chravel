/**
 * Centralized Query Key Factory
 * 
 * Ensures consistent query keys across the application for:
 * - Cache invalidation
 * - Prefetching
 * - Query deduplication
 * 
 * @see https://tanstack.com/query/latest/docs/framework/react/community/lukemorales-query-key-factory
 */

export const tripKeys = {
  // Base keys
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  
  // Trip detail
  detail: (tripId: string) => ['trip', tripId] as const,
  members: (tripId: string) => ['trip-members', tripId] as const,
  
  // Tab-specific data
  chat: (tripId: string) => ['tripChat', tripId] as const,
  chatMessages: (tripId: string, limit?: number) => 
    limit ? ['tripChatMessages', tripId, limit] as const : ['tripChatMessages', tripId] as const,
  calendar: (tripId: string) => ['calendarEvents', tripId] as const,
  tasks: (tripId: string, isDemoMode?: boolean) => 
    isDemoMode !== undefined ? ['tripTasks', tripId, isDemoMode] as const : ['tripTasks', tripId] as const,
  polls: (tripId: string) => ['tripPolls', tripId] as const,
  media: (tripId: string) => ['tripMedia', tripId] as const,
  places: (tripId: string) => ['tripPlaces', tripId] as const,
  payments: (tripId: string) => ['tripPayments', tripId] as const,
  paymentBalances: (tripId: string, userId: string) => ['tripPaymentBalances', tripId, userId] as const,
  broadcasts: (tripId: string) => ['tripBroadcasts', tripId] as const,
  
  // Pro-specific
  roster: (tripId: string) => ['tripRoster', tripId] as const,
  channels: (tripId: string) => ['tripChannels', tripId] as const,
  
  // Event-specific  
  agenda: (tripId: string) => ['eventAgenda', tripId] as const,
  lineup: (tripId: string) => ['eventLineup', tripId] as const,
  rsvps: (tripId: string) => ['eventRsvps', tripId] as const,
};

/**
 * Standard cache configuration for trip-related queries
 * 
 * staleTime: How long data is considered fresh (no background refetch)
 * gcTime: How long to keep data in cache after all observers unmount
 */
export const QUERY_CACHE_CONFIG = {
  // Trip detail - stable data, refresh on focus
  trip: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },
  
  // Members - moderately stable
  members: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  },
  
  // Chat - real-time, but cache for tab switching
  chat: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false, // Real-time handles updates
  },
  
  // Calendar events - stable, rarely change
  calendar: {
    staleTime: 60 * 1000, // 1 minute  
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  },
  
  // Tasks - moderate change frequency
  tasks: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },
  
  // Polls - stable
  polls: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },
  
  // Media - stable, large data
  media: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  },
  
  // Payments - sensitive, verify often
  payments: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },

  // Payment balances - computed from payments, cache for tab switching
  paymentBalances: {
    staleTime: 30 * 1000, // 30 seconds (matches payments)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },
  
  // Places - stable
  places: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  },
} as const;

/**
 * Prefetch priorities - which data to prefetch first
 * Lower number = higher priority
 */
export const PREFETCH_PRIORITY = {
  members: 1,     // Needed for UI rendering
  chat: 2,        // Most common first tab
  calendar: 3,    // Frequently accessed
  tasks: 4,       // Less frequent
  polls: 5,       // Less frequent
  media: 6,       // Heavy, defer
  payments: 7,    // Heavy, defer
  places: 8,      // Heavy, defer
} as const;

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ConsumerSubscriptionProvider } from '@/hooks/useConsumerSubscription';

// Create a test query client with default options
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Renamed from cacheTime in TanStack Query v5
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Custom render function that includes all providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ConsumerSubscriptionProvider>{children}</ConsumerSubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create mock trip data
 */
export const createMockTrip = (overrides = {}) => ({
  id: 'trip-123',
  name: 'Test Trip',
  destination: 'Paris',
  start_date: '2024-01-01',
  end_date: '2024-01-07',
  trip_type: 'consumer',
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Create mock user profile
 */
export const createMockUserProfile = (overrides = {}) => ({
  id: 'user-123',
  user_id: 'user-123',
  display_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  show_email: true,
  show_phone: false,
  ...overrides,
});

/**
 * Create mock chat message
 */
export const createMockChatMessage = (overrides = {}) => ({
  id: 'msg-123',
  trip_id: 'trip-123',
  content: 'Test message',
  created_by: 'user-123',
  created_at: '2024-01-01T10:00:00Z',
  message_type: 'message',
  author_name: 'Test User',
  ...overrides,
});

/**
 * Create mock payment
 */
export const createMockPayment = (overrides = {}) => ({
  id: 'payment-123',
  trip_id: 'trip-123',
  description: 'Test payment',
  amount: 100,
  amount_currency: 'USD',
  created_by: 'user-123',
  created_at: '2024-01-01T10:00:00Z',
  is_settled: false,
  split_participants: ['user-123', 'user-456'],
  ...overrides,
});

/**
 * Create mock calendar event
 */
export const createMockCalendarEvent = (overrides = {}) => ({
  id: 'event-123',
  trip_id: 'trip-123',
  title: 'Test Event',
  description: 'Test description',
  start_time: '2024-01-01T14:00:00Z',
  end_time: '2024-01-01T15:00:00Z',
  location: 'Test Location',
  event_category: 'activity',
  include_in_itinerary: true,
  source_type: 'manual',
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Test factories for backward compatibility
 */
export const testFactories = {
  createTrip: createMockTrip,
  createUser: createMockUserProfile,
  createMessage: createMockChatMessage,
  createPayment: createMockPayment,
  createEvent: createMockCalendarEvent,
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/hooks/useAuth';

/**
 * Test wrapper component that provides all necessary context providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes all providers
 */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Factory functions for creating test data
 */
export const testFactories = {
  /**
   * Create a mock user
   */
  createUser(overrides?: Partial<{
    id: string;
    email: string;
    displayName: string;
    firstName: string;
    lastName: string;
    avatar: string;
    isPro: boolean;
  }>) {
    return {
      id: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      isPro: false,
      showEmail: true,
      showPhone: false,
      permissions: [],
      notificationSettings: {
        messages: true,
        broadcasts: true,
        tripUpdates: true,
        email: true,
        push: true,
      },
      ...overrides,
    };
  },

  /**
   * Create a mock trip
   */
  createTrip(overrides?: Partial<{
    id: string;
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    trip_type: string;
    creator_id: string;
  }>) {
    return {
      id: 'test-trip-123',
      name: 'Test Trip',
      destination: 'Paris',
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      trip_type: 'consumer',
      creator_id: 'test-user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock chat message
   */
  createMessage(overrides?: Partial<{
    id: string;
    trip_id: string;
    content: string;
    created_by: string;
    message_type: string;
  }>) {
    return {
      id: `msg-${Date.now()}`,
      trip_id: 'test-trip-123',
      content: 'Test message',
      created_by: 'test-user-123',
      message_type: 'message',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock payment
   */
  createPayment(overrides?: Partial<{
    id: string;
    trip_id: string;
    description: string;
    amount: number;
    created_by: string;
  }>) {
    return {
      id: `payment-${Date.now()}`,
      trip_id: 'test-trip-123',
      description: 'Test payment',
      amount: 100,
      currency: 'USD',
      created_by: 'test-user-123',
      created_at: new Date().toISOString(),
      is_settled: false,
      ...overrides,
    };
  },

  /**
   * Create a mock calendar event
   */
  createEvent(overrides?: Partial<{
    id: string;
    trip_id: string;
    title: string;
    start_time: string;
    end_time: string;
    created_by: string;
  }>) {
    return {
      id: `event-${Date.now()}`,
      trip_id: 'test-trip-123',
      title: 'Test Event',
      description: null,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      location: null,
      event_category: 'other',
      include_in_itinerary: true,
      source_type: 'manual',
      source_data: null,
      created_by: 'test-user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock task
   */
  createTask(overrides?: Partial<{
    id: string;
    trip_id: string;
    content: string;
    assignee_id: string;
    created_by: string;
  }>) {
    return {
      id: `task-${Date.now()}`,
      trip_id: 'test-trip-123',
      content: 'Test task',
      assignee_id: 'test-user-123',
      created_by: 'test-user-123',
      due_date: null,
      is_complete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },
};

/**
 * Mock Google Maps API
 */
export function mockGoogleMaps() {
  global.google = {
    maps: {
      Map: vi.fn().mockImplementation(() => ({
        setCenter: vi.fn(),
        setZoom: vi.fn(),
        panTo: vi.fn(),
        getCenter: vi.fn(() => ({ lat: () => 0, lng: () => 0 })),
        addListener: vi.fn(() => ({ remove: vi.fn() })),
      })),
      Marker: vi.fn().mockImplementation(() => ({
        setMap: vi.fn(),
        setPosition: vi.fn(),
      })),
      places: {
        Autocomplete: vi.fn().mockImplementation(() => ({
          addListener: vi.fn(() => ({ remove: vi.fn() })),
          getPlace: vi.fn(() => ({
            geometry: {
              location: {
                lat: () => 0,
                lng: () => 0,
              },
            },
            name: 'Test Place',
            formatted_address: '123 Test St',
          })),
        })),
      },
      event: {
        addListener: vi.fn(() => ({ remove: vi.fn() })),
        removeListener: vi.fn(),
      },
    },
  } as any;
}

/**
 * Wait for async updates
 */
export async function waitForAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock window.matchMedia
 */
export function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

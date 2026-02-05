import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from '../useAuth';

// Mock user and session data
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  phone: '+1234567890',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Create mock Supabase client using vi.hoisted to ensure it's available during mock hoisting
const { mockSupabaseClient } = vi.hoisted(() => {
  const createChainMock = () => {
    const chainMock: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
    };
    // Make all chain methods return the chain mock for chaining
    Object.keys(chainMock).forEach(key => {
      if (
        typeof chainMock[key] === 'function' &&
        key !== 'then' &&
        key !== 'single' &&
        key !== 'maybeSingle'
      ) {
        chainMock[key].mockReturnValue(chainMock);
      }
    });
    return chainMock;
  };

  return {
    mockSupabaseClient: {
      from: vi.fn(() => createChainMock()),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithOAuth: vi.fn(),
        signInWithOtp: vi.fn(),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        resetPasswordForEmail: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock Supabase module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock demo mode store
vi.mock('@/store/demoModeStore', () => ({
  useDemoModeStore: vi.fn(selector => {
    const state = { demoView: 'off', isDemoMode: false, setDemoView: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

// Import after mocks are set up
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth mocks to default state
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('should initialize with loading state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Initially loading should be true
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle sign up flow', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 },
    );

    const signUpResult = await result.current.signUp(
      'test@example.com',
      'password123',
      'Test',
      'User',
    );

    expect(signUpResult.error).toBeUndefined();
    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
  });
});

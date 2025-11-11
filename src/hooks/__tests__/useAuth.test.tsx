import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React, { useContext } from 'react';
import { AuthProvider, useAuth } from '../useAuth';
import { createMockSupabaseClient, mockUser, mockSession } from '@/__tests__/utils/supabaseMocks';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

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
  });

  it('should initialize with loading state', async () => {
    const mockSupabase = vi.mocked(supabase);
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: null },
      unsubscribe: vi.fn(),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Initially loading should be true
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle sign up flow', async () => {
    const mockSupabase = vi.mocked(supabase);
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabase.auth.onAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: null },
      unsubscribe: vi.fn(),
    });
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              user_id: mockUser.id,
              display_name: 'Test User',
              first_name: 'Test',
              last_name: 'User',
            },
          ],
          error: null,
        }),
      }),
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    const signUpResult = await result.current.signUp(
      'test@example.com',
      'password123',
      'Test',
      'User'
    );

    expect(signUpResult.error).toBeUndefined();
    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { OAuthButtons } from '../OAuthButtons';
import { AuthDivider } from '../AuthDivider';
import { AuthProvider } from '@/hooks/useAuth';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

const createTestWrapper = () => {
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

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders Google and Apple buttons', async () => {
      render(<OAuthButtons mode="signin" />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
      });
    });

    it('shows "Sign up with" text in signup mode', async () => {
      render(<OAuthButtons mode="signup" />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up with apple/i })).toBeInTheDocument();
      });
    });

    it('shows "Sign in with" text in signin mode', async () => {
      render(<OAuthButtons mode="signin" />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
      });
    });

    it('disables buttons when disabled prop is true', async () => {
      render(<OAuthButtons mode="signin" disabled />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeDisabled();
      });
    });
  });

  describe('click handlers', () => {
    it('calls signInWithOAuth with google provider when Google button is clicked', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      render(<OAuthButtons mode="signin" />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'google',
          }),
        );
      });
    });

    it('calls signInWithOAuth with apple provider when Apple button is clicked', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      render(<OAuthButtons mode="signin" />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in with apple/i }));

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'apple',
          }),
        );
      });
    });

    it('does not call OAuth when disabled', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      render(<OAuthButtons mode="signin" disabled />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

      // Give time for any async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have been called since button is disabled
      expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    });
  });
});

describe('AuthDivider', () => {
  it('renders with default text', () => {
    render(<AuthDivider />);
    expect(screen.getByText('or continue with')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<AuthDivider text="or continue with email" />);
    expect(screen.getByText('or continue with email')).toBeInTheDocument();
  });
});

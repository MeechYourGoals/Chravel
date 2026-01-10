import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { AuthModal } from '../AuthModal';
import { AuthProvider } from '@/hooks/useAuth';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
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

describe('AuthModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth buttons integration', () => {
    it('renders OAuth buttons when modal is open in signin mode', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
      });
    });

    it('renders OAuth buttons when modal is open in signup mode', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signup" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up with apple/i })).toBeInTheDocument();
      });
    });

    it('shows divider between OAuth and email form', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('or continue with email')).toBeInTheDocument();
      });
    });

    it('does not render OAuth buttons in forgot password mode', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });

      // Click on "Forgot password?" link
      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      fireEvent.click(forgotPasswordButton);

      // OAuth buttons should be gone
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /sign in with google/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: /sign in with apple/i }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('or continue with email')).not.toBeInTheDocument();
      });
    });

    it('updates OAuth button text when switching between signin and signup', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      // Wait for signin mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      });

      // Switch to signup mode
      const signUpTab = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(signUpTab);

      // OAuth buttons should now show "Sign up with"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up with apple/i })).toBeInTheDocument();
      });
    });
  });

  describe('email form still works', () => {
    it('renders email and password fields', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/your@email.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
      });
    });

    it('renders first and last name fields in signup mode', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signup" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('modal behavior', () => {
    it('does not render when isOpen is false', () => {
      render(<AuthModal isOpen={false} onClose={mockOnClose} />, {
        wrapper: createTestWrapper(),
      });

      expect(screen.queryByText('Welcome Back')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      });
    });
  });
});

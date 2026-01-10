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

  describe('email form functionality', () => {
    it('renders email and password fields in signin mode', async () => {
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

    it('shows forgot password form when clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      });

      // Click on "Forgot password?" link
      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      fireEvent.click(forgotPasswordButton);

      // Should show reset password form
      await waitFor(() => {
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      });
    });
  });

  describe('tab navigation', () => {
    it('switches between signin and signup modes', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} initialMode="signin" />, {
        wrapper: createTestWrapper(),
      });

      // Wait for signin mode
      await waitFor(() => {
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      });

      // Switch to signup mode
      const signUpTab = screen.getByRole('button', { name: /^sign up$/i });
      fireEvent.click(signUpTab);

      // Should show Create Account header (use heading role to be more specific)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
        // Name fields should appear
        expect(screen.getByPlaceholderText(/john/i)).toBeInTheDocument();
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

    it('calls onClose when X button is clicked', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />, {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      });

      // Find the close button by its class (contains lucide-x icon)
      const header = screen.getByRole('heading', { name: /welcome back/i }).parentElement;
      const closeButton = header?.querySelector('button');
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

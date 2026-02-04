import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';

describe('Authentication', () => {
  beforeEach(() => {
    supabaseMockHelpers.clearMocks();
    supabaseMockHelpers.setUser(null);
  });

  describe('Sign Up Flow', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
      };

      const mockSession = {
        access_token: 'mock-token',
        user: mockUser,
      };

      // Mock successful signup
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock profile creation
      supabaseMockHelpers.setMockData('profiles', [
        {
          user_id: mockUser.id,
          display_name: 'New User',
          first_name: 'New',
          last_name: 'User',
        },
      ]);

      // Mock getUser after signup
      (mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const TestComponent = () => {
        const { signUp, user } = useAuth();
        const [status, setStatus] = React.useState('idle');

        const handleSignUp = async () => {
          setStatus('loading');
          const result = await signUp('newuser@example.com', 'password123', 'New', 'User');
          if (result.error) {
            setStatus('error');
          } else {
            setStatus('success');
          }
        };

        return (
          <div>
            <button onClick={handleSignUp}>Sign Up</button>
            <div data-testid="status">{status}</div>
            {user && <div data-testid="user-email">{user.email}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const signUpButton = screen.getByText('Sign Up');
      await userEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('success');
      });
    });

    it('should handle signup errors', async () => {
      const mockError = { message: 'Email already registered', code: '23505' };

      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const TestComponent = () => {
        const { signUp } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignUp = async () => {
          const result = await signUp('existing@example.com', 'password123', 'Test', 'User');
          if (result.error) {
            setError(result.error);
          }
        };

        return (
          <div>
            <button onClick={handleSignUp}>Sign Up</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const signUpButton = screen.getByText('Sign Up');
      await userEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('Sign In Flow', () => {
    it('should successfully sign in an existing user', async () => {
      const mockUser = {
        id: 'existing-user-123',
        email: 'existing@example.com',
      };

      const mockSession = {
        access_token: 'mock-token',
        user: mockUser,
      };

      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      supabaseMockHelpers.setMockData('profiles', [
        {
          user_id: mockUser.id,
          display_name: 'Existing User',
        },
      ]);

      (mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const TestComponent = () => {
        const { signIn, user } = useAuth();
        const [status, setStatus] = React.useState('idle');

        const handleSignIn = async () => {
          setStatus('loading');
          const result = await signIn('existing@example.com', 'password123');
          if (result.error) {
            setStatus('error');
          } else {
            setStatus('success');
          }
        };

        return (
          <div>
            <button onClick={handleSignIn}>Sign In</button>
            <div data-testid="status">{status}</div>
            {user && <div data-testid="user-email">{user.email}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('success');
      });
    });

    it('should handle invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials', code: 'invalid_credentials' };

      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const TestComponent = () => {
        const { signIn } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignIn = async () => {
          const result = await signIn('wrong@example.com', 'wrongpassword');
          if (result.error) {
            setError(result.error);
          }
        };

        return (
          <div>
            <button onClick={handleSignIn}>Sign In</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });
  });

  describe('Sign Out Flow', () => {
    it('should successfully sign out', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
      };

      supabaseMockHelpers.setUser(mockUser);
      (mockSupabase.auth.signOut as any).mockResolvedValue({ error: null });

      const TestComponent = () => {
        const { signOut, user } = useAuth();

        return (
          <div>
            {user && <div data-testid="user-email">{user.email}</div>}
            <button onClick={signOut}>Sign Out</button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toBeInTheDocument();
      });

      const signOutButton = screen.getByText('Sign Out');
      await userEvent.click(signOutButton);

      await waitFor(() => {
        expect(screen.queryByTestId('user-email')).not.toBeInTheDocument();
      });
    });
  });
});

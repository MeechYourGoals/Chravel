import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Account Deletion Feature Tests
 *
 * Tests the account deletion flow in ConsumerGeneralSettings:
 * 1. Delete button opens confirmation dialog
 * 2. User must type "DELETE" to enable the delete button
 * 3. Clicking delete calls the RPC and Edge Function
 * 4. Success shows toast and signs out
 * 5. Error shows appropriate error message
 */

// Mock supabase client
const mockRpc = vi.fn();
const mockFunctionsInvoke = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: () => mockGetSession(),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    signOut: mockSignOut,
  }),
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    showDemoContent: false,
    demoView: 'off',
  }),
}));

vi.mock('@/hooks/useSystemMessagePreferences', () => ({
  useGlobalSystemMessagePreferences: () => ({
    preferences: {
      showSystemMessages: true,
      categories: {
        member: true,
        basecamp: true,
        uploads: true,
        polls: true,
        calendar: true,
        tasks: false,
        payments: false,
      },
    },
    updatePreferences: vi.fn(),
    isUpdating: false,
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Import after mocks are set up
import { ConsumerGeneralSettings } from '../consumer/ConsumerGeneralSettings';

describe('Account Deletion Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockRpc.mockResolvedValue({
      data: { success: true, code: 'PROCEED_TO_EDGE_FUNCTION' },
      error: null,
    });

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });

    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, message: 'Account deleted' },
      error: null,
    });

    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Delete Account button', () => {
    render(<ConsumerGeneralSettings />);

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText('Permanently delete your account and all data')).toBeInTheDocument();
  });

  it('opens confirmation dialog when Delete Account is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Find and click the delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    // Check for partial text since it's broken up by strong tag
    expect(screen.getByText(/This action is/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type DELETE to confirm')).toBeInTheDocument();
  });

  it('disables delete button until user types DELETE', async () => {
    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    // Find the confirm button - it should be disabled initially
    const confirmButton = screen.getByRole('button', { name: /delete my account/i });
    expect(confirmButton).toBeDisabled();

    // Type partial text - still disabled
    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    await user.type(input, 'DEL');
    expect(confirmButton).toBeDisabled();

    // Type full text - should be enabled
    await user.clear(input);
    await user.type(input, 'DELETE');
    expect(confirmButton).not.toBeDisabled();
  });

  it('calls RPC and Edge Function when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    // Type DELETE
    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    await user.type(input, 'DELETE');

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /delete my account/i });
    await user.click(confirmButton);

    // Verify RPC was called
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('request_account_deletion');
    });

    // Verify Edge Function was called
    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete-account', {
        body: { confirmation: 'DELETE' },
      });
    });

    // Verify sign out was called
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Account Deleted',
      }),
    );
  });

  it('shows error toast when RPC returns error status', async () => {
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'Account already deleted' },
      error: null,
    });

    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog and type DELETE
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    await user.type(input, 'DELETE');

    const confirmButton = screen.getByRole('button', { name: /delete my account/i });
    await user.click(confirmButton);

    // Should show error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cannot Delete Account',
          variant: 'destructive',
        }),
      );
    });

    // Should NOT call Edge Function
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it('shows error toast when Edge Function fails', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Server error' },
    });

    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog and type DELETE
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    await user.type(input, 'DELETE');

    const confirmButton = screen.getByRole('button', { name: /delete my account/i });
    await user.click(confirmButton);

    // Should show error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Deletion Failed',
          variant: 'destructive',
        }),
      );
    });

    // Should NOT sign out
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('proceeds with Edge Function even if RPC fails (backwards compatibility)', async () => {
    // Simulate RPC not existing (for backwards compatibility)
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function does not exist' },
    });

    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog and type DELETE
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    await user.type(input, 'DELETE');

    const confirmButton = screen.getByRole('button', { name: /delete my account/i });
    await user.click(confirmButton);

    // Should still call Edge Function
    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete-account', {
        body: { confirmation: 'DELETE' },
      });
    });
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ConsumerGeneralSettings />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /delete/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Your Account?')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Delete Your Account?')).not.toBeInTheDocument();
    });
  });
});

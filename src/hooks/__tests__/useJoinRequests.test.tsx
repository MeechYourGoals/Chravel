/// <reference types="vitest/globals" />
/**
 * Unit tests for useJoinRequests RPC response handling.
 *
 * Covers:
 * - approve_join_request: success, cleaned_up, failure response shapes
 * - reject_join_request: success, cleaned_up response shapes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJoinRequests } from '../useJoinRequests';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/store/demoTripMembersStore', () => ({
  useDemoTripMembersStore: {
    getState: () => ({ addMember: vi.fn() }),
  },
}));

const createChainMock = (finalResult: { data: unknown[]; error: null }) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (r: unknown) => void) => resolve(finalResult)),
  };
  return chain;
};

describe('useJoinRequests RPC response handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => createChainMock({ data: [], error: null }));
  });

  it('approveRequest: handles success response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, message: 'Approved' },
      error: null,
    });

    const { result } = renderHook(() =>
      useJoinRequests({ tripId: 'trip-1', enabled: true, isDemoMode: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.approveRequest('req-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('approve_join_request', { _request_id: 'req-1' });
  });

  it('approveRequest: handles cleaned_up response (orphaned request)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: false, message: 'Request no longer valid', cleaned_up: true },
      error: null,
    });

    const { result } = renderHook(() =>
      useJoinRequests({ tripId: 'trip-1', enabled: true, isDemoMode: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.approveRequest('req-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('approve_join_request', { _request_id: 'req-1' });
  });

  it('rejectRequest: handles success response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { result } = renderHook(() =>
      useJoinRequests({ tripId: 'trip-1', enabled: true, isDemoMode: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rejectRequest('req-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('reject_join_request', { _request_id: 'req-1' });
  });

  it('rejectRequest: handles cleaned_up response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, cleaned_up: true, message: 'Invalid request removed' },
      error: null,
    });

    const { result } = renderHook(() =>
      useJoinRequests({ tripId: 'trip-1', enabled: true, isDemoMode: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rejectRequest('req-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('reject_join_request', { _request_id: 'req-1' });
  });

  it('handles RPC error with clear message', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'reject_join_request does not exist' },
    });

    const { result } = renderHook(() =>
      useJoinRequests({ tripId: 'trip-1', enabled: true, isDemoMode: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.rejectRequest('req-1');
      }),
    ).rejects.toThrow();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordFailure, recordSuccess, isOpen, getState, reset } from '../circuitBreaker';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    store[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
};

vi.stubGlobal('localStorage', localStorageMock);

describe('circuitBreaker', () => {
  beforeEach(() => {
    reset();
    Object.keys(store).forEach(k => delete store[k]);
    vi.clearAllMocks();
  });

  describe('closed state (initial)', () => {
    it('starts closed with no failures', () => {
      const state = getState();
      expect(state.isOpen).toBe(false);
      expect(state.phase).toBe('closed');
      expect(state.failureCount).toBe(0);
    });

    it('isOpen returns false when closed', () => {
      expect(isOpen()).toBe(false);
    });
  });

  describe('recording failures', () => {
    it('accumulates failures without opening below threshold', () => {
      recordFailure('err1');
      recordFailure('err2');
      const state = getState();
      expect(state.failureCount).toBe(2);
      expect(state.isOpen).toBe(false);
      expect(state.phase).toBe('closed');
    });

    it('opens at the failure threshold (3)', () => {
      recordFailure('err1');
      recordFailure('err2');
      const justOpened = recordFailure('err3');
      expect(justOpened).toBe(true);
      const state = getState();
      expect(state.isOpen).toBe(true);
      expect(state.phase).toBe('open');
      expect(state.failureCount).toBe(3);
    });

    it('returns false for justOpened on subsequent failures after open', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3'); // opens
      const justOpened = recordFailure('err4');
      expect(justOpened).toBe(false);
    });

    it('stores last error message', () => {
      recordFailure('connection timeout');
      const state = getState();
      expect(state.lastError).toBe('connection timeout');
    });
  });

  describe('isOpen when circuit is open', () => {
    it('returns true when open and window has not expired', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3');
      expect(isOpen()).toBe(true);
    });
  });

  describe('half-open probe', () => {
    it('allows first caller through after window expires', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3');

      // Advance time past the 5-minute window
      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // First call should see false (probe allowed)
      expect(isOpen()).toBe(false);
      // Second call should see true (probe already consumed)
      expect(isOpen()).toBe(true);

      vi.useRealTimers();
    });

    it('closes circuit on recordSuccess after half-open probe', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3');

      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      isOpen(); // consume probe
      recordSuccess();

      const state = getState();
      expect(state.isOpen).toBe(false);
      expect(state.phase).toBe('closed');
      expect(state.failureCount).toBe(0);

      vi.useRealTimers();
    });

    it('resets window on failure during half-open', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3');

      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      isOpen(); // consume probe
      // Probe fails
      recordFailure('probe failed');

      const state = getState();
      // Should reset to a new failure window with count=1
      expect(state.failureCount).toBe(1);
      expect(state.isOpen).toBe(false);
      expect(state.phase).toBe('closed');

      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      recordFailure('err1');
      recordFailure('err2');
      recordFailure('err3');
      expect(isOpen()).toBe(true);

      reset();

      const state = getState();
      expect(state.isOpen).toBe(false);
      expect(state.phase).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.lastError).toBeNull();
      expect(isOpen()).toBe(false);
    });

    it('removes localStorage entry', () => {
      recordFailure('err1');
      reset();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('chravel_voice_circuit_breaker');
    });
  });

  describe('localStorage persistence', () => {
    it('saves state to localStorage on failure', () => {
      recordFailure('err1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chravel_voice_circuit_breaker',
        expect.any(String),
      );
    });

    it('hydrates from localStorage', () => {
      // Simulate stored state with 2 failures within window
      const stored = JSON.stringify({
        failureCount: 2,
        firstFailureAt: Date.now(),
        storedAt: Date.now(),
      });
      store['chravel_voice_circuit_breaker'] = stored;

      // getState should hydrate and show 2 failures
      const state = getState();
      expect(state.failureCount).toBe(2);
      expect(state.isOpen).toBe(false);
    });

    it('ignores expired localStorage entries (>24h)', () => {
      const stored = JSON.stringify({
        failureCount: 3,
        firstFailureAt: Date.now() - 25 * 60 * 60 * 1000,
        storedAt: Date.now() - 25 * 60 * 60 * 1000,
      });
      store['chravel_voice_circuit_breaker'] = stored;

      const state = getState();
      // Expired entries are ignored, circuit stays closed
      expect(state.failureCount).toBe(0);
    });
  });

  describe('window expiry without reaching threshold', () => {
    it('resets failure count when failures are outside the window', () => {
      vi.useFakeTimers();

      recordFailure('err1');
      recordFailure('err2');

      // Advance past 5-minute window
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Next failure should start a new window
      recordFailure('err3');
      const state = getState();
      expect(state.failureCount).toBe(1);
      expect(state.isOpen).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('custom config', () => {
    it('respects custom failure threshold for justOpened signal', () => {
      recordFailure('err1', { failureThreshold: 2, windowMs: 300_000 });
      const justOpened = recordFailure('err2', { failureThreshold: 2, windowMs: 300_000 });
      // recordFailure signals circuit opened with custom threshold
      expect(justOpened).toBe(true);
      // State reflects 2 failures which meets custom threshold
      expect(getState().failureCount).toBe(2);
    });
  });
});

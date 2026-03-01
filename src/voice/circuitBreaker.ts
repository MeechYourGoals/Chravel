/**
 * Circuit breaker for Gemini Live voice — prevents infinite reconnect loops.
 *
 * States:
 *   closed   — normal operation, failures accumulate
 *   open     — voice disabled after N failures within T minutes
 *   half-open — window expired; ONE probe request is allowed through.
 *               If that probe succeeds (recordSuccess), circuit closes.
 *               If it fails (recordFailure), window resets.
 *
 * State is persisted in memory + localStorage (per device) with expiry.
 * Provides "Try voice again" reset and graceful half-open recovery.
 */

const STORAGE_KEY = 'chravel_voice_circuit_breaker';
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h max persistence

export interface CircuitBreakerConfig {
  failureThreshold: number;
  windowMs: number;
}

export type CircuitBreakerPhase = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  /** Backward-compatible: true when circuit is open or half-open and probe is taken */
  isOpen: boolean;
  /** Detailed phase for UI rendering */
  phase: CircuitBreakerPhase;
  failureCount: number;
  firstFailureAt: number | null;
  lastError: string | null;
}

interface StoredState {
  failureCount: number;
  firstFailureAt: number | null;
  storedAt: number;
}

const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: DEFAULT_FAILURE_THRESHOLD,
  windowMs: DEFAULT_WINDOW_MS,
};

let memoryState: CircuitBreakerState = {
  isOpen: false,
  phase: 'closed',
  failureCount: 0,
  firstFailureAt: null,
  lastError: null,
};

/**
 * Half-open probe gate: once the window expires on an open circuit,
 * the FIRST caller to isOpen() sees false (allowed to probe).
 * All subsequent callers see true until recordSuccess() is called.
 */
let halfOpenProbeConsumed = false;

function loadFromStorage(): Partial<StoredState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (Date.now() - (parsed.storedAt ?? 0) > STORAGE_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: CircuitBreakerState): void {
  try {
    const toStore: StoredState = {
      failureCount: state.failureCount,
      firstFailureAt: state.firstFailureAt,
      storedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Non-critical
  }
}

function hydrateFromStorage(): void {
  const stored = loadFromStorage();
  if (stored && typeof stored.failureCount === 'number') {
    const now = Date.now();
    const firstFailureAt = stored.firstFailureAt ?? now;
    const windowExpired = now - firstFailureAt > DEFAULT_WINDOW_MS;
    if (windowExpired) {
      // Window expired — circuit moves to half-open (probe allowed)
      if (stored.failureCount >= DEFAULT_FAILURE_THRESHOLD) {
        memoryState = {
          isOpen: true,
          phase: 'half-open',
          failureCount: stored.failureCount,
          firstFailureAt,
          lastError: memoryState.lastError,
        };
      } else {
        memoryState = {
          isOpen: false,
          phase: 'closed',
          failureCount: 0,
          firstFailureAt: null,
          lastError: null,
        };
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      const wasOpen = stored.failureCount >= DEFAULT_FAILURE_THRESHOLD;
      memoryState = {
        isOpen: wasOpen,
        phase: wasOpen ? 'open' : 'closed',
        failureCount: stored.failureCount,
        firstFailureAt,
        lastError: memoryState.lastError,
      };
    }
  }
}

/** Record a voice failure. Returns true if circuit just opened (caller should show toast). */
export function recordFailure(
  errorMessage: string,
  config: Partial<CircuitBreakerConfig> = {},
): boolean {
  const { failureThreshold, windowMs } = { ...defaultConfig, ...config };
  hydrateFromStorage();

  const now = Date.now();
  const firstFailureAt = memoryState.firstFailureAt ?? now;
  const windowExpired = now - firstFailureAt > windowMs;

  let nextState: CircuitBreakerState;
  if (windowExpired) {
    // Window expired: if we were in half-open and the probe failed, reset window
    nextState = {
      isOpen: false,
      phase: 'closed',
      failureCount: 1,
      firstFailureAt: now,
      lastError: errorMessage,
    };
  } else {
    const newCount = memoryState.failureCount + 1;
    const nowOpen = newCount >= failureThreshold;
    nextState = {
      isOpen: nowOpen,
      phase: nowOpen ? 'open' : 'closed',
      failureCount: newCount,
      firstFailureAt,
      lastError: errorMessage,
    };
  }

  const justOpened = !memoryState.isOpen && nextState.isOpen;
  // Reset half-open probe gate on any new failure
  halfOpenProbeConsumed = false;
  memoryState = nextState;
  saveToStorage(nextState);
  return justOpened;
}

/**
 * Record a successful voice connection.
 * Closes the circuit if it was in half-open state (probe succeeded).
 */
export function recordSuccess(): void {
  hydrateFromStorage();
  if (memoryState.phase === 'half-open' || memoryState.isOpen) {
    memoryState = {
      isOpen: false,
      phase: 'closed',
      failureCount: 0,
      firstFailureAt: null,
      lastError: null,
    };
    halfOpenProbeConsumed = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-critical
    }
  }
}

/**
 * Check if circuit is open (voice should be disabled).
 *
 * Half-open logic: when the failure window has expired on an open circuit,
 * the FIRST caller gets false (allowed through as a test probe). All
 * subsequent callers get true until recordSuccess() is called.
 */
export function isOpen(): boolean {
  hydrateFromStorage();

  if (!memoryState.isOpen) return false;

  // Circuit was open — check if window has expired (half-open transition)
  const now = Date.now();
  const firstFailureAt = memoryState.firstFailureAt;
  if (firstFailureAt && now - firstFailureAt > DEFAULT_WINDOW_MS) {
    // Window expired: half-open state
    if (!halfOpenProbeConsumed) {
      // Allow first caller through as probe; block all others until success/failure
      halfOpenProbeConsumed = true;
      memoryState = { ...memoryState, phase: 'half-open' };
      return false;
    }
    // Probe already dispatched — block until we hear back
    return true;
  }

  return true;
}

/** Get current state for UI. */
export function getState(): CircuitBreakerState {
  hydrateFromStorage();
  return { ...memoryState };
}

/** Reset circuit breaker — "Try voice again" action. */
export function reset(): void {
  memoryState = {
    isOpen: false,
    phase: 'closed',
    failureCount: 0,
    firstFailureAt: null,
    lastError: null,
  };
  halfOpenProbeConsumed = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical
  }
}

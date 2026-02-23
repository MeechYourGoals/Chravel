/**
 * Circuit breaker for Gemini Live voice — prevents infinite reconnect loops.
 *
 * After N failures within T minutes, voice is disabled for the session.
 * State is stored in memory + localStorage (per device) with expiry.
 * Provides "Try voice again" reset.
 */

const STORAGE_KEY = 'chravel_voice_circuit_breaker';
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h max persistence

export interface CircuitBreakerConfig {
  failureThreshold: number;
  windowMs: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
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
  failureCount: 0,
  firstFailureAt: null,
  lastError: null,
};

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
      memoryState = { isOpen: false, failureCount: 0, firstFailureAt: null, lastError: null };
      localStorage.removeItem(STORAGE_KEY);
    } else {
      memoryState = {
        isOpen: stored.failureCount >= DEFAULT_FAILURE_THRESHOLD,
        failureCount: stored.failureCount,
        firstFailureAt,
        lastError: null,
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
    nextState = {
      isOpen: false,
      failureCount: 1,
      firstFailureAt: now,
      lastError: errorMessage,
    };
  } else {
    const newCount = memoryState.failureCount + 1;
    nextState = {
      isOpen: newCount >= failureThreshold,
      failureCount: newCount,
      firstFailureAt,
      lastError: errorMessage,
    };
  }

  const justOpened = !memoryState.isOpen && nextState.isOpen;
  memoryState = nextState;
  saveToStorage(nextState);
  return justOpened;
}

/** Check if circuit is open (voice should be disabled). */
export function isOpen(): boolean {
  hydrateFromStorage();
  return memoryState.isOpen;
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
    failureCount: 0,
    firstFailureAt: null,
    lastError: null,
  };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical
  }
}

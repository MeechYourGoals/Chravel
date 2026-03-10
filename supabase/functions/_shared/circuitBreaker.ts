/**
 * Circuit Breaker for Third-Party Service Calls
 *
 * Prevents cascading failures when external services (Google Maps, Gemini, Stripe, etc.)
 * are down. Tracks failures per service and short-circuits requests when the failure
 * threshold is reached, allowing the service time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service has recovered (allows limited requests through)
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close the circuit (half-open state) */
  resetTimeoutMs: number;
  /** Number of successful requests needed in half-open to close circuit */
  halfOpenSuccessThreshold: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  halfOpenSuccessCount: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000, // 30 seconds
  halfOpenSuccessThreshold: 2,
};

// Per-service circuit breaker state (in-process, per edge function instance)
const circuits = new Map<string, CircuitBreakerState>();

function getCircuit(service: string): CircuitBreakerState {
  if (!circuits.has(service)) {
    circuits.set(service, {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      halfOpenSuccessCount: 0,
    });
  }
  return circuits.get(service)!;
}

/**
 * Check if a request to the service should be allowed.
 * Returns true if the request can proceed, false if it should fail fast.
 */
export function canRequest(service: string, config: Partial<CircuitBreakerConfig> = {}): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getCircuit(service);
  const now = Date.now();

  switch (circuit.state) {
    case 'closed':
      return true;

    case 'open':
      // Check if enough time has passed to try again
      if (now - circuit.lastFailureTime >= cfg.resetTimeoutMs) {
        circuit.state = 'half_open';
        circuit.halfOpenSuccessCount = 0;
        console.log(`[CircuitBreaker] ${service}: open -> half_open (testing recovery)`);
        return true;
      }
      return false;

    case 'half_open':
      // Allow limited requests through to test recovery
      return true;

    default:
      return true;
  }
}

/**
 * Record a successful request to the service.
 */
export function recordSuccess(service: string, config: Partial<CircuitBreakerConfig> = {}): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getCircuit(service);

  if (circuit.state === 'half_open') {
    circuit.halfOpenSuccessCount++;
    if (circuit.halfOpenSuccessCount >= cfg.halfOpenSuccessThreshold) {
      circuit.state = 'closed';
      circuit.failureCount = 0;
      console.log(`[CircuitBreaker] ${service}: half_open -> closed (recovered)`);
    }
  } else if (circuit.state === 'closed') {
    // Reset failure count on success
    circuit.failureCount = 0;
  }
}

/**
 * Record a failed request to the service.
 */
export function recordFailure(service: string, config: Partial<CircuitBreakerConfig> = {}): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getCircuit(service);

  circuit.failureCount++;
  circuit.lastFailureTime = Date.now();

  if (circuit.state === 'half_open') {
    // Failed during recovery test — back to open
    circuit.state = 'open';
    console.log(`[CircuitBreaker] ${service}: half_open -> open (recovery failed)`);
  } else if (circuit.state === 'closed' && circuit.failureCount >= cfg.failureThreshold) {
    circuit.state = 'open';
    console.log(`[CircuitBreaker] ${service}: closed -> open (${circuit.failureCount} failures)`);
  }
}

/**
 * Get the current state of a circuit for monitoring/health checks.
 */
export function getState(service: string): CircuitState {
  return getCircuit(service).state;
}

/**
 * Wraps an async function call with circuit breaker protection.
 *
 * Usage:
 * ```ts
 * const result = await withCircuitBreaker('google-maps', async () => {
 *   return await fetch('https://maps.googleapis.com/...');
 * });
 * ```
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {},
): Promise<T> {
  if (!canRequest(service, config)) {
    throw new Error(`[CircuitBreaker] ${service} is currently unavailable (circuit open)`);
  }

  try {
    const result = await fn();
    recordSuccess(service, config);
    return result;
  } catch (error) {
    recordFailure(service, config);
    throw error;
  }
}

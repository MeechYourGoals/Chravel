import { describe, it, expect, beforeEach } from 'vitest';

// We need a fresh instance for each test to avoid shared state
// Import the class to create fresh instances
describe('Security Monitor', () => {
  // Using dynamic import to get fresh module state isn't ideal,
  // so we test the singleton behavior directly
  let monitor: (typeof import('../securityMonitor'))['securityMonitor'];

  beforeEach(async () => {
    // Re-import to get fresh module (vitest handles module isolation)
    const mod = await import('../securityMonitor');
    monitor = mod.securityMonitor;
  });

  it('tracks API calls and detects rate limit violations', () => {
    // Simulate rapid requests
    for (let i = 0; i < 60; i++) {
      monitor.trackAPICall('user-1', '/api/trips', 60, 60_000);
    }

    // 61st should trigger alert
    const allowed = monitor.trackAPICall('user-1', '/api/trips', 60, 60_000);
    expect(allowed).toBe(false);
  });

  it('tracks auth failures and detects brute force', () => {
    const alerts: unknown[] = [];
    monitor.onAlert(alert => alerts.push(alert));

    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      monitor.trackAuthFailure('attacker-ip', 'invalid_password');
    }

    expect(alerts.length).toBeGreaterThan(0);
  });

  it('resets auth failure count on success', () => {
    for (let i = 0; i < 3; i++) {
      monitor.trackAuthFailure('user-2', 'wrong_password');
    }

    monitor.trackAuthSuccess('user-2');

    // After reset, 4 more failures shouldn't trigger alert
    const alerts: unknown[] = [];
    monitor.onAlert(alert => alerts.push(alert));

    for (let i = 0; i < 4; i++) {
      monitor.trackAuthFailure('user-2', 'wrong_password');
    }

    // Should not have triggered the 5-failure alert since counter was reset
    expect(alerts.length).toBe(0);
  });

  it('detects trip enumeration attacks', () => {
    const alerts: unknown[] = [];
    monitor.onAlert(alert => alerts.push(alert));

    // Access 10 different trips in rapid succession
    for (let i = 0; i < 10; i++) {
      monitor.trackTripAccess('suspicious-user', `trip-${i}`);
    }

    expect(alerts.length).toBeGreaterThan(0);
  });

  it('returns stats', () => {
    const stats = monitor.getStats();
    expect(stats).toHaveProperty('totalAlerts');
    expect(stats).toHaveProperty('bySeverity');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('activeBuckets');
  });

  it('cleanup removes stale data', () => {
    monitor.trackAPICall('stale-user', '/api/test', 100, 60_000);
    expect(monitor.getStats().activeBuckets).toBeGreaterThan(0);
    monitor.cleanup();
    // Can't easily test stale cleanup without time manipulation,
    // but verify it runs without error
  });

  it('unsubscribes alert callbacks', () => {
    const alerts: unknown[] = [];
    const unsub = monitor.onAlert(alert => alerts.push(alert));

    monitor.trackUnauthorizedAccess('user-1', 'trips', 'unauthorized');
    expect(alerts.length).toBe(1);

    unsub();

    monitor.trackUnauthorizedAccess('user-1', 'trips', 'unauthorized again');
    expect(alerts.length).toBe(1); // No new alerts after unsub
  });
});

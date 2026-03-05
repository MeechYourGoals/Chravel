/**
 * Security Monitor — Runtime anomaly detection + alerting
 *
 * Tracks suspicious behavior patterns in real-time:
 *  - Rapid API calls (brute force / credential stuffing)
 *  - Mass data access (scraping attempts)
 *  - Auth failures (account takeover attempts)
 *  - Trip ID enumeration (unauthorized access)
 *  - Unusual patterns (time-of-day, volume spikes)
 *
 * Zero UX impact — monitoring is passive and async.
 */

type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

interface RateBucket {
  count: number;
  windowStart: number;
}

class SecurityMonitor {
  private alerts: SecurityAlert[] = [];
  private rateBuckets: Map<string, RateBucket> = new Map();
  private authFailures: Map<string, { count: number; firstAttempt: number }> = new Map();
  private tripAccessLog: Map<string, { tripIds: Set<string>; windowStart: number }> = new Map();
  private alertCallbacks: ((alert: SecurityAlert) => void)[] = [];

  private readonly MAX_ALERTS = 500;
  private alertCounter = 0;

  // ============================================================
  // Alert Registration
  // ============================================================

  /**
   * Register a callback for real-time security alerts.
   * In production, connect this to Sentry, PagerDuty, or Slack.
   */
  onAlert(callback: (alert: SecurityAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
    };
  }

  private emitAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp'>): void {
    const fullAlert: SecurityAlert = {
      ...alert,
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(fullAlert);
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.splice(0, this.alerts.length - this.MAX_ALERTS);
    }

    for (const cb of this.alertCallbacks) {
      try {
        cb(fullAlert);
      } catch {
        // Don't let callback errors break monitoring
      }
    }

    // Always log to console in dev
    if (alert.severity === 'critical' || alert.severity === 'high') {
      console.warn(
        `[SecurityMonitor] ${alert.severity.toUpperCase()}: ${alert.message}`,
        alert.metadata,
      );
    }
  }

  // ============================================================
  // Rate Limiting Monitor
  // ============================================================

  /**
   * Track an API call and check for rate limit violations.
   * Returns false if the request should be throttled.
   */
  trackAPICall(
    identifier: string,
    endpoint: string,
    maxRequests: number = 60,
    windowMs: number = 60_000,
  ): boolean {
    const key = `${identifier}:${endpoint}`;
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      this.rateBuckets.set(key, { count: 1, windowStart: now });
      return true;
    }

    bucket.count++;

    if (bucket.count === maxRequests) {
      this.emitAlert({
        severity: 'medium',
        type: 'rate_limit_hit',
        message: `Rate limit reached: ${identifier} on ${endpoint} (${bucket.count} requests in ${windowMs / 1000}s)`,
        userId: identifier,
        metadata: { endpoint, count: bucket.count, windowMs },
      });
    }

    if (bucket.count > maxRequests * 2) {
      this.emitAlert({
        severity: 'high',
        type: 'rate_limit_abuse',
        message: `Severe rate limit abuse: ${identifier} on ${endpoint} (${bucket.count} requests)`,
        userId: identifier,
        metadata: { endpoint, count: bucket.count, windowMs },
      });
    }

    return bucket.count <= maxRequests;
  }

  // ============================================================
  // Auth Failure Monitor
  // ============================================================

  /**
   * Track authentication failures. Triggers alerts on suspicious patterns.
   */
  trackAuthFailure(identifier: string, reason: string): void {
    const now = Date.now();
    const WINDOW_MS = 300_000; // 5 minutes
    const record = this.authFailures.get(identifier);

    if (!record || now - record.firstAttempt > WINDOW_MS) {
      this.authFailures.set(identifier, { count: 1, firstAttempt: now });
      return;
    }

    record.count++;

    if (record.count === 5) {
      this.emitAlert({
        severity: 'medium',
        type: 'auth_failure_spike',
        message: `5 auth failures from ${identifier} in ${WINDOW_MS / 1000}s`,
        userId: identifier,
        metadata: { reason, count: record.count },
      });
    }

    if (record.count === 10) {
      this.emitAlert({
        severity: 'high',
        type: 'possible_brute_force',
        message: `10 auth failures from ${identifier} — possible brute force attack`,
        userId: identifier,
        metadata: { reason, count: record.count },
      });
    }
  }

  /**
   * Track successful auth (resets failure counter).
   */
  trackAuthSuccess(identifier: string): void {
    this.authFailures.delete(identifier);
  }

  // ============================================================
  // Trip Access Monitor
  // ============================================================

  /**
   * Track trip access patterns. Detects enumeration attacks.
   */
  trackTripAccess(userId: string, tripId: string): void {
    const now = Date.now();
    const WINDOW_MS = 60_000; // 1 minute
    const record = this.tripAccessLog.get(userId);

    if (!record || now - record.windowStart > WINDOW_MS) {
      this.tripAccessLog.set(userId, {
        tripIds: new Set([tripId]),
        windowStart: now,
      });
      return;
    }

    record.tripIds.add(tripId);

    if (record.tripIds.size === 10) {
      this.emitAlert({
        severity: 'medium',
        type: 'trip_enumeration_possible',
        message: `User ${userId} accessed 10 different trips in 1 minute`,
        userId,
        metadata: { tripCount: record.tripIds.size },
      });
    }

    if (record.tripIds.size >= 20) {
      this.emitAlert({
        severity: 'high',
        type: 'trip_enumeration_attack',
        message: `User ${userId} accessed ${record.tripIds.size} trips in 1 minute — likely enumeration attack`,
        userId,
        metadata: { tripCount: record.tripIds.size },
      });
    }
  }

  // ============================================================
  // Suspicious Data Access
  // ============================================================

  /**
   * Track when a user accesses data they don't own (caught by RLS but still suspicious).
   */
  trackUnauthorizedAccess(userId: string, resource: string, details: string): void {
    this.emitAlert({
      severity: 'medium',
      type: 'unauthorized_access_attempt',
      message: `User ${userId} attempted unauthorized access to ${resource}`,
      userId,
      metadata: { resource, details },
    });
  }

  // ============================================================
  // Query / Export
  // ============================================================

  /**
   * Get recent alerts for admin dashboard.
   */
  getAlerts(options?: {
    severity?: AlertSeverity;
    type?: string;
    limit?: number;
  }): SecurityAlert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }

    const limit = options?.limit || 50;
    return filtered.slice(-limit);
  }

  /**
   * Get summary stats for monitoring dashboard.
   */
  getStats(): {
    totalAlerts: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<string, number>;
    activeBuckets: number;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const byType: Record<string, number> = {};

    for (const alert of this.alerts) {
      bySeverity[alert.severity]++;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    }

    return {
      totalAlerts: this.alerts.length,
      bySeverity,
      byType,
      activeBuckets: this.rateBuckets.size,
    };
  }

  /**
   * Clear old data to prevent memory leaks in long-running sessions.
   */
  cleanup(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 3600_000; // 1 hour

    for (const [key, bucket] of this.rateBuckets) {
      if (now - bucket.windowStart > STALE_THRESHOLD) {
        this.rateBuckets.delete(key);
      }
    }

    for (const [key, record] of this.authFailures) {
      if (now - record.firstAttempt > STALE_THRESHOLD) {
        this.authFailures.delete(key);
      }
    }

    for (const [key, record] of this.tripAccessLog) {
      if (now - record.windowStart > STALE_THRESHOLD) {
        this.tripAccessLog.delete(key);
      }
    }
  }
}

/** Singleton instance */
export const securityMonitor = new SecurityMonitor();

// Auto-cleanup every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(() => securityMonitor.cleanup(), 1800_000);
}

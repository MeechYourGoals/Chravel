/**
 * Performance Monitoring Utilities
 *
 * Helpers for measuring and reporting performance metrics.
 */

import { telemetry } from './service';

// ============================================================================
// Performance Timing
// ============================================================================

/**
 * Performance timer for measuring durations.
 * Automatically reports to telemetry on completion.
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor(private name: string) {
    this.startTime = performance.now();
  }

  /**
   * Mark an intermediate point in time.
   */
  mark(label: string): void {
    this.marks.set(label, performance.now() - this.startTime);
  }

  /**
   * Get elapsed time since start.
   */
  elapsed(): number {
    return Math.round(performance.now() - this.startTime);
  }

  /**
   * Get all marks.
   */
  getMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((value, key) => {
      result[key] = Math.round(value);
    });
    return result;
  }

  /**
   * End timing and return duration.
   */
  end(): number {
    return this.elapsed();
  }
}

// ============================================================================
// Initial Load Timing
// ============================================================================

let appLoadTimer: PerformanceTimer | null = null;
let appLoadReported = false;

/**
 * Start tracking app load time.
 * Call at the very beginning of app initialization.
 */
export function startAppLoadTiming(): void {
  if (appLoadTimer) return;
  appLoadTimer = new PerformanceTimer('app_load');
}

/**
 * Mark a point during app loading.
 */
export function markAppLoad(label: string): void {
  appLoadTimer?.mark(label);
}

/**
 * Report app load completion.
 * Call when the app is fully interactive.
 */
export function reportAppLoaded(): void {
  if (!appLoadTimer || appLoadReported) return;

  const durationMs = appLoadTimer.end();
  const marks = appLoadTimer.getMarks();

  // Check if data was loaded from cache
  const isCached = Boolean(
    performance.getEntriesByType('navigation').find(
      (nav) => (nav as PerformanceNavigationTiming).type === 'back_forward'
    )
  );

  // Get network type if available
  let networkType: string | undefined;
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & {
      connection?: { effectiveType?: string };
    }).connection;
    networkType = conn?.effectiveType;
  }

  telemetry.track('app_loaded', {
    duration_ms: durationMs,
    is_cached: isCached,
    network_type: networkType,
  });

  appLoadReported = true;

  if (import.meta.env.DEV) {
    console.log('[Performance] App loaded', {
      duration_ms: durationMs,
      marks,
      is_cached: isCached,
      network_type: networkType,
    });
  }
}

// ============================================================================
// Chat Render Timing
// ============================================================================

const chatRenderTimers: Map<string, PerformanceTimer> = new Map();

/**
 * Start tracking chat render time.
 * Call when chat component mounts.
 */
export function startChatRenderTiming(tripId: string): void {
  chatRenderTimers.set(tripId, new PerformanceTimer('chat_render'));
}

/**
 * Report chat render completion.
 * Call when chat is fully rendered with messages.
 */
export function reportChatRendered(tripId: string, messageCount: number): void {
  const timer = chatRenderTimers.get(tripId);
  if (!timer) return;

  const durationMs = timer.end();

  telemetry.track('chat_render', {
    trip_id: tripId,
    message_count: messageCount,
    duration_ms: durationMs,
  });

  chatRenderTimers.delete(tripId);

  if (import.meta.env.DEV) {
    console.log('[Performance] Chat rendered', {
      trip_id: tripId,
      message_count: messageCount,
      duration_ms: durationMs,
    });
  }
}

// ============================================================================
// Generic Performance Tracking
// ============================================================================

/**
 * Track a timed operation.
 * Returns the duration in milliseconds.
 */
export async function trackTimed<T>(
  name: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<{ result: T; duration_ms: number }> {
  const timer = new PerformanceTimer(name);

  try {
    const result = await operation();
    const duration_ms = timer.end();

    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}`, { duration_ms, ...context });
    }

    return { result, duration_ms };
  } catch (error) {
    const duration_ms = timer.end();

    telemetry.captureError(error as Error, {
      operation: name,
      duration_ms,
      ...context,
    });

    throw error;
  }
}

/**
 * Create a performance observer for Long Tasks (>50ms).
 * Useful for detecting jank.
 */
export function observeLongTasks(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          // Only report very long tasks (>100ms)
          if (import.meta.env.DEV) {
            console.warn('[Performance] Long task detected', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    // longtask observer not supported
  }
}

// ============================================================================
// Web Vitals (Core Web Vitals)
// ============================================================================

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Report Core Web Vitals.
 * Should be called after page load.
 */
export function reportWebVitals(): void {
  if (!('PerformanceObserver' in window)) return;

  // Largest Contentful Paint (LCP)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const metric: WebVitalMetric = {
          name: 'LCP',
          value: lastEntry.startTime,
          rating:
            lastEntry.startTime <= 2500
              ? 'good'
              : lastEntry.startTime <= 4000
              ? 'needs-improvement'
              : 'poor',
        };

        if (import.meta.env.DEV) {
          console.log('[Performance] Web Vital:', metric);
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // LCP not supported
  }

  // First Input Delay (FID)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const firstEntry = entries[0] as PerformanceEventTiming;
        const metric: WebVitalMetric = {
          name: 'FID',
          value: firstEntry.processingStart - firstEntry.startTime,
          rating:
            firstEntry.processingStart - firstEntry.startTime <= 100
              ? 'good'
              : firstEntry.processingStart - firstEntry.startTime <= 300
              ? 'needs-improvement'
              : 'poor',
        };

        if (import.meta.env.DEV) {
          console.log('[Performance] Web Vital:', metric);
        }
      }
    }).observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // FID not supported
  }

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as { value?: number }).value ?? 0;
        }
      }

      const metric: WebVitalMetric = {
        name: 'CLS',
        value: clsValue,
        rating:
          clsValue <= 0.1
            ? 'good'
            : clsValue <= 0.25
            ? 'needs-improvement'
            : 'poor',
      };

      if (import.meta.env.DEV && clsValue > 0) {
        console.log('[Performance] Web Vital:', metric);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // CLS not supported
  }
}

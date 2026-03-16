/**
 * Error Tracking Utility
 *
 * Delegates error reporting to the telemetry service (PostHog $exception).
 * Retains a local breadcrumb buffer for debugging context.
 *
 * To add Sentry or another crash reporter, implement a new TelemetryProvider
 * in src/telemetry/providers/ — all call sites route through the telemetry service.
 */

import { telemetry } from '@/telemetry/service';

interface ErrorContext {
  userId?: string;
  tripId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  additionalData?: Record<string, unknown>;
  context?: string;
}

interface Breadcrumb {
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
  timestamp?: string;
}

class ErrorTrackingService {
  private isInitialized = false;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;

  init(_config?: { dsn?: string; environment?: string }) {
    this.isInitialized = true;
  }

  /**
   * Add a breadcrumb for debugging slow loads and tracing user paths.
   * Breadcrumbs are attached to error reports for context.
   */
  addBreadcrumb(breadcrumb: Breadcrumb) {
    const timestamped = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(timestamped);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (import.meta.env.DEV) {
      console.log(`[Breadcrumb] ${breadcrumb.category}: ${breadcrumb.message}`, breadcrumb.data);
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }

  captureException(error: Error, context?: ErrorContext) {
    // Delegate to telemetry service with recent breadcrumbs for debugging context
    telemetry.captureError(error, {
      ...context,
      breadcrumbs: this.breadcrumbs.slice(-10),
    });

    if (import.meta.env.DEV) {
      console.error('[ErrorTracking] Exception:', error.message, context);
    }
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext,
  ) {
    // Record as breadcrumb so the message appears in future error reports
    this.addBreadcrumb({
      category: 'message',
      message,
      level,
      data: context,
    });
  }

  setUser(_userId: string, _userData?: Record<string, unknown>) {
    // User identity managed by telemetry.identify() in useAuth
  }

  clearUser() {
    // User identity managed by telemetry.reset() in useAuth
  }
}

export const errorTracking = new ErrorTrackingService();

// Auto-initialize in development
if (import.meta.env.DEV) {
  errorTracking.init({ environment: 'development' });
}

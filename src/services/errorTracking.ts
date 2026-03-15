/**
 * Centralized Error Tracking Service
 *
 * Provides a unified interface for error tracking across the application.
 * Integrates with Sentry when VITE_SENTRY_DSN is configured.
 * Falls back to console-only logging when DSN is not set.
 *
 * Usage:
 * ```ts
 * import { errorTracking } from '@/services/errorTracking';
 *
 * try {
 *   // risky operation
 * } catch (error) {
 *   errorTracking.captureException(error, {
 *     context: 'PaymentFlow',
 *     userId: user.id
 *   });
 * }
 * ```
 */

import * as Sentry from '@sentry/react';

export interface ErrorContext {
  userId?: string;
  tripId?: string;
  organizationId?: string;
  context?: string;
  additionalData?: Record<string, unknown>;
}

export interface BreadcrumbData {
  category: 'navigation' | 'user-action' | 'api-call' | 'state-change' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

class ErrorTrackingService {
  private breadcrumbs: BreadcrumbData[] = [];
  private maxBreadcrumbs = 50;
  private initialized = false;
  private sentryEnabled = false;
  private userId: string | null = null;

  /**
   * Initialize error tracking service.
   * Sentry is activated only when VITE_SENTRY_DSN is set (no-op otherwise).
   */
  init(config?: { userId?: string; environment?: string }) {
    if (this.initialized) return;

    if (config?.userId) {
      this.userId = config.userId;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn) {
      Sentry.init({
        dsn,
        environment: config?.environment || import.meta.env.MODE || 'production',
        // Sample 100% of errors, 20% of transactions in production
        tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
        // Only send errors in production/staging
        enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_FORCE_ENABLE === 'true',
        integrations: [Sentry.browserTracingIntegration()],
      });
      this.sentryEnabled = true;
    }

    this.initialized = true;
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, userData?: Record<string, unknown>) {
    this.userId = userId;

    if (this.sentryEnabled) {
      Sentry.setUser({ id: userId, ...userData });
    }
  }

  /**
   * Clear user context (on logout)
   */
  clearUser() {
    this.userId = null;

    if (this.sentryEnabled) {
      Sentry.setUser(null);
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error | unknown, context?: ErrorContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (import.meta.env.DEV) {
      console.error('[ErrorTracking] Exception captured:', {
        error: errorObj,
        message: errorObj.message,
        context,
      });
    }

    if (this.sentryEnabled) {
      Sentry.captureException(errorObj, {
        contexts: {
          custom: context as Record<string, unknown>,
        },
      });
    }

    return errorObj;
  }

  /**
   * Capture a message (non-error log)
   */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext,
  ) {
    if (this.sentryEnabled) {
      Sentry.captureMessage(message, {
        level: level as Sentry.SeverityLevel,
        contexts: {
          custom: context as Record<string, unknown>,
        },
      });
    }
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(breadcrumb: BreadcrumbData) {
    this.breadcrumbs.push({
      ...breadcrumb,
      data: {
        ...breadcrumb.data,
        timestamp: new Date().toISOString(),
      },
    });

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    if (this.sentryEnabled) {
      Sentry.addBreadcrumb({
        category: breadcrumb.category,
        message: breadcrumb.message,
        level: breadcrumb.level as Sentry.SeverityLevel,
        data: breadcrumb.data,
      });
    }
  }

  /**
   * Get recent breadcrumbs for debugging
   */
  getBreadcrumbs(limit: number = 10): BreadcrumbData[] {
    return this.breadcrumbs.slice(-limit);
  }

  /**
   * Wrap an async function with error tracking
   */
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, context: ErrorContext): T {
    return (async (...args: unknown[]) => {
      try {
        this.addBreadcrumb({
          category: 'api-call',
          message: `Executing ${context.context || 'async operation'}`,
          level: 'info',
          data: { args: args.slice(0, 3) }, // Don't log all args for privacy
        });

        const result = await fn(...args);
        return result;
      } catch (error) {
        this.captureException(error, context);
        throw error;
      }
    }) as T;
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

// Auto-initialize
errorTracking.init({
  environment: import.meta.env.MODE || 'development',
});

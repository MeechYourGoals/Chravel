/**
 * Centralized Error Tracking Service
 *
 * Provides a unified interface for error tracking across the application.
 * Currently logs to console, but can be easily integrated with services like:
 * - Sentry
 * - DataDog
 * - LogRocket
 * - Rollbar
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

export interface ErrorContext {
  userId?: string;
  tripId?: string;
  organizationId?: string;
  context?: string;
  additionalData?: Record<string, any>;
}

export interface BreadcrumbData {
  category: 'navigation' | 'user-action' | 'api-call' | 'state-change' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class ErrorTrackingService {
  private breadcrumbs: BreadcrumbData[] = [];
  private maxBreadcrumbs = 50;
  private initialized = false;
  private userId: string | null = null;

  /**
   * Initialize error tracking service
   * In production, this would initialize Sentry/DataDog
   */
  init(config?: { userId?: string; environment?: string }) {
    if (this.initialized) return;

    if (config?.userId) {
      this.userId = config.userId;
    }

    // TODO: Initialize Sentry here
    // Sentry.init({
    //   dsn: import.meta.env.VITE_SENTRY_DSN,
    //   environment: config?.environment || 'development',
    //   tracesSampleRate: 1.0,
    // });

    this.initialized = true;
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, userData?: Record<string, any>) {
    this.userId = userId;

    // TODO: Set Sentry user context
    // Sentry.setUser({ id: userId, ...userData });
  }

  /**
   * Clear user context (on logout)
   */
  clearUser() {
    this.userId = null;

    // TODO: Clear Sentry user context
    // Sentry.setUser(null);
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error | unknown, context?: ErrorContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error('[ErrorTracking] Exception captured:', {
      error: errorObj,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
    });

    // TODO: Send to Sentry
    // Sentry.captureException(errorObj, {
    //   contexts: {
    //     custom: context
    //   },
    //   user: this.userId ? { id: this.userId } : undefined
    // });

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
    // TODO: Send to Sentry
    // Sentry.captureMessage(message, {
    //   level,
    //   contexts: {
    //     custom: context
    //   }
    // });
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

    // TODO: Send to Sentry
    // Sentry.addBreadcrumb({
    //   category: breadcrumb.category,
    //   message: breadcrumb.message,
    //   level: breadcrumb.level,
    //   data: breadcrumb.data
    // });
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
  wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T, context: ErrorContext): T {
    return (async (...args: any[]) => {
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

// Auto-initialize in development
if (import.meta.env.DEV) {
  errorTracking.init({ environment: 'development' });
}

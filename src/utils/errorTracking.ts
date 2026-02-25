/**
 * Error Tracking Utility
 * Placeholder for Sentry or other error tracking service
 * Configure with SENTRY_DSN in production
 */

interface ErrorContext {
  userId?: string;
  tripId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
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

  init(config?: { dsn?: string; environment?: string }) {
    // In production, initialize Sentry here
    // Sentry.init({ dsn: config?.dsn, environment: config?.environment });
    this.isInitialized = true;
  }

  /**
   * Add a breadcrumb for debugging slow loads and tracing user paths
   * Used for mobile/PWA performance diagnostics
   */
  addBreadcrumb(breadcrumb: Breadcrumb) {
    const timestamped = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(timestamped);

    // Keep breadcrumb buffer bounded
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // In production, send to Sentry
    // Sentry.addBreadcrumb({ category, message, level, data });

    if (import.meta.env.DEV) {
      console.log(`[Breadcrumb] ${breadcrumb.category}: ${breadcrumb.message}`, breadcrumb.data);
    }
  }

  /**
   * Get all breadcrumbs for debugging
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs (e.g., on page navigation)
   */
  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }

  captureException(error: Error, context?: ErrorContext) {
    if (!this.isInitialized) {
      console.error('[ErrorTracking] Not initialized');
    }

    // In production, send to Sentry
    // Sentry.captureException(error, { contexts: { custom: context } });

    console.error('[ErrorTracking] Exception:', error.message, context);
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext,
  ) {
    if (!this.isInitialized) {
      console.warn('[ErrorTracking] Not initialized');
    }

    // In production, send to Sentry
    // Sentry.captureMessage(message, { level, contexts: { custom: context } });
  }

  setUser(userId: string, userData?: Record<string, unknown>) {
    // In production, set Sentry user context
    // Sentry.setUser({ id: userId, ...userData });
  }

  clearUser() {
    // In production, clear Sentry user context
    // Sentry.setUser(null);
  }
}

export const errorTracking = new ErrorTrackingService();

// Auto-initialize in development
if (import.meta.env.DEV) {
  errorTracking.init({ environment: 'development' });
}

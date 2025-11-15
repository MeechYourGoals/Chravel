/**
 * Error Tracking Utility
 * Placeholder for Sentry or other error tracking service
 * Configure with SENTRY_DSN in production
 */

interface ErrorContext {
  userId?: string;
  tripId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorTrackingService {
  private isInitialized = false;

  init(config?: { dsn?: string; environment?: string }) {
    // In production, initialize Sentry here
    // Sentry.init({ dsn: config?.dsn, environment: config?.environment });
    this.isInitialized = true;
  }

  captureException(error: Error, context?: ErrorContext) {
    if (!this.isInitialized) {
      console.error('[ErrorTracking] Not initialized');
    }

    // In production, send to Sentry
    // Sentry.captureException(error, { contexts: { custom: context } });
    
    console.error('[ErrorTracking] Exception:', error.message, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.isInitialized) {
      console.warn('[ErrorTracking] Not initialized');
    }

    // In production, send to Sentry
    // Sentry.captureMessage(message, { level, contexts: { custom: context } });
    
  }

  setUser(userId: string, userData?: Record<string, any>) {
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

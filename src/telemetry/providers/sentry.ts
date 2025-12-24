/**
 * Sentry Telemetry Provider
 *
 * Production-ready provider using Sentry for:
 * - Error tracking
 * - Crash reporting
 * - Performance monitoring
 *
 * Sentry is the industry standard for error tracking:
 * - Excellent stack trace analysis
 * - Release tracking
 * - Source map support
 * - Free tier up to 5K events/month
 *
 * Installation:
 *   npm install @sentry/react @sentry/capacitor
 *
 * Environment variables:
 *   VITE_SENTRY_DSN - Your Sentry DSN
 */

import type {
  TelemetryProvider,
  TelemetryConfig,
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventMap,
} from '../types';
import { Capacitor } from '@capacitor/core';

// Sentry types (minimal, for when SDK is installed)
interface SentryInstance {
  init: (options: Record<string, unknown>) => void;
  setUser: (user: { id: string; email?: string; username?: string } | null) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => string;
  captureMessage: (message: string, level?: string) => string;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  flush: (timeout?: number) => Promise<boolean>;
  close: () => Promise<void>;
}

let sentryInstance: SentryInstance | null = null;

export class SentryProvider implements TelemetryProvider {
  name = 'sentry';
  private enabled = false;
  private debug = false;
  private currentUser: TelemetryUser | null = null;

  async init(config: TelemetryConfig): Promise<void> {
    this.enabled = config.enabled;
    this.debug = config.debug;

    if (!config.sentry?.dsn) {
      if (this.debug) {
        console.warn('[Telemetry:Sentry] No DSN configured, skipping initialization');
      }
      return;
    }

    try {
      // Use Capacitor-specific Sentry on native, browser SDK on web
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Dynamic import for Capacitor Sentry
        // @ts-expect-error - @sentry/capacitor may not be installed
        const Sentry = await import('@sentry/capacitor').catch(() => null);
        if (!Sentry) {
          console.warn('[Sentry] @sentry/capacitor not installed, skipping initialization');
          return;
        }
        sentryInstance = Sentry as unknown as SentryInstance;
      } else {
        // Dynamic import for React Sentry
        // @ts-expect-error - @sentry/react may not be installed
        const Sentry = await import('@sentry/react').catch(() => null);
        if (!Sentry) {
          console.warn('[Sentry] @sentry/react not installed, skipping initialization');
          return;
        }
        sentryInstance = Sentry as unknown as SentryInstance;
      }

      sentryInstance.init({
        dsn: config.sentry.dsn,
        environment: config.sentry.environment || config.environment,
        tracesSampleRate: config.sentry.tracesSampleRate ?? 0.1,
        debug: this.debug,
        integrations: [],
        // Don't send errors in development unless explicitly enabled
        enabled: config.environment !== 'development' || config.debug,
        beforeSend(event: Record<string, unknown>) {
          // Filter out known non-actionable errors
          const message = (event as { exception?: { values?: Array<{ value?: string }> } })
            ?.exception?.values?.[0]?.value;

          if (message?.includes('ResizeObserver loop')) {
            return null;
          }

          return event;
        },
      });

      if (this.debug) {
        console.log('[Telemetry:Sentry] Initialized', {
          isNative,
          environment: config.environment,
        });
      }
    } catch (error) {
      console.warn('[Telemetry:Sentry] Failed to initialize:', error);
      this.enabled = false;
    }
  }

  identify(user: TelemetryUser): void {
    if (!this.enabled || !sentryInstance) return;

    this.currentUser = user;

    sentryInstance.setUser({
      id: user.id,
      email: user.email,
      username: user.display_name,
    });

    if (this.debug) {
      console.log('[Telemetry:Sentry] Identify', { user });
    }
  }

  reset(): void {
    if (!sentryInstance) return;

    this.currentUser = null;
    sentryInstance.setUser(null);

    if (this.debug) {
      console.log('[Telemetry:Sentry] Reset');
    }
  }

  track<E extends TelemetryEventName>(
    event: E,
    properties: TelemetryEventMap[E]
  ): void {
    if (!this.enabled || !sentryInstance) return;

    // Add as breadcrumb for error context
    sentryInstance.addBreadcrumb({
      category: 'analytics',
      message: event,
      data: properties,
      level: 'info',
    });

    if (this.debug) {
      console.log(`[Telemetry:Sentry] Breadcrumb: ${event}`, properties);
    }
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled || !sentryInstance) return;

    sentryInstance.addBreadcrumb({
      category: 'navigation',
      message: `Page: ${name}`,
      data: properties,
      level: 'info',
    });

    if (this.debug) {
      console.log(`[Telemetry:Sentry] Page: ${name}`, properties);
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled || !sentryInstance) return;

    sentryInstance.captureException(error, {
      extra: context,
    });

    if (this.debug) {
      console.error('[Telemetry:Sentry] Error captured', {
        error,
        context,
      });
    }
  }

  async flush(): Promise<void> {
    if (!sentryInstance) return;

    await sentryInstance.flush(2000);

    if (this.debug) {
      console.log('[Telemetry:Sentry] Flush');
    }
  }

  async shutdown(): Promise<void> {
    if (sentryInstance) {
      await sentryInstance.close();
      sentryInstance = null;
    }
    this.enabled = false;

    if (this.debug) {
      console.log('[Telemetry:Sentry] Shutdown');
    }
  }
}

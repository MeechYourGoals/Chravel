/**
 * Sentry Telemetry Provider
 *
 * Wraps @sentry/react to implement the TelemetryProvider interface.
 * Only active when VITE_SENTRY_DSN is set.
 */

import * as Sentry from '@sentry/react';
import type {
  TelemetryProvider,
  TelemetryConfig,
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventMap,
} from '../types';

export class SentryProvider implements TelemetryProvider {
  name = 'sentry';
  private ready = false;

  async init(config: TelemetryConfig): Promise<void> {
    if (!config.sentry?.dsn) return;

    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment ?? 'production',
      tracesSampleRate: config.sentry.tracesSampleRate ?? 0.1,
      beforeSend(event) {
        // Voice error fingerprinting: group by phase, not individual message
        if (event.tags?.['voice.phase']) {
          event.fingerprint = ['voice', String(event.tags['voice.phase'])];
        }
        return event;
      },
    });

    this.ready = true;
  }

  identify(user: TelemetryUser): void {
    if (!this.ready) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.display_name,
    });
  }

  reset(): void {
    if (!this.ready) return;
    Sentry.setUser(null);
  }

  track<E extends TelemetryEventName>(event: E, properties: TelemetryEventMap[E]): void {
    if (!this.ready) return;

    Sentry.addBreadcrumb({
      category: 'telemetry',
      message: event,
      data: properties as Record<string, unknown>,
      level: 'info',
    });
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.ready) return;

    Sentry.addBreadcrumb({
      category: 'navigation',
      message: name,
      data: properties,
      level: 'info',
    });
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.ready) return;

    Sentry.withScope(scope => {
      if (context) {
        scope.setExtras(context);
        if (context.trip_id) scope.setTag('trip_id', String(context.trip_id));
        if (context.phase) scope.setTag('voice.phase', String(context.phase));
        if (context.error) scope.setTag('voice.error', String(context.error));
      }
      Sentry.captureException(error);
    });
  }

  async flush(): Promise<void> {
    if (!this.ready) return;
    await Sentry.flush(2000);
  }

  async shutdown(): Promise<void> {
    if (!this.ready) return;
    await Sentry.close(2000);
    this.ready = false;
  }
}

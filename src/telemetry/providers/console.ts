/**
 * Console Telemetry Provider
 *
 * Development-only provider that logs all events to the console.
 * Used when no external providers are configured.
 */

import type {
  TelemetryProvider,
  TelemetryConfig,
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventMap,
} from '../types';

export class ConsoleProvider implements TelemetryProvider {
  name = 'console';
  private enabled = false;
  private debug = false;
  private currentUser: TelemetryUser | null = null;

  async init(config: TelemetryConfig): Promise<void> {
    this.enabled = config.enabled;
    this.debug = config.debug;

    if (this.debug) {
      console.log('[Telemetry:Console] Initialized', { config });
    }
  }

  identify(user: TelemetryUser): void {
    this.currentUser = user;

    if (this.debug) {
      console.log('[Telemetry:Console] Identify', { user });
    }
  }

  reset(): void {
    this.currentUser = null;

    if (this.debug) {
      console.log('[Telemetry:Console] Reset');
    }
  }

  track<E extends TelemetryEventName>(event: E, properties: TelemetryEventMap[E]): void {
    if (!this.enabled) return;

    const enrichedProperties = {
      ...properties,
      user_id: this.currentUser?.id,
      timestamp: new Date().toISOString(),
    };

    if (this.debug) {
      console.log(`[Telemetry:Console] Track: ${event}`, enrichedProperties);
    }
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const enrichedProperties = {
      ...properties,
      user_id: this.currentUser?.id,
      timestamp: new Date().toISOString(),
    };

    if (this.debug) {
      console.log(`[Telemetry:Console] Page: ${name}`, enrichedProperties);
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      user_id: this.currentUser?.id,
      timestamp: new Date().toISOString(),
    };

    if (this.debug) {
      console.error('[Telemetry:Console] Error', errorData);
    }
  }

  async flush(): Promise<void> {
    // Console provider has no buffering
    if (this.debug) {
      console.log('[Telemetry:Console] Flush (no-op)');
    }
  }

  async shutdown(): Promise<void> {
    this.enabled = false;
    if (this.debug) {
      console.log('[Telemetry:Console] Shutdown');
    }
  }
}

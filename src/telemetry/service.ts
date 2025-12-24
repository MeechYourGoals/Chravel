/**
 * Telemetry Service
 *
 * Centralized telemetry orchestrator that manages multiple providers.
 * This service provides a unified API for all analytics and crash reporting.
 *
 * Usage:
 *   import { telemetry } from '@/telemetry';
 *
 *   telemetry.track('trip_created', { trip_id: '123', trip_type: 'consumer' });
 */

import type {
  TelemetryProvider,
  TelemetryConfig,
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventMap,
} from './types';
import { ConsoleProvider } from './providers/console';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Default Configuration
// ============================================================================

const defaultConfig: TelemetryConfig = {
  enabled: true,
  environment: import.meta.env.MODE === 'production'
    ? 'production'
    : import.meta.env.MODE === 'staging'
    ? 'staging'
    : 'development',
  debug: import.meta.env.DEV,
  performanceSampleRate: 0.1, // Sample 10% of performance events
  posthog: import.meta.env.VITE_POSTHOG_API_KEY
    ? {
        apiKey: import.meta.env.VITE_POSTHOG_API_KEY,
        apiHost: import.meta.env.VITE_POSTHOG_HOST,
      }
    : undefined,
  sentry: import.meta.env.VITE_SENTRY_DSN
    ? {
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
      }
    : undefined,
};

// ============================================================================
// Telemetry Service Class
// ============================================================================

class TelemetryService {
  private providers: TelemetryProvider[] = [];
  private config: TelemetryConfig = defaultConfig;
  private initialized = false;
  private currentUser: TelemetryUser | null = null;
  private eventQueue: Array<{ event: TelemetryEventName; properties: TelemetryEventMap[TelemetryEventName] }> = [];
  private demoMode = false;

  /**
   * Initialize the telemetry service with configuration.
   * Must be called once at app startup.
   */
  async init(configOverrides?: Partial<TelemetryConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('[Telemetry] Already initialized');
      return;
    }

    // Check demo mode
    this.demoMode = localStorage.getItem('TRIPS_DEMO_MODE') === 'true';

    // Merge configuration
    this.config = { ...defaultConfig, ...configOverrides };

    // Always add console provider in development
    if (this.config.debug) {
      const consoleProvider = new ConsoleProvider();
      await consoleProvider.init(this.config);
      this.providers.push(consoleProvider);
    }

    // Add PostHog provider if configured
    if (this.config.posthog?.apiKey) {
      try {
        const { PostHogProvider } = await import('./providers/posthog');
        const posthogProvider = new PostHogProvider();
        await posthogProvider.init(this.config);
        this.providers.push(posthogProvider);
      } catch (error) {
        console.warn('[Telemetry] PostHog provider failed to load:', error);
      }
    }

    // Add Sentry provider if configured
    if (this.config.sentry?.dsn) {
      try {
        const { SentryProvider } = await import('./providers/sentry');
        const sentryProvider = new SentryProvider();
        await sentryProvider.init(this.config);
        this.providers.push(sentryProvider);
      } catch (error) {
        console.warn('[Telemetry] Sentry provider failed to load:', error);
      }
    }

    this.initialized = true;

    // Process any queued events
    this.flushQueue();

    if (this.config.debug) {
      console.log('[Telemetry] Initialized', {
        providers: this.providers.map((p) => p.name),
        environment: this.config.environment,
        demoMode: this.demoMode,
      });
    }
  }

  /**
   * Identify a user for analytics.
   * Call after successful login/signup.
   */
  identify(user: TelemetryUser): void {
    if (!this.config.enabled) return;

    this.currentUser = user;

    for (const provider of this.providers) {
      try {
        provider.identify(user);
      } catch (error) {
        console.warn(`[Telemetry] ${provider.name} identify failed:`, error);
      }
    }
  }

  /**
   * Reset user identity.
   * Call on logout.
   */
  reset(): void {
    this.currentUser = null;

    for (const provider of this.providers) {
      try {
        provider.reset();
      } catch (error) {
        console.warn(`[Telemetry] ${provider.name} reset failed:`, error);
      }
    }
  }

  /**
   * Track an analytics event.
   * Events are strongly typed for safety.
   */
  track<E extends TelemetryEventName>(
    event: E,
    properties: TelemetryEventMap[E]
  ): void {
    if (!this.config.enabled) return;

    // Queue events if not initialized
    if (!this.initialized) {
      this.eventQueue.push({ event, properties });
      return;
    }

    // Skip in demo mode for privacy
    if (this.demoMode && !this.config.debug) {
      return;
    }

    // Sample performance events
    if (this.isPerformanceEvent(event) && !this.shouldSamplePerformance()) {
      return;
    }

    // Enrich with common properties
    const enrichedProperties = {
      ...properties,
      demo_mode: this.demoMode,
      platform: this.getPlatform(),
      app_version: this.getAppVersion(),
    } as TelemetryEventMap[E];

    for (const provider of this.providers) {
      try {
        provider.track(event, enrichedProperties);
      } catch (error) {
        console.warn(`[Telemetry] ${provider.name} track failed:`, error);
      }
    }
  }

  /**
   * Track a page view.
   */
  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    const enrichedProperties = {
      ...properties,
      demo_mode: this.demoMode,
      platform: this.getPlatform(),
    };

    for (const provider of this.providers) {
      try {
        provider.page(name, enrichedProperties);
      } catch (error) {
        console.warn(`[Telemetry] ${provider.name} page failed:`, error);
      }
    }
  }

  /**
   * Capture an error for crash reporting.
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    const enrichedContext = {
      ...context,
      user_id: this.currentUser?.id,
      demo_mode: this.demoMode,
      platform: this.getPlatform(),
    };

    for (const provider of this.providers) {
      try {
        provider.captureError(error, enrichedContext);
      } catch (err) {
        console.warn(`[Telemetry] ${provider.name} captureError failed:`, err);
      }
    }
  }

  /**
   * Flush all pending events to providers.
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.providers.map((provider) =>
        provider.flush().catch((error) => {
          console.warn(`[Telemetry] ${provider.name} flush failed:`, error);
        })
      )
    );
  }

  /**
   * Shutdown all providers.
   * Call before app closes.
   */
  async shutdown(): Promise<void> {
    await this.flush();

    await Promise.all(
      this.providers.map((provider) =>
        provider.shutdown().catch((error) => {
          console.warn(`[Telemetry] ${provider.name} shutdown failed:`, error);
        })
      )
    );

    this.providers = [];
    this.initialized = false;
  }

  /**
   * Check if telemetry is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }

  /**
   * Get current configuration.
   */
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private flushQueue(): void {
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (item) {
        this.track(item.event, item.properties);
      }
    }
  }

  private isPerformanceEvent(event: TelemetryEventName): boolean {
    return ['app_loaded', 'chat_render', 'page_view'].includes(event);
  }

  private shouldSamplePerformance(): boolean {
    return Math.random() < this.config.performanceSampleRate;
  }

  private getPlatform(): 'web' | 'ios' | 'android' {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() as 'ios' | 'android';
    }
    return 'web';
  }

  private getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const telemetry = new TelemetryService();

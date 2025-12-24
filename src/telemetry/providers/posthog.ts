/**
 * PostHog Telemetry Provider
 *
 * Production-ready provider using PostHog for:
 * - Product analytics
 * - Session recording
 * - Feature flags
 * - Error tracking
 *
 * PostHog is recommended for early-stage startups because:
 * - Open source with self-hosting option
 * - Free tier up to 1M events/month
 * - Single SDK for all platforms
 * - GDPR compliant with EU hosting
 *
 * Installation:
 *   npm install posthog-js
 *
 * Environment variables:
 *   VITE_POSTHOG_API_KEY - Your PostHog project API key
 *   VITE_POSTHOG_HOST - PostHog host (default: https://app.posthog.com)
 */

import type {
  TelemetryProvider,
  TelemetryConfig,
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventMap,
} from '../types';

// PostHog types (minimal, for when SDK is installed)
interface PostHogInstance {
  init: (apiKey: string, options: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  shutdown: () => void;
}

// Global PostHog reference
let posthogInstance: PostHogInstance | null = null;

export class PostHogProvider implements TelemetryProvider {
  name = 'posthog';
  private enabled = false;
  private debug = false;
  private currentUser: TelemetryUser | null = null;

  async init(config: TelemetryConfig): Promise<void> {
    this.enabled = config.enabled;
    this.debug = config.debug;

    if (!config.posthog?.apiKey) {
      if (this.debug) {
        console.warn('[Telemetry:PostHog] No API key configured, skipping initialization');
      }
      return;
    }

    try {
      // Dynamic import to avoid bundling when not used
      // @ts-expect-error - posthog-js may not be installed
      const posthog = await import('posthog-js').catch(() => null);
      if (!posthog) {
        console.warn('[PostHog] posthog-js not installed, skipping initialization');
        return;
      }
      posthogInstance = posthog.default as unknown as PostHogInstance;

      posthogInstance.init(config.posthog.apiKey, {
        api_host: config.posthog.apiHost || 'https://app.posthog.com',
        autocapture: true,
        capture_pageview: false, // We handle page views manually
        capture_pageleave: true,
        disable_session_recording: config.environment !== 'production',
        persistence: 'localStorage+cookie',
        bootstrap: {
          distinctID: undefined, // Will be set on identify
        },
        loaded: () => {
          if (this.debug) {
            console.log('[Telemetry:PostHog] SDK loaded');
          }
        },
      });

      if (this.debug) {
        console.log('[Telemetry:PostHog] Initialized', {
          apiHost: config.posthog.apiHost,
        });
      }
    } catch (error) {
      console.warn('[Telemetry:PostHog] Failed to initialize:', error);
      this.enabled = false;
    }
  }

  identify(user: TelemetryUser): void {
    if (!this.enabled || !posthogInstance) return;

    this.currentUser = user;

    posthogInstance.identify(user.id, {
      email: user.email,
      name: user.display_name,
      is_pro: user.is_pro,
      organization_id: user.organization_id,
      created_at: user.created_at,
    });

    if (this.debug) {
      console.log('[Telemetry:PostHog] Identify', { user });
    }
  }

  reset(): void {
    if (!posthogInstance) return;

    this.currentUser = null;
    posthogInstance.reset();

    if (this.debug) {
      console.log('[Telemetry:PostHog] Reset');
    }
  }

  track<E extends TelemetryEventName>(
    event: E,
    properties: TelemetryEventMap[E]
  ): void {
    if (!this.enabled || !posthogInstance) return;

    const enrichedProperties = {
      ...properties,
      $set: this.currentUser
        ? {
            user_id: this.currentUser.id,
            is_pro: this.currentUser.is_pro,
          }
        : undefined,
    };

    posthogInstance.capture(event, enrichedProperties);

    if (this.debug) {
      console.log(`[Telemetry:PostHog] Track: ${event}`, enrichedProperties);
    }
  }

  page(name: string, properties?: Record<string, unknown>): void {
    if (!this.enabled || !posthogInstance) return;

    posthogInstance.capture('$pageview', {
      $current_url: window.location.href,
      page_name: name,
      ...properties,
    });

    if (this.debug) {
      console.log(`[Telemetry:PostHog] Page: ${name}`, properties);
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.enabled || !posthogInstance) return;

    posthogInstance.capture('$exception', {
      $exception_type: error.name,
      $exception_message: error.message,
      $exception_stack_trace: error.stack,
      ...context,
      user_id: this.currentUser?.id,
    });

    if (this.debug) {
      console.error('[Telemetry:PostHog] Error captured', {
        error,
        context,
      });
    }
  }

  async flush(): Promise<void> {
    // PostHog handles flushing automatically
    if (this.debug) {
      console.log('[Telemetry:PostHog] Flush');
    }
  }

  async shutdown(): Promise<void> {
    if (posthogInstance) {
      posthogInstance.shutdown();
      posthogInstance = null;
    }
    this.enabled = false;

    if (this.debug) {
      console.log('[Telemetry:PostHog] Shutdown');
    }
  }
}

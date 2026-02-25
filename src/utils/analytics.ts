/**
 * Analytics Utility
 * Placeholder for Segment or other analytics service
 * Configure with SEGMENT_WRITE_KEY in production
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

class AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;

  init(config?: { writeKey?: string }) {
    // In production, initialize Segment here
    // analytics.load(config?.writeKey);
    this.isInitialized = true;
  }

  identify(userId: string, traits?: Record<string, any>) {
    this.userId = userId;

    // In production, send to Segment
    // analytics.identify(userId, traits);
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      console.warn('[Analytics] Not initialized');
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        demo_mode: localStorage.getItem('TRIPS_DEMO_MODE') === 'true',
        timestamp: new Date().toISOString(),
      },
      userId: this.userId || undefined,
    };

    // In production, send to Segment
    // analytics.track(eventName, event.properties);
  }

  page(name: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      console.warn('[Analytics] Not initialized');
    }

    // In production, send to Segment
    // analytics.page(name, properties);
  }

  reset() {
    this.userId = null;

    // In production, reset Segment
    // analytics.reset();
  }
}

export const analytics = new AnalyticsService();

// Auto-initialize in development
if (import.meta.env.DEV) {
  analytics.init();
}

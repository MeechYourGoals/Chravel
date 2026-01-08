/**
 * Telemetry Event Types
 *
 * Centralized type definitions for all analytics events.
 * Every event has a strongly-typed name and properties schema.
 */

// ============================================================================
// Event Categories
// ============================================================================

/**
 * Authentication Events
 */
export interface AuthEvents {
  signup_started: { method: 'email' | 'google' | 'apple' | 'phone' };
  signup_completed: { method: 'email' | 'google' | 'apple' | 'phone'; user_id: string };
  signup_failed: { method: 'email' | 'google' | 'apple' | 'phone'; error: string };
  login_started: { method: 'email' | 'google' | 'apple' | 'phone' };
  login_completed: { method: 'email' | 'google' | 'apple' | 'phone'; user_id: string };
  login_failed: { method: 'email' | 'google' | 'apple' | 'phone'; error: string };
  logout: { user_id: string };
}

/**
 * Trip Events
 */
export interface TripEvents {
  trip_create_started: Record<string, never>;
  trip_created: {
    trip_id: string;
    trip_type: 'consumer' | 'pro' | 'event';
    has_dates: boolean;
    has_location: boolean;
    member_count?: number;
  };
  trip_create_failed: { error: string };
  trip_join_started: { trip_id: string; method: 'link' | 'code' | 'invite' };
  trip_joined: { trip_id: string; method: 'link' | 'code' | 'invite'; user_id: string };
  trip_join_failed: { trip_id: string; method: 'link' | 'code' | 'invite'; error: string };
  trip_viewed: { trip_id: string; trip_type: 'consumer' | 'pro' | 'event' };
  trip_archived: { trip_id: string };
}

/**
 * Messaging Events
 */
export interface MessageEvents {
  message_sent: {
    trip_id: string;
    message_type: 'text' | 'media' | 'broadcast' | 'payment' | 'system';
    has_media: boolean;
    character_count: number;
    is_offline_queued: boolean;
  };
  message_send_failed: { trip_id: string; error: string };
}

/**
 * Places Events
 */
export interface PlaceEvents {
  place_pinned: {
    trip_id: string;
    place_id?: string;
    category?: string;
    source: 'search' | 'map' | 'suggestion' | 'shared';
  };
  place_unpinned: { trip_id: string; place_id?: string };
  place_searched: { trip_id: string; query: string; results_count: number };
}

/**
 * Poll Events
 */
export interface PollEvents {
  poll_created: {
    trip_id: string;
    poll_id: string;
    options_count: number;
    allow_multiple: boolean;
    has_deadline: boolean;
  };
  poll_voted: {
    trip_id: string;
    poll_id: string;
    options_selected: number;
  };
  poll_vote_changed: { trip_id: string; poll_id: string };
  poll_closed: { trip_id: string; poll_id: string; total_votes: number };
}

/**
 * Task Events
 */
export interface TaskEvents {
  task_created: {
    trip_id: string;
    task_id: string;
    has_due_date: boolean;
    is_poll: boolean;
    assigned_count: number;
  };
  task_completed: {
    trip_id: string;
    task_id: string;
    time_to_complete_ms?: number;
  };
  task_uncompleted: { trip_id: string; task_id: string };
  task_deleted: { trip_id: string; task_id: string };
}

/**
 * Export Events
 */
export interface ExportEvents {
  export_recap_started: {
    trip_id: string;
    sections_selected: string[];
  };
  export_recap_completed: {
    trip_id: string;
    sections_exported: string[];
    duration_ms: number;
    file_size_kb?: number;
  };
  export_recap_failed: { trip_id: string; error: string };
}

/**
 * Performance Events
 */
export interface PerformanceEvents {
  app_loaded: {
    duration_ms: number;
    is_cached: boolean;
    network_type?: string;
  };
  chat_render: {
    trip_id: string;
    message_count: number;
    duration_ms: number;
  };
  page_view: {
    page: string;
    trip_id?: string;
    load_time_ms?: number;
  };
}

/**
 * Error Events
 */
export interface ErrorEvents {
  error_caught: {
    error_type: string;
    error_message: string;
    stack_trace?: string;
    context?: string;
    user_id?: string;
    trip_id?: string;
  };
  crash_detected: {
    error_type: string;
    error_message: string;
    stack_trace?: string;
    fatal: boolean;
  };
}

/**
 * Onboarding Events
 */
export interface OnboardingEvents {
  onboarding_screen_viewed: { screen: number };
  onboarding_completed: Record<string, never>;
  onboarding_skipped: { at_screen: number };
  onboarding_demo_trip_selected: Record<string, never>;
}

// ============================================================================
// Combined Event Map
// ============================================================================

export type TelemetryEventMap = AuthEvents &
  TripEvents &
  MessageEvents &
  PlaceEvents &
  PollEvents &
  TaskEvents &
  ExportEvents &
  PerformanceEvents &
  ErrorEvents &
  OnboardingEvents;

export type TelemetryEventName = keyof TelemetryEventMap;

// ============================================================================
// User & Session Types
// ============================================================================

export interface TelemetryUser {
  id: string;
  email?: string;
  display_name?: string;
  is_pro?: boolean;
  organization_id?: string;
  created_at?: string;
}

export interface TelemetrySession {
  session_id: string;
  started_at: string;
  platform: 'web' | 'ios' | 'android';
  app_version: string;
  device_type: 'desktop' | 'tablet' | 'mobile';
  os?: string;
  browser?: string;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface TelemetryConfig {
  /** Enable/disable telemetry globally */
  enabled: boolean;
  /** Current environment */
  environment: 'development' | 'staging' | 'production';
  /** Enable debug logging to console */
  debug: boolean;
  /** Sample rate for performance events (0-1) */
  performanceSampleRate: number;
  /** PostHog configuration */
  posthog?: {
    apiKey: string;
    apiHost?: string;
  };
  /** Sentry configuration */
  sentry?: {
    dsn: string;
    environment?: string;
    tracesSampleRate?: number;
  };
  /** Mixpanel configuration */
  mixpanel?: {
    token: string;
  };
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Telemetry Provider Interface
 *
 * Implement this interface to add new analytics/crash reporting providers.
 */
export interface TelemetryProvider {
  /** Provider name for debugging */
  name: string;

  /** Initialize the provider */
  init(config: TelemetryConfig): Promise<void>;

  /** Identify a user */
  identify(user: TelemetryUser): void;

  /** Reset user identity (on logout) */
  reset(): void;

  /** Track an event */
  track<E extends TelemetryEventName>(
    event: E,
    properties: TelemetryEventMap[E]
  ): void;

  /** Track a page view */
  page(name: string, properties?: Record<string, unknown>): void;

  /** Capture an error */
  captureError(error: Error, context?: Record<string, unknown>): void;

  /** Flush pending events */
  flush(): Promise<void>;

  /** Shutdown provider */
  shutdown(): Promise<void>;
}

/**
 * Telemetry Event Helpers
 *
 * Convenience functions for tracking common events.
 * These provide type-safe, easy-to-use wrappers around telemetry.track().
 */

import { telemetry } from './service';
import type {
  AuthEvents,
  TripEvents,
  MessageEvents,
  PlaceEvents,
  PollEvents,
  TaskEvents,
  ExportEvents,
  RecommendationEvents,
  ShareExtensionEvents,
  ConciergeEvents,
  SubscriptionEvents,
} from './types';

// ============================================================================
// Auth Events
// ============================================================================

export const authEvents = {
  signupStarted: (method: AuthEvents['signup_started']['method']) => {
    telemetry.track('signup_started', { method });
  },

  signupCompleted: (method: AuthEvents['signup_completed']['method'], userId: string) => {
    telemetry.track('signup_completed', { method, user_id: userId });
  },

  signupFailed: (method: AuthEvents['signup_failed']['method'], error: string) => {
    telemetry.track('signup_failed', { method, error });
  },

  loginStarted: (method: AuthEvents['login_started']['method']) => {
    telemetry.track('login_started', { method });
  },

  loginCompleted: (method: AuthEvents['login_completed']['method'], userId: string) => {
    telemetry.track('login_completed', { method, user_id: userId });
  },

  loginFailed: (method: AuthEvents['login_failed']['method'], error: string) => {
    telemetry.track('login_failed', { method, error });
  },

  logout: (userId: string) => {
    telemetry.track('logout', { user_id: userId });
  },
};

// ============================================================================
// Trip Events
// ============================================================================

export const tripEvents = {
  createStarted: () => {
    telemetry.track('trip_create_started', {});
  },

  created: (params: TripEvents['trip_created']) => {
    telemetry.track('trip_created', params);
  },

  createFailed: (error: string) => {
    telemetry.track('trip_create_failed', { error });
  },

  joinStarted: (tripId: string, method: TripEvents['trip_join_started']['method']) => {
    telemetry.track('trip_join_started', { trip_id: tripId, method });
  },

  joined: (tripId: string, method: TripEvents['trip_joined']['method'], userId: string) => {
    telemetry.track('trip_joined', {
      trip_id: tripId,
      method,
      user_id: userId,
    });
  },

  joinFailed: (tripId: string, method: TripEvents['trip_join_failed']['method'], error: string) => {
    telemetry.track('trip_join_failed', { trip_id: tripId, method, error });
  },

  viewed: (tripId: string, tripType: TripEvents['trip_viewed']['trip_type']) => {
    telemetry.track('trip_viewed', { trip_id: tripId, trip_type: tripType });
  },

  archived: (tripId: string) => {
    telemetry.track('trip_archived', { trip_id: tripId });
  },
};

// ============================================================================
// Message Events
// ============================================================================

export const messageEvents = {
  sent: (params: MessageEvents['message_sent']) => {
    telemetry.track('message_sent', params);
  },

  sendFailed: (tripId: string, error: string) => {
    telemetry.track('message_send_failed', { trip_id: tripId, error });
  },
};

// ============================================================================
// Place Events
// ============================================================================

export const placeEvents = {
  pinned: (params: PlaceEvents['place_pinned']) => {
    telemetry.track('place_pinned', params);
  },

  unpinned: (tripId: string, placeId?: string) => {
    telemetry.track('place_unpinned', { trip_id: tripId, place_id: placeId });
  },

  searched: (tripId: string, query: string, resultsCount: number) => {
    telemetry.track('place_searched', {
      trip_id: tripId,
      query,
      results_count: resultsCount,
    });
  },
};

// ============================================================================
// Poll Events
// ============================================================================

export const pollEvents = {
  created: (params: PollEvents['poll_created']) => {
    telemetry.track('poll_created', params);
  },

  voted: (tripId: string, pollId: string, optionsSelected: number) => {
    telemetry.track('poll_voted', {
      trip_id: tripId,
      poll_id: pollId,
      options_selected: optionsSelected,
    });
  },

  voteChanged: (tripId: string, pollId: string) => {
    telemetry.track('poll_vote_changed', { trip_id: tripId, poll_id: pollId });
  },

  closed: (tripId: string, pollId: string, totalVotes: number) => {
    telemetry.track('poll_closed', {
      trip_id: tripId,
      poll_id: pollId,
      total_votes: totalVotes,
    });
  },
};

// ============================================================================
// Task Events
// ============================================================================

export const taskEvents = {
  created: (params: TaskEvents['task_created']) => {
    telemetry.track('task_created', params);
  },

  completed: (tripId: string, taskId: string, timeToCompleteMs?: number) => {
    telemetry.track('task_completed', {
      trip_id: tripId,
      task_id: taskId,
      time_to_complete_ms: timeToCompleteMs,
    });
  },

  uncompleted: (tripId: string, taskId: string) => {
    telemetry.track('task_uncompleted', { trip_id: tripId, task_id: taskId });
  },

  deleted: (tripId: string, taskId: string) => {
    telemetry.track('task_deleted', { trip_id: tripId, task_id: taskId });
  },
};

// ============================================================================
// Export Events
// ============================================================================

export const exportEvents = {
  recapStarted: (tripId: string, sectionsSelected: string[]) => {
    telemetry.track('export_recap_started', {
      trip_id: tripId,
      sections_selected: sectionsSelected,
    });
  },

  recapCompleted: (params: ExportEvents['export_recap_completed']) => {
    telemetry.track('export_recap_completed', params);
  },

  recapFailed: (tripId: string, error: string) => {
    telemetry.track('export_recap_failed', { trip_id: tripId, error });
  },
};

// ============================================================================
// Page View Helper
// ============================================================================

export const pageView = (
  pageName: string,
  properties?: { trip_id?: string; load_time_ms?: number },
) => {
  telemetry.page(pageName, properties);
  telemetry.track('page_view', {
    page: pageName,
    trip_id: properties?.trip_id,
    load_time_ms: properties?.load_time_ms,
  });
};

// ============================================================================
// Onboarding Events
// ============================================================================

export const onboardingEvents = {
  screenViewed: (screen: number) => {
    telemetry.track('onboarding_screen_viewed', { screen });
  },

  completed: () => {
    telemetry.track('onboarding_completed', {});
  },

  skipped: (atScreen: number) => {
    telemetry.track('onboarding_skipped', { at_screen: atScreen });
  },

  demoTripSelected: () => {
    telemetry.track('onboarding_demo_trip_selected', {});
  },
};

// ============================================================================
// Demo Mode Events
// ============================================================================

// ============================================================================
// Recommendation Events
// ============================================================================

export const recommendationEvents = {
  pageViewed: (params: RecommendationEvents['recommendation_page_viewed']) => {
    telemetry.track('recommendation_page_viewed', params);
  },

  itemViewed: (params: RecommendationEvents['recommendation_item_viewed']) => {
    telemetry.track('recommendation_item_viewed', params);
  },

  itemClicked: (params: RecommendationEvents['recommendation_item_clicked']) => {
    telemetry.track('recommendation_item_clicked', params);
  },

  itemSaved: (params: RecommendationEvents['recommendation_item_saved']) => {
    telemetry.track('recommendation_item_saved', params);
  },

  itemHidden: (params: RecommendationEvents['recommendation_item_hidden']) => {
    telemetry.track('recommendation_item_hidden', params);
  },

  filterApplied: (
    filterType: RecommendationEvents['recommendation_filter_applied']['filter_type'],
    value: string,
  ) => {
    telemetry.track('recommendation_filter_applied', { filter_type: filterType, value });
  },

  search: (query: string, resultsCount: number) => {
    telemetry.track('recommendation_search', { query, results_count: resultsCount });
  },
};

// ============================================================================
// Demo Mode Events
// ============================================================================

export const demoEvents = {
  entered: (source: 'onboarding' | 'toggle' | 'deep_link') => {
    telemetry.track('demo_mode_entered', { source });
    // Store entry timestamp in sessionStorage for duration calc
    try {
      sessionStorage.setItem('demo_mode_start', Date.now().toString());
      sessionStorage.setItem('demo_actions_count', '0');
    } catch {
      // sessionStorage not available
    }
  },

  exited: (exitMethod: 'button' | 'toggle' | 'logout', actionsCount: number) => {
    let duration = 0;
    try {
      const startTime = sessionStorage.getItem('demo_mode_start');
      duration = startTime ? Date.now() - parseInt(startTime, 10) : 0;
      sessionStorage.removeItem('demo_mode_start');
      sessionStorage.removeItem('demo_actions_count');
    } catch {
      // sessionStorage not available
    }
    telemetry.track('demo_mode_exited', {
      duration_ms: duration,
      actions_count: actionsCount,
      exit_method: exitMethod,
    });
  },

  actionPerformed: (
    action: 'message_sent' | 'task_created' | 'payment_added' | 'cover_changed' | 'poll_created',
    tripId: string,
  ) => {
    telemetry.track('demo_action_performed', { action, trip_id: tripId });
    // Increment action counter
    try {
      const count = parseInt(sessionStorage.getItem('demo_actions_count') || '0', 10);
      sessionStorage.setItem('demo_actions_count', (count + 1).toString());
    } catch {
      // sessionStorage not available
    }
  },
};

// ============================================================================
// Share Extension Events
// ============================================================================

export const shareExtensionEvents = {
  opened: (params: ShareExtensionEvents['share_extension_opened']) => {
    telemetry.track('share_extension_opened', params);
  },

  contentReceived: (params: ShareExtensionEvents['share_content_received']) => {
    telemetry.track('share_content_received', params);
  },

  tripSelected: (tripId: string) => {
    telemetry.track('share_trip_selected', { trip_id: tripId });
  },

  destinationSuggested: (params: ShareExtensionEvents['share_destination_suggested']) => {
    telemetry.track('share_destination_suggested', params);
  },

  destinationOverridden: (params: ShareExtensionEvents['share_destination_overridden']) => {
    telemetry.track('share_destination_overridden', params);
  },

  saveStarted: (params: ShareExtensionEvents['share_save_started']) => {
    telemetry.track('share_save_started', params);
  },

  saveSucceeded: (params: ShareExtensionEvents['share_save_succeeded']) => {
    telemetry.track('share_save_succeeded', params);
  },

  saveFailed: (params: ShareExtensionEvents['share_save_failed']) => {
    telemetry.track('share_save_failed', params);
  },

  openInApp: (tripId: string, destination: string) => {
    telemetry.track('share_open_in_app', { trip_id: tripId, destination });
  },

  duplicateDetected: (contentType: string, fingerprint: string) => {
    telemetry.track('share_duplicate_detected', { content_type: contentType, fingerprint });
  },

  unsupportedType: (typeIdentifier: string) => {
    telemetry.track('share_unsupported_type', { type_identifier: typeIdentifier });
  },
};

// ============================================================================
// AI Concierge Events
// ============================================================================

export const conciergeEvents = {
  querySent: (params: ConciergeEvents['concierge_query_sent']) => {
    telemetry.track('concierge_query_sent', params);
  },

  responseReceived: (params: ConciergeEvents['concierge_response_received']) => {
    telemetry.track('concierge_response_received', params);
  },

  error: (params: ConciergeEvents['concierge_error']) => {
    telemetry.track('concierge_error', params);
  },

  toolExecuted: (tripId: string, toolName: string, success: boolean, latencyMs: number) => {
    telemetry.track('concierge_tool_executed', {
      trip_id: tripId,
      tool_name: toolName,
      success,
      latency_ms: latencyMs,
    });
  },
};

// ============================================================================
// Subscription Events
// ============================================================================

export const subscriptionEvents = {
  upgradePromptShown: (surface: string, tripId?: string) => {
    telemetry.track('upgrade_prompt_shown', { surface, trip_id: tripId });
  },

  upgradeStarted: (params: SubscriptionEvents['upgrade_started']) => {
    telemetry.track('upgrade_started', params);
  },

  upgradeCompleted: (plan: string) => {
    telemetry.track('upgrade_completed', { plan });
  },

  upgradeFailed: (plan: string, error: string) => {
    telemetry.track('upgrade_failed', { plan, error });
  },
};

// ============================================================================
// Notification Events
// ============================================================================

export const notificationEvents = {
  clicked: (type: string, tripId?: string) => {
    telemetry.track('notification_clicked', { type, trip_id: tripId });
  },

  pushPermissionPrompted: () => {
    telemetry.track('push_permission_prompted', {});
  },

  pushPermissionGranted: () => {
    telemetry.track('push_permission_granted', {});
  },

  pushPermissionDenied: () => {
    telemetry.track('push_permission_denied', {});
  },
};

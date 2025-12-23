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
} from './types';

// ============================================================================
// Auth Events
// ============================================================================

export const authEvents = {
  signupStarted: (method: AuthEvents['signup_started']['method']) => {
    telemetry.track('signup_started', { method });
  },

  signupCompleted: (
    method: AuthEvents['signup_completed']['method'],
    userId: string
  ) => {
    telemetry.track('signup_completed', { method, user_id: userId });
  },

  signupFailed: (
    method: AuthEvents['signup_failed']['method'],
    error: string
  ) => {
    telemetry.track('signup_failed', { method, error });
  },

  loginStarted: (method: AuthEvents['login_started']['method']) => {
    telemetry.track('login_started', { method });
  },

  loginCompleted: (
    method: AuthEvents['login_completed']['method'],
    userId: string
  ) => {
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

  joinStarted: (
    tripId: string,
    method: TripEvents['trip_join_started']['method']
  ) => {
    telemetry.track('trip_join_started', { trip_id: tripId, method });
  },

  joined: (
    tripId: string,
    method: TripEvents['trip_joined']['method'],
    userId: string
  ) => {
    telemetry.track('trip_joined', {
      trip_id: tripId,
      method,
      user_id: userId,
    });
  },

  joinFailed: (
    tripId: string,
    method: TripEvents['trip_join_failed']['method'],
    error: string
  ) => {
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
  properties?: { trip_id?: string; load_time_ms?: number }
) => {
  telemetry.page(pageName, properties);
  telemetry.track('page_view', {
    page: pageName,
    trip_id: properties?.trip_id,
    load_time_ms: properties?.load_time_ms,
  });
};

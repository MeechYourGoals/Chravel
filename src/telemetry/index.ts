/**
 * Telemetry Module
 *
 * Centralized analytics and crash reporting for Chravel.
 *
 * @example
 * ```ts
 * import { telemetry, authEvents, tripEvents } from '@/telemetry';
 *
 * // Initialize at app startup
 * await telemetry.init();
 *
 * // Track events using helpers
 * authEvents.loginCompleted('email', user.id);
 * tripEvents.created({ trip_id: '123', trip_type: 'consumer' });
 *
 * // Or track directly
 * telemetry.track('message_sent', { trip_id: '123', ... });
 *
 * // Capture errors
 * telemetry.captureError(error, { context: 'PaymentFlow' });
 * ```
 */

// Core service
export { telemetry } from './service';

// Event helpers
export {
  authEvents,
  tripEvents,
  messageEvents,
  placeEvents,
  pollEvents,
  taskEvents,
  exportEvents,
  pageView,
} from './events';

// Performance utilities
export {
  PerformanceTimer,
  startAppLoadTiming,
  markAppLoad,
  reportAppLoaded,
  startChatRenderTiming,
  reportChatRendered,
  trackTimed,
  observeLongTasks,
  reportWebVitals,
} from './performance';

// React hooks
export {
  usePageTracking,
  useTelemetryIdentify,
  useChatPerformance,
  useTelemetryError,
  useOperationTiming,
} from './hooks';

// Types
export type {
  TelemetryConfig,
  TelemetryEventMap,
  TelemetryEventName,
  TelemetryProvider,
  TelemetryUser,
  TelemetrySession,
  AuthEvents,
  TripEvents,
  MessageEvents,
  PlaceEvents,
  PollEvents,
  TaskEvents,
  ExportEvents,
  PerformanceEvents,
  ErrorEvents,
} from './types';

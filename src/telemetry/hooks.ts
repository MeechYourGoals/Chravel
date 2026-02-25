/**
 * Telemetry React Hooks
 *
 * React hooks for integrating telemetry into components.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry, pageView, startChatRenderTiming, reportChatRendered } from './index';
import type { TelemetryUser } from './types';

// ============================================================================
// Page View Hook
// ============================================================================

/**
 * Track page views automatically when route changes.
 * Place this hook in your App or layout component.
 */
export function usePageTracking(): void {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    // Skip if same path (prevents double tracking)
    if (location.pathname === previousPath.current) {
      return;
    }

    previousPath.current = location.pathname;

    // Derive page name from path
    const pageName = derivePageName(location.pathname);

    // Extract trip ID if present
    const tripIdMatch = location.pathname.match(/\/trip\/([^/]+)/);
    const tripId = tripIdMatch ? tripIdMatch[1] : undefined;

    pageView(pageName, { trip_id: tripId });
  }, [location.pathname]);
}

/**
 * Derive a human-readable page name from a path.
 */
function derivePageName(path: string): string {
  // Remove leading slash and split
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return 'Home';
  }

  // Handle common patterns
  const pagePatterns: Record<string, string> = {
    trip: 'Trip Detail',
    trips: 'Trips List',
    settings: 'Settings',
    profile: 'Profile',
    auth: 'Auth',
    login: 'Login',
    signup: 'Signup',
    join: 'Join Trip',
    invite: 'Invite',
    pricing: 'Pricing',
    onboarding: 'Onboarding',
    admin: 'Admin',
    organization: 'Organization',
  };

  const firstSegment = segments[0];
  const baseName = pagePatterns[firstSegment] || capitalizeFirst(firstSegment);

  // Add context for nested pages
  if (segments.length > 1) {
    // For trip subpages
    if (firstSegment === 'trip' && segments.length > 2) {
      const subPage = capitalizeFirst(segments[2]);
      return `Trip ${subPage}`;
    }
  }

  return baseName;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// ============================================================================
// User Identification Hook
// ============================================================================

/**
 * Identify user for telemetry when auth state changes.
 * Place this hook in your auth provider or App component.
 */
export function useTelemetryIdentify(user: TelemetryUser | null): void {
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== previousUserId.current) {
      telemetry.identify(user);
      previousUserId.current = user.id;
    } else if (!user && previousUserId.current) {
      telemetry.reset();
      previousUserId.current = null;
    }
  }, [user]);
}

// ============================================================================
// Chat Performance Hook
// ============================================================================

/**
 * Track chat render performance.
 * Use in chat components to measure time to first render.
 */
export function useChatPerformance(
  tripId: string | undefined,
  messages: unknown[],
  isLoading: boolean,
): void {
  const timerStarted = useRef(false);
  const reported = useRef(false);

  // Start timer when component mounts with tripId
  useEffect(() => {
    if (tripId && !timerStarted.current) {
      startChatRenderTiming(tripId);
      timerStarted.current = true;
    }
  }, [tripId]);

  // Report when messages are loaded
  useEffect(() => {
    if (tripId && timerStarted.current && !reported.current && !isLoading && messages.length > 0) {
      reportChatRendered(tripId, messages.length);
      reported.current = true;
    }
  }, [tripId, messages.length, isLoading]);

  // Reset on tripId change
  useEffect(() => {
    return () => {
      timerStarted.current = false;
      reported.current = false;
    };
  }, [tripId]);
}

// ============================================================================
// Error Boundary Hook
// ============================================================================

/**
 * Capture component errors for telemetry.
 * Use with React error boundaries.
 */
export function useTelemetryError(): {
  captureError: (error: Error, errorInfo?: { componentStack?: string }) => void;
} {
  const captureError = useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    telemetry.captureError(error, {
      component_stack: errorInfo?.componentStack,
      url: window.location.href,
    });
  }, []);

  return { captureError };
}

// ============================================================================
// Timing Hook
// ============================================================================

/**
 * Hook for measuring operation duration.
 * Useful for tracking async operations in components.
 */
export function useOperationTiming(operationName: string): {
  startTiming: () => void;
  endTiming: () => number;
} {
  const startTime = useRef<number | null>(null);

  const startTiming = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTiming = useCallback((): number => {
    if (startTime.current === null) {
      return 0;
    }

    const duration = Math.round(performance.now() - startTime.current);
    startTime.current = null;

    if (import.meta.env.DEV) {
      console.log(`[Timing] ${operationName}: ${duration}ms`);
    }

    return duration;
  }, [operationName]);

  return { startTiming, endTiming };
}

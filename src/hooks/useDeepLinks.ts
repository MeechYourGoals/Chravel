/**
 * Deep Links Hook
 *
 * Handles Universal Links and Custom URL Scheme navigation for iOS.
 *
 * Usage:
 * ```tsx
 * // In a component inside Router context (e.g., App.tsx after BrowserRouter)
 * function DeepLinkHandler() {
 *   useDeepLinks();
 *   return null;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { attachNavigator } from '@/native/lifecycle';

/**
 * Parse deep link URL and return React Router path
 */
function parseDeepLinkUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Handle custom scheme (chravel://path)
    if (parsed.protocol === 'chravel:') {
      // chravel://trip/abc123 -> /trip/abc123
      return parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
    }

    // Handle universal links (https://chravel.app/path)
    if (parsed.hostname === 'chravel.app' || parsed.hostname === 'www.chravel.app') {
      return parsed.pathname + parsed.search;
    }

    // Fallback: use the pathname if it looks like a valid route
    if (parsed.pathname.startsWith('/')) {
      return parsed.pathname + parsed.search;
    }

    return null;
  } catch {
    // If URL parsing fails, try to extract path directly
    // Handle cases like chravel://trip/abc123
    if (url.startsWith('chravel://')) {
      const path = url.replace('chravel://', '');
      return path.startsWith('/') ? path : `/${path}`;
    }
    return null;
  }
}

/**
 * Hook to handle deep links in the app.
 *
 * Registers listeners for:
 * - appUrlOpen: Handles both Universal Links and Custom URL Scheme
 *
 * Also attaches the React Router navigate function to the lifecycle module
 * for cold-start push notification routing.
 */
export function useDeepLinks(): void {
  const navigate = useNavigate();
  const listenerRef = useRef<{ remove: () => Promise<void> } | null>(null);

  useEffect(() => {
    // Skip on web
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Attach navigator for push notification cold-start routing
    const detachNavigator = attachNavigator(navigate);

    // Handle deep links when app is opened with URL
    const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
      console.log('[DeepLinks] App opened with URL:', event.url);

      const path = parseDeepLinkUrl(event.url);
      if (path) {
        console.log('[DeepLinks] Navigating to:', path);
        navigate(path);
      } else {
        console.warn('[DeepLinks] Could not parse URL:', event.url);
      }
    };

    // Register listener
    App.addListener('appUrlOpen', handleAppUrlOpen)
      .then(handle => {
        listenerRef.current = handle;
      })
      .catch(error => {
        console.error('[DeepLinks] Failed to register listener:', error);
      });

    // Check if app was opened with URL (cold start)
    App.getLaunchUrl()
      .then(result => {
        if (result?.url) {
          console.log('[DeepLinks] App launched with URL:', result.url);
          const path = parseDeepLinkUrl(result.url);
          if (path) {
            // Delay slightly to ensure router is ready
            setTimeout(() => navigate(path), 100);
          }
        }
      })
      .catch(error => {
        console.error('[DeepLinks] Failed to get launch URL:', error);
      });

    return () => {
      detachNavigator();
      if (listenerRef.current) {
        listenerRef.current.remove().catch(console.error);
        listenerRef.current = null;
      }
    };
  }, [navigate]);
}

/**
 * Supported deep link routes:
 *
 * Trip routes:
 * - /trip/:tripId
 * - /trip/:tripId?tab=chat
 * - /trip/:tripId?tab=media
 * - /trip/:tripId?tab=calendar
 * - /trip/:tripId?tab=pay
 * - /trip/:tripId?tab=ai
 *
 * Pro/Event routes:
 * - /tour/pro/:tripId
 * - /event/:eventId
 *
 * Invite routes:
 * - /join/:inviteCode
 * - /invite/:token
 *
 * Organization routes:
 * - /organization/:orgId
 *
 * User routes:
 * - /profile/:userId
 *
 * Other:
 * - /settings
 * - /archive
 * - /share/:shareId
 */

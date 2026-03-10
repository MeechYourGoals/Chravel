/**
 * Platform-agnostic navigation utilities
 * Web: Uses react-router-dom
 * Mobile: Will use React Navigation or native routing
 */

import { Capacitor } from '@capacitor/core';

export interface NavigationOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface NavigationService {
  openURL: (url: string, external?: boolean) => void;
  canOpenURL: (url: string) => boolean;
  goBack: () => void;
}

class WebNavigation implements NavigationService {
  openURL(url: string, external = true): void {
    if (external) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  canOpenURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  goBack(): void {
    window.history.back();
  }
}

export const platformNavigation: NavigationService = new WebNavigation();

/**
 * Open an external URL safely on both web and native.
 *
 * On web: opens in a new tab via window.open.
 * On native (Capacitor): uses window.location.assign to stay in the WebView,
 * since window.open('_blank') is blocked or opens in external Safari.
 *
 * Use this for checkout URLs, customer portals, and any external link that
 * the user should return from (e.g., Stripe Checkout with a return URL).
 */
export function openExternalUrl(url: string): void {
  if (Capacitor.isNativePlatform()) {
    window.location.assign(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Note: For in-app navigation with React Router, continue using:
 * - useNavigate() hook
 * - Link component
 * - Navigate component
 *
 * This service is for platform-level navigation utilities (external URLs, back button)
 */

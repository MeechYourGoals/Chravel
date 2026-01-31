/**
 * Platform-agnostic navigation utilities
 *
 * Web: Uses window.open / window.location
 * Capacitor (native): Uses @capacitor/browser for external URLs,
 *   falls back to window.open on web.
 *
 * For in-app SPA navigation, always use React Router (useNavigate / <Link>).
 * This module is for external URLs, platform intents (mailto:, tel:, sms:),
 * and a safe fallback for non-React contexts (toast callbacks, etc.).
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

/**
 * Open an external URL in the best available browser.
 * On native Capacitor: dynamically imports @capacitor/browser to open an in-app browser.
 * On web: uses window.open.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      // @capacitor/browser not installed — fall through to web fallback
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Navigate to an in-app route. Safe to call from non-React contexts
 * (toast callbacks, vanilla event handlers). Uses React Router if attached,
 * otherwise falls back to window.location.href.
 */
let _navigate: ((path: string) => void) | null = null;

export function attachRouterNavigate(fn: (path: string) => void): void {
  _navigate = fn;
}

export function navigateInApp(path: string): void {
  if (_navigate) {
    _navigate(path);
  } else {
    // Fallback: full page nav — still works in both web and Capacitor
    window.location.href = path;
  }
}

/**
 * Determine whether a URL is an external link (http(s)://, mailto:, tel:, sms:)
 * vs an internal SPA route (starts with /).
 */
export function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|sms:)/.test(url);
}

/**
 * Smart navigation: routes external URLs to openExternalUrl, internal to navigateInApp.
 */
export function smartNavigate(url: string): void {
  if (isExternalUrl(url)) {
    void openExternalUrl(url);
  } else {
    navigateInApp(url);
  }
}

class WebNavigation implements NavigationService {
  openURL(url: string, external = true): void {
    if (external) {
      void openExternalUrl(url);
    } else {
      navigateInApp(url);
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
 * Note: For in-app navigation with React Router, continue using:
 * - useNavigate() hook
 * - Link component
 * - Navigate component
 *
 * This service is for platform-level navigation utilities (external URLs, back button)
 */

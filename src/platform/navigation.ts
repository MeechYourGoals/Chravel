/**
 * Platform-agnostic external URL handler.
 *
 * On web: opens in a new tab via window.open.
 * On native (Capacitor): uses window.location.assign to stay in the WebView,
 * since window.open('_blank') is blocked or opens in external Safari.
 *
 * Use this for checkout URLs, customer portals, and any external link that
 * the user should return from (e.g., Stripe Checkout with a return URL).
 */

import { Capacitor } from '@capacitor/core';

export function openExternalUrl(url: string): void {
  if (Capacitor.isNativePlatform()) {
    window.location.assign(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

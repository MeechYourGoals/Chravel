/**
 * Despia Environment Detection & Utilities
 *
 * Provides environment detection for Despia native apps and
 * standardized wrappers for Despia-specific functionality.
 *
 * Despia userAgent patterns:
 * - iOS: "despia-iphone" or "despia-ipad"
 * - Android: "despia-android"
 *
 * Usage:
 *   import { isDespia, despiaDevice, safeDespia } from '@/native/despia';
 *
 *   if (isDespia()) {
 *     // Use native features
 *     await safeDespia('lighthaptic://');
 *   }
 */

import { despia } from '@/lib/despia';

export type DespiaDevice = 'iphone' | 'ipad' | 'android' | 'web';

export interface ContactMap {
  [name: string]: string[];
}

/**
 * Check if running in Despia native environment
 */
export function isDespia(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.toLowerCase().includes('despia');
}

/**
 * Check if running in Despia on iOS
 */
export function isDespiaIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('despia-iphone') || ua.includes('despia-ipad');
}

/**
 * Check if running in Despia on Android
 */
export function isDespiaAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.toLowerCase().includes('despia-android');
}

/**
 * Get the Despia device type
 */
export function getDespiaDevice(): DespiaDevice {
  if (typeof navigator === 'undefined') return 'web';

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('despia-iphone')) return 'iphone';
  if (ua.includes('despia-ipad')) return 'ipad';
  if (ua.includes('despia-android')) return 'android';

  return 'web';
}

/**
 * Safely execute a Despia command with web fallback
 *
 * @param scheme - Despia URL scheme (e.g., 'lighthaptic://')
 * @param returnKeys - Optional array of keys to extract from response
 * @param webFallback - Optional fallback function for web
 */
export async function safeDespia<T = unknown>(
  scheme: string,
  returnKeys?: string[],
  webFallback?: () => T | Promise<T>,
): Promise<T | null> {
  // Not in Despia environment
  if (!isDespia()) {
    if (webFallback) {
      return webFallback();
    }
    return null;
  }

  try {
    if (returnKeys && returnKeys.length > 0) {
      return (await despia(scheme, returnKeys)) as T;
    }
    return (await despia(scheme)) as T;
  } catch (error) {
    console.warn('[Despia] Command failed:', scheme, error);
    if (webFallback) {
      return webFallback();
    }
    return null;
  }
}

/**
 * Execute Despia command only if in Despia environment
 * (fire-and-forget, no return value expected)
 */
export function despiaIfNative(scheme: string): void {
  if (!isDespia()) return;

  try {
    despia(scheme);
  } catch (error) {
    console.warn('[Despia] Fire-and-forget failed:', scheme, error);
  }
}

// ============================================
// Despia-specific native commands
// ============================================

/**
 * Show native loading spinner
 */
export function showSpinner(): void {
  despiaIfNative('spinneron://');
}

/**
 * Hide native loading spinner
 */
export function hideSpinner(): void {
  despiaIfNative('spinneroff://');
}

/**
 * Enter full-screen mode (hide navigation bars)
 */
export function enterFullScreen(): void {
  despiaIfNative('hidebars://on');
}

/**
 * Exit full-screen mode (show navigation bars)
 */
export function exitFullScreen(): void {
  despiaIfNative('hidebars://off');
}

/**
 * Set status bar color
 * @param rgb - RGB values as {r, g, b} or array [r, g, b]
 */
export function setStatusBarColor(
  rgb: { r: number; g: number; b: number } | [number, number, number],
): void {
  const [r, g, b] = Array.isArray(rgb) ? rgb : [rgb.r, rgb.g, rgb.b];
  despiaIfNative(`statusbarcolor://{${r}, ${g}, ${b}}`);
}

/**
 * Request contact permission
 */
export async function requestContactPermission(): Promise<boolean> {
  if (!isDespia()) return false;

  try {
    await despia('requestcontactpermission://');
    return true;
  } catch {
    return false;
  }
}

/**
 * Read device contacts
 * @returns Map of contact names to phone numbers or null if not available
 */
export async function readContacts(): Promise<ContactMap | null> {
  if (!isDespia()) return null;

  try {
    const result = await despia('readcontacts://', ['contacts']);
    return (result as { contacts?: ContactMap })?.contacts || null;
  } catch {
    return null;
  }
}

/**
 * Register for push notifications
 */
export function registerForPush(): void {
  despiaIfNative('registerpush://');
}

/**
 * Get OneSignal player ID for push notifications
 */
export async function getOneSignalPlayerId(): Promise<string | null> {
  return safeDespia<{ onesignalplayerid?: string }>('getonesignalplayerid://', [
    'onesignalplayerid',
  ]).then(result => result?.onesignalplayerid || null);
}

/**
 * Send a local push notification
 * @param title - Notification title
 * @param body - Notification body
 * @param delaySeconds - Delay in seconds before showing
 */
export function sendLocalPush(title: string, body: string, delaySeconds: number = 0): void {
  const encoded = encodeURIComponent(JSON.stringify({ title, body, delay: delaySeconds }));
  despiaIfNative(`sendlocalpushmsg://${encoded}`);
}

/**
 * Share content via native share sheet
 * @param message - Message to share
 * @param url - Optional URL to include
 */
export function shareApp(message: string, url?: string): void {
  const params = new URLSearchParams();
  params.set('message', message);
  if (url) params.set('url', url);
  despiaIfNative(`shareapp://?${params.toString()}`);
}

// Re-export the core despia function for direct use
export { despia } from '@/lib/despia';

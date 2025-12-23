/**
 * Minimal native app lifecycle + notification tap routing for Capacitor (iOS-first).
 *
 * Goals:
 * - Detect foreground/background transitions and notify subscribers.
 * - Provide a safe way to refresh critical data on resume.
 * - Ensure push notification taps route correctly even from cold start by
 *   capturing the route early and flushing once React Router is ready.
 * - Maintain iOS app icon badge count via Capacitor Local Notifications API.
 */
 
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { App, type AppState } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, type ActionPerformed } from '@capacitor/push-notifications';
import { buildRouteFromPayload } from '@/native/pushRouting';
import { isNativePush, parsePayload } from '@/native/push';
 
type VoidOrPromise = void | Promise<void>;
type NavigateFn = (path: string) => void;
 
const PENDING_PUSH_ROUTE_KEY = 'chravel:pending_push_route';
 
let initialized = false;
let isActive = true;
let navigateFn: NavigateFn | null = null;
let lastResumeAtMs = 0;
 
const resumeHandlers = new Set<() => VoidOrPromise>();
const backgroundHandlers = new Set<() => VoidOrPromise>();
 
const listenerHandles: PluginListenerHandle[] = [];
 
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
 
function safeGetSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
 
function safeSetSessionItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage failures (private mode, disabled storage, etc.)
  }
}
 
function safeRemoveSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
 
function setPendingPushRoute(route: string): void {
  safeSetSessionItem(PENDING_PUSH_ROUTE_KEY, route);
}
 
function getPendingPushRoute(): string | null {
  return safeGetSessionItem(PENDING_PUSH_ROUTE_KEY);
}
 
function clearPendingPushRoute(): void {
  safeRemoveSessionItem(PENDING_PUSH_ROUTE_KEY);
}
 
function flushPendingPushRoute(): void {
  if (!navigateFn) return;
 
  const pending = getPendingPushRoute();
  if (!pending) return;
 
  clearPendingPushRoute();
  navigateFn(pending);
}
 
async function runHandlersSafely(handlers: Set<() => VoidOrPromise>): Promise<void> {
  const runs = Array.from(handlers).map(async handler => {
    try {
      await handler();
    } catch (error) {
      console.error('[Lifecycle] Handler failed:', error);
    }
  });
 
  await Promise.all(runs);
}
 
async function handleResume(_source: 'appStateChange' | 'resume'): Promise<void> {
  // Debounce rapid state flaps.
  const now = Date.now();
  if (now - lastResumeAtMs < 1500) return;
  lastResumeAtMs = now;
 
  isActive = true;
  flushPendingPushRoute();
  await runHandlersSafely(resumeHandlers);
}
 
async function handleBackground(): Promise<void> {
  isActive = false;
  await runHandlersSafely(backgroundHandlers);
}
 
function onAppStateChange(state: AppState): void {
  if (state.isActive) {
    void handleResume('appStateChange');
  } else {
    void handleBackground();
  }
}
 
function onPushActionPerformed(action: ActionPerformed): void {
  const payload = parsePayload(action.notification.data ?? {});
  if (!payload) return;
 
  const route = buildRouteFromPayload(payload);
  setPendingPushRoute(route);
 
  // If React Router is ready, route immediately.
  flushPendingPushRoute();
}
 
/**
 * Initialize native lifecycle listeners.
 *
 * Call as early as possible (e.g. `src/main.tsx`) so cold-start notification taps
 * are captured before React Router mounts.
 */
export function initNativeLifecycle(): void {
  if (initialized) return;
  initialized = true;
 
  if (!isNativePlatform()) return;
 
  // Recover any pending push route from a prior cold start.
  // (We flush once a navigator is attached.)
  getPendingPushRoute();
 
  App.addListener('appStateChange', onAppStateChange)
    .then(handle => listenerHandles.push(handle))
    .catch(error => {
      console.error('[Lifecycle] Failed to listen for appStateChange:', error);
    });
 
  App.addListener('resume', () => void handleResume('resume'))
    .then(handle => listenerHandles.push(handle))
    .catch(error => {
      console.error('[Lifecycle] Failed to listen for resume:', error);
    });
 
  App.addListener('pause', () => void handleBackground())
    .then(handle => listenerHandles.push(handle))
    .catch(error => {
      console.error('[Lifecycle] Failed to listen for pause:', error);
    });
 
  // Capture push taps (background/killed state). We only register this listener
  // in this module (not via `useNativePush`) to ensure cold-start routing works.
  if (isNativePush()) {
    PushNotifications.addListener('pushNotificationActionPerformed', onPushActionPerformed)
      .then(handle => listenerHandles.push(handle))
      .catch(error => {
        console.error('[Lifecycle] Failed to listen for push taps:', error);
      });
  }
}
 
/**
 * Attach a React Router navigate function to flush pending navigation.
 * Returns a cleanup function that detaches the navigator.
 */
export function attachNavigator(navigate: NavigateFn): () => void {
  navigateFn = navigate;
  flushPendingPushRoute();
 
  return () => {
    if (navigateFn === navigate) {
      navigateFn = null;
    }
  };
}
 
/**
 * Subscribe to native resume events (foreground).
 */
export function onNativeResume(handler: () => VoidOrPromise): () => void {
  resumeHandlers.add(handler);
  return () => {
    resumeHandlers.delete(handler);
  };
}
 
/**
 * Subscribe to native background events.
 */
export function onNativeBackground(handler: () => VoidOrPromise): () => void {
  backgroundHandlers.add(handler);
  return () => {
    backgroundHandlers.delete(handler);
  };
}
 
export function getIsActive(): boolean {
  return isActive;
}
 
/**
 * Set iOS app icon badge count (no-op on web).
 *
 * Uses Capacitor Local Notifications plugin so we don't need a separate badge plugin.
 */
export async function setNativeBadgeCount(count: number): Promise<void> {
  if (!isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable('LocalNotifications')) return;
 
  const nextCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
 
  try {
    const currentPerms = await LocalNotifications.checkPermissions();
    if (currentPerms.display !== 'granted') {
      const requested = await LocalNotifications.requestPermissions();
      if (requested.display !== 'granted') {
        return;
      }
    }
 
    await LocalNotifications.setBadgeCount({ count: nextCount });
  } catch (error) {
    console.error('[Lifecycle] Failed to set badge count:', error);
  }
}
 
export async function clearNativeBadge(): Promise<void> {
  await setNativeBadgeCount(0);
}
 

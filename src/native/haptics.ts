/**
 * Native Haptics Wrapper (Capacitor)
 *
 * Requirements:
 * - Must NOT run on web (hard-gated behind native detection).
 * - Exposes small UX-mapped helpers: light/medium/heavy + success/warning/error.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Returns true only when running inside a Capacitor native shell AND the
 * Haptics plugin is available.
 */
export function isNativeHaptics(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics');
}

async function safeRun(fn: () => Promise<void>): Promise<void> {
  // Hard gate: never even attempt haptics on web.
  if (!isNativeHaptics()) return;

  try {
    await fn();
  } catch (error) {
    // Non-blocking: haptics should never crash UX flows.
    if (import.meta.env.DEV) {
       
      console.warn('[Haptics] Failed to trigger haptic:', error);
    }
  }
}

export async function light(): Promise<void> {
  await safeRun(() => Haptics.impact({ style: ImpactStyle.Light }));
}

export async function medium(): Promise<void> {
  await safeRun(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

export async function heavy(): Promise<void> {
  await safeRun(() => Haptics.impact({ style: ImpactStyle.Heavy }));
}

export async function success(): Promise<void> {
  await safeRun(() => Haptics.notification({ type: NotificationType.Success }));
}

export async function warning(): Promise<void> {
  await safeRun(() => Haptics.notification({ type: NotificationType.Warning }));
}

export async function error(): Promise<void> {
  await safeRun(() => Haptics.notification({ type: NotificationType.Error }));
}


/**
 * Backwards-compatible haptics service.
 *
 * IMPORTANT:
 * - Must not run on web. All methods are hard-gated behind native detection.
 * - Delegates to `src/native/haptics.ts` (Capacitor Haptics plugin).
 */

import * as nativeHaptics from '@/native/haptics';

class HapticService {
  async light(): Promise<void> {
    await nativeHaptics.light();
  }

  async medium(): Promise<void> {
    await nativeHaptics.medium();
  }

  async heavy(): Promise<void> {
    await nativeHaptics.heavy();
  }

  async success(): Promise<void> {
    await nativeHaptics.success();
  }

  async warning(): Promise<void> {
    await nativeHaptics.warning();
  }

  async error(): Promise<void> {
    await nativeHaptics.error();
  }

  // Legacy alias (not currently used, but kept to avoid regressions)
  async celebration(): Promise<void> {
    await nativeHaptics.success();
  }

  /**
   * Selection changed haptic - iOS selection feedback
   * Used for picker changes, list selection, tab changes, etc.
   */
  async selectionChanged(): Promise<void> {
    await nativeHaptics.selectionChanged();
  }

  /**
   * Simple vibration for attention
   */
  async vibrate(duration: number = 300): Promise<void> {
    await nativeHaptics.vibrate(duration);
  }
}

export const hapticService = new HapticService();

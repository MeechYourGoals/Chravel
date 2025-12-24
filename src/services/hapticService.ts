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
}

export const hapticService = new HapticService();

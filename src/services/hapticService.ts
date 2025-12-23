// Haptic feedback service
// Web: Uses navigator.vibrate where available (mobile browsers)
// Native: Provided by the native shell when enabled (e.g., via Capacitor plugins)

class HapticService {
  private canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  private vibrate(pattern: number | number[]): void {
    if (!this.canVibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or blocked - silently ignore
    }
  }

  async light(): Promise<void> {
    this.vibrate(10);
  }

  async medium(): Promise<void> {
    this.vibrate(20);
  }

  async heavy(): Promise<void> {
    this.vibrate(30);
  }

  async success(): Promise<void> {
    // Double tap pattern for success
    this.vibrate([10, 50, 10]);
  }

  async celebration(): Promise<void> {
    // Celebration pattern: medium, pause, light, light
    this.vibrate([20, 100, 10, 50, 10]);
  }
}

export const hapticService = new HapticService();

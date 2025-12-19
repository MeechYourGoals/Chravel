// Haptic feedback service (web stub - native haptics in Flutter)

class HapticService {
  async light(): Promise<void> {
    // No haptic feedback on web
  }

  async medium(): Promise<void> {
    // No haptic feedback on web
  }

  async heavy(): Promise<void> {
    // No haptic feedback on web
  }

  async success(): Promise<void> {
    // No haptic feedback on web
  }

  async celebration(): Promise<void> {
    // No haptic feedback on web
  }
}

export const hapticService = new HapticService();

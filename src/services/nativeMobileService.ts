// Web-first mobile service stubs (native functionality can be provided by a native shell)

export class NativeMobileService {
  private static isNative = false; // Always false on web

  static async initialize(): Promise<void> {
    // No-op on web
  }

  // Camera Integration (web fallback)
  static async takePhoto(): Promise<{ dataUrl: string; path: string } | null> {
    return null; // Use capacitorIntegration.takePicture() instead
  }

  static async selectFromGallery(): Promise<{ dataUrl: string; path: string } | null> {
    return null;
  }

  // Location Services (web implementation)
  static async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null> {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
      );
    });
  }

  static async watchLocation(
    callback: (location: { latitude: number; longitude: number }) => void,
  ): Promise<string | null> {
    if (!navigator.geolocation) return null;
    const watchId = navigator.geolocation.watchPosition(pos => {
      callback({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    });
    return String(watchId);
  }

  // Notifications (no-op on web)
  static async scheduleLocalNotification(): Promise<void> {
    console.warn('Local notifications not available on web');
  }

  // Haptic Feedback (no-op on web)
  static async triggerHaptic(): Promise<void> {
    // No haptic feedback on web
  }

  // Platform Detection (always web)
  static isNativeDevice(): boolean {
    return false;
  }

  static isIOSDevice(): boolean {
    return false;
  }

  static isAndroidDevice(): boolean {
    return false;
  }

  static getPlatform(): string {
    return 'web';
  }

  // Performance Monitoring (no-op)
  static trackNativePerformance(): () => void {
    return () => {}; // No-op cleanup
  }
}

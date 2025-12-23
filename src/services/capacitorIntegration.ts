// Web-first implementation. When packaged in a native shell, this is the seam for Capacitor plugins.

export class CapacitorIntegrationService {
  private static instance: CapacitorIntegrationService;

  private constructor() {}

  static getInstance(): CapacitorIntegrationService {
    if (!CapacitorIntegrationService.instance) {
      CapacitorIntegrationService.instance = new CapacitorIntegrationService();
    }
    return CapacitorIntegrationService.instance;
  }

  async initializeApp(): Promise<void> {
    // No-op on web. Native initialization can be added when Capacitor is enabled.
    return;
  }

  async takePicture(): Promise<{ dataUrl: string } | null> {
    // Web fallback: Use file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: reader.result as string });
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  async selectImage(): Promise<{ dataUrl: string } | null> {
    return this.takePicture(); // Same implementation for web
  }

  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null)
      );
    });
  }

  async shareContent(title: string, text: string, url?: string): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async saveFile(): Promise<string | null> {
    // Not supported on web without Capacitor
    console.warn('File saving not available on web');
    return null;
  }

  async scheduleLocalNotification(): Promise<void> {
    // Web Push would require service worker setup
    console.warn('Local notifications not available on web');
  }

  isNativePlatform(): boolean {
    return false; // Always false now - web only
  }

  getPlatform(): string {
    return 'web';
  }
}

export const capacitorIntegration = CapacitorIntegrationService.getInstance();

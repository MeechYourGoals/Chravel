/**
 * Platform-agnostic push notification handling
 * Web: Uses Web Push API / Service Workers
 * Mobile: Implemented by the native shell (e.g., via Capacitor plugins)
 */

export interface PushNotificationToken {
  value: string;
  platform: 'web' | 'ios' | 'android';
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationService {
  register: () => Promise<PushNotificationToken | null>;
  requestPermission: () => Promise<boolean>;
  onNotification: (callback: (notification: PushNotification) => void) => () => void;
  onTokenRefresh: (callback: (token: PushNotificationToken) => void) => () => void;
}

class WebPushNotificationService implements PushNotificationService {
  private notificationCallback: ((notification: PushNotification) => void) | null = null;
  private tokenCallback: ((token: PushNotificationToken) => void) | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async register(): Promise<PushNotificationToken | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      });

      const token: PushNotificationToken = {
        value: JSON.stringify(subscription),
        platform: 'web'
      };

      return token;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  onNotification(callback: (notification: PushNotification) => void): () => void {
    this.notificationCallback = callback;

    // Listen for message events from service worker
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'push-notification') {
        callback(event.data.notification);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handler);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handler);
      this.notificationCallback = null;
    };
  }

  onTokenRefresh(callback: (token: PushNotificationToken) => void): () => void {
    this.tokenCallback = callback;
    // Web push tokens don't typically refresh, but we provide the interface
    return () => {
      this.tokenCallback = null;
    };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array<ArrayBuffer>;
  }
}

export const pushNotificationService: PushNotificationService = new WebPushNotificationService();

// Helper to check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

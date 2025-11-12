
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

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
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await this.initializeStatusBar();
    await this.initializePushNotifications();
    await this.initializeLocalNotifications();
  }

  private async initializeStatusBar(): Promise<void> {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error initializing status bar:', error);
      }
    }
  }

  private async initializePushNotifications(): Promise<void> {
    try {
      await PushNotifications.requestPermissions();
      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        // Push registration successful
      });

      PushNotifications.addListener('registrationError', (error) => {
        if (import.meta.env.DEV) {
          console.error('Error on registration: ' + JSON.stringify(error));
        }
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Push notification received
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        // Push notification action performed
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error initializing push notifications:', error);
      }
    }
  }

  private async initializeLocalNotifications(): Promise<void> {
    try {
      await LocalNotifications.requestPermissions();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error initializing local notifications:', error);
      }
    }
  }

  async takePicture(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      return image.webPath || null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error taking picture:', error);
      }
      return null;
    }
  }

  async selectImage(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      return image.webPath || null;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error selecting image:', error);
      }
      return null;
    }
  }

  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      // Return the Capacitor position object directly (it's compatible with GeolocationPosition)
      return coordinates as GeolocationPosition;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error getting current position:', error);
      }
      return null;
    }
  }

  async shareContent(title: string, text: string, url?: string): Promise<boolean> {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share Trip'
      });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error sharing content:', error);
      }
      return false;
    }
  }

  async saveFile(data: string, filename: string): Promise<string | null> {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: data,
        directory: Directory.Documents
      });

      return result.uri;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving file:', error);
      }
      return null;
    }
  }

  async scheduleLocalNotification(title: string, body: string, scheduleAt: Date): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: scheduleAt },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error scheduling local notification:', error);
      }
    }
  }

  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}

export const capacitorIntegration = CapacitorIntegrationService.getInstance();

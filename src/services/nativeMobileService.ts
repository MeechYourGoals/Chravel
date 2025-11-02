// 🆕 Native mobile service for iOS/Android features
import { Capacitor } from '@capacitor/core';

// Dynamic imports for native features
let Camera: any, Geolocation: any, PushNotifications: any, LocalNotifications: any;
let Haptics: any, StatusBar: any, SplashScreen: any, App: any;

const loadNativePlugins = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Only load plugins when actually needed to avoid build issues
      console.log('Native plugins will be loaded on demand');
    } catch (error) {
      console.warn('Failed to load native plugins:', error);
    }
  }
};

export class NativeMobileService {
  private static isNative = Capacitor.isNativePlatform();
  private static isIOS = Capacitor.getPlatform() === 'ios';
  private static isAndroid = Capacitor.getPlatform() === 'android';

  static async initialize() {
    if (!this.isNative) return;
    
    await loadNativePlugins();
    await this.setupPushNotifications();
    await this.setupAppStateHandling();
    await this.setupNativeOptimizations();
  }

  // 🆕 Camera Integration
  static async takePhoto(): Promise<{ dataUrl: string; path: string } | null> {
    if (!this.isNative || !Camera) return null;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: Camera.CameraResultType.DataUrl,
        source: Camera.CameraSource.Camera
      });

      return {
        dataUrl: image.dataUrl || '',
        path: image.path || ''
      };
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  }

  static async selectFromGallery(): Promise<{ dataUrl: string; path: string } | null> {
    if (!this.isNative || !Camera) return null;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: Camera.CameraResultType.DataUrl,
        source: Camera.CameraSource.Photos
      });

      return {
        dataUrl: image.dataUrl || '',
        path: image.path || ''
      };
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  }

  // 🆕 Location Services
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    if (!this.isNative || !Geolocation) return null;

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  }

  static async watchLocation(callback: (location: { latitude: number; longitude: number }) => void): Promise<string | null> {
    if (!this.isNative || !Geolocation) return null;

    try {
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }, (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      });

      return watchId;
    } catch (error) {
      console.error('Location watch error:', error);
      return null;
    }
  }

  // 🆕 Push Notifications
  private static async setupPushNotifications() {
    if (!this.isNative || !PushNotifications) return;

    try {
      // Request permissions
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
      }

      // Listen for notification events
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Send token to your backend
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
        // Handle notification received
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed: ', notification);
        // Handle notification action
      });
    } catch (error) {
      console.error('Push notification setup error:', error);
    }
  }

  // 🆕 Local Notifications
  static async scheduleLocalNotification(title: string, body: string, scheduleTime: Date) {
    if (!this.isNative || !LocalNotifications) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: scheduleTime },
            sound: 'beep.wav',
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Local notification error:', error);
    }
  }

  // 🆕 Haptic Feedback
  static async triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
    if (!this.isNative || !Haptics) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: 'Light' });
          break;
        case 'medium':
          await Haptics.impact({ style: 'Medium' });
          break;
        case 'heavy':
          await Haptics.impact({ style: 'Heavy' });
          break;
        case 'success':
          await Haptics.notification({ type: 'Success' });
          break;
        case 'error':
          await Haptics.notification({ type: 'Error' });
          break;
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  // 🆕 App State Handling
  private static async setupAppStateHandling() {
    if (!this.isNative || !App) return;

    try {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        // Handle app state changes
      });

      App.addListener('backButton', () => {
        console.log('Back button pressed');
        // Handle back button
      });

      App.addListener('pause', () => {
        console.log('App paused');
        // Handle app pause
      });

      App.addListener('resume', () => {
        console.log('App resumed');
        // Handle app resume
      });
    } catch (error) {
      console.error('App state handling error:', error);
    }
  }

  // 🆕 Native Optimizations
  private static async setupNativeOptimizations() {
    if (!this.isNative) return;

    try {
      // Configure status bar
      if (StatusBar) {
        await StatusBar.setStyle({ style: 'DARK' });
        await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
      }

      // Hide splash screen
      if (SplashScreen) {
        await SplashScreen.hide();
      }

      // Set up native-specific optimizations
      this.setupNativeCSS();
      this.setupNativeTouch();
    } catch (error) {
      console.error('Native optimization error:', error);
    }
  }

  private static setupNativeCSS() {
    if (!this.isNative) return;

    // Add native-specific CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Native mobile optimizations */
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      
      /* iOS specific */
      @supports (-webkit-touch-callout: none) {
        body {
          -webkit-overflow-scrolling: touch;
        }
      }
      
      /* Android specific */
      @media screen and (-webkit-min-device-pixel-ratio: 0) {
        body {
          -webkit-text-size-adjust: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private static setupNativeTouch() {
    if (!this.isNative) return;

    // Prevent zoom on double tap
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Optimize touch targets
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
      button, [role="button"], input, select, textarea {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(touchStyle);
  }

  // 🆕 Utility Methods
  static isNativeDevice(): boolean {
    return this.isNative;
  }

  static isIOSDevice(): boolean {
    return this.isIOS;
  }

  static isAndroidDevice(): boolean {
    return this.isAndroid;
  }

  static getPlatform(): string {
    return Capacitor.getPlatform();
  }

  // 🆕 Performance Monitoring
  static trackNativePerformance() {
    if (!this.isNative || import.meta.env.PROD) return;

    // Monitor memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Native Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;
    let stopTime = Date.now() + 10000; // Stop after 10 seconds
    
    const countFrames = () => {
      if (Date.now() > stopTime) {
        console.log('Native performance tracking stopped');
        return;
      }

      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        console.log('Native FPS:', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      rafId = requestAnimationFrame(countFrames);
    };
    
    rafId = requestAnimationFrame(countFrames);

    // Return cleanup function
    return () => cancelAnimationFrame(rafId);
  }
}

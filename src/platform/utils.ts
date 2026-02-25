/**
 * Platform-agnostic utility functions
 */

export interface PlatformInfo {
  isWeb: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: 'web' | 'ios' | 'android';
}

class PlatformUtils {
  getPlatformInfo(): PlatformInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid;

    return {
      isWeb: !isMobile,
      isMobile,
      isIOS,
      isAndroid,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    };
  }

  async hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    // Web: Use Vibration API if available
    if ('vibrate' in navigator) {
      const patterns: Record<string, number> = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(patterns[type]);
    }
    // Mobile would use native haptic feedback
  }

  async requestPermission(permission: 'camera' | 'location' | 'notifications'): Promise<boolean> {
    try {
      if (permission === 'notifications') {
        if ('Notification' in window) {
          const result = await Notification.requestPermission();
          return result === 'granted';
        }
      }
      // Other permissions would be handled by native APIs on mobile
      return false;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }
}

export const platformUtils = new PlatformUtils();

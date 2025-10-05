/**
 * Platform-agnostic persistent storage
 * Web: Uses localStorage
 * Mobile: Will use Capacitor Preferences when Capacitor is fully integrated
 * 
 * TODO: Enable MobileStorage implementation when @capacitor/preferences is installed
 */

export interface PlatformStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

class WebStorage implements PlatformStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
}

// Create singleton storage instance
// Currently uses WebStorage for all platforms
// MobileStorage with Capacitor Preferences will be enabled in mobile-specific builds
export const platformStorage: PlatformStorage = new WebStorage();

// Helper functions for typed storage
export async function getStorageItem<T>(key: string, defaultValue?: T): Promise<T | null> {
  const value = await platformStorage.getItem(key);
  
  if (value === null) {
    return defaultValue ?? null;
  }
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as any;
  }
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await platformStorage.setItem(key, serialized);
}

export async function removeStorageItem(key: string): Promise<void> {
  await platformStorage.removeItem(key);
}

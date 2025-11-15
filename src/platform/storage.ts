/**
 * Platform-agnostic persistent storage
 * Web: Uses localStorage
 * Mobile: Uses Capacitor Preferences for reliable native storage
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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

class MobileStorage implements PlatformStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Preferences getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Preferences setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Preferences removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Preferences clear error:', error);
    }
  }
}

// Create singleton storage instance based on platform
// Mobile platforms (iOS/Android) use Capacitor Preferences for reliable native storage
// Web uses localStorage
const isNativePlatform = Capacitor.isNativePlatform();
export const platformStorage: PlatformStorage = isNativePlatform 
  ? new MobileStorage() 
  : new WebStorage();


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

/**
 * Native App Information Utilities
 *
 * Provides access to app version, build number, device UUID,
 * and store location for native apps.
 *
 * Uses Despia bridge on Lovable native apps, with web fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { despia } from '@/lib/despia';

export interface AppVersion {
  versionNumber: string;
  bundleNumber: string;
  platform: 'ios' | 'android' | 'web';
}

export interface DeviceInfo {
  uuid: string | null;
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
}

export interface StoreLocation {
  storeLocation: string | null;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Check if running in Despia native environment
 */
function isDespiaEnvironment(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('despia');
}

/**
 * Get current platform
 */
function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Get app version and build number
 *
 * On web, returns version from package.json or environment
 */
export async function getAppVersion(): Promise<AppVersion> {
  const platform = getPlatform();

  // Despia environment - use native bridge
  if (isDespiaEnvironment()) {
    try {
      const result = await despia('getappversion://', ['versionNumber', 'bundleNumber']);

      if (result && typeof result === 'object') {
        return {
          versionNumber: result.versionNumber || '1.0.0',
          bundleNumber: result.bundleNumber || '1',
          platform,
        };
      }
    } catch (error) {
      console.warn('[AppInfo] Failed to get native app version:', error);
    }
  }

  // Web fallback - use build version from environment
  const buildVersion = import.meta.env.VITE_BUILD_ID || 'dev';

  return {
    versionNumber: '1.0.0', // Would come from package.json in real setup
    bundleNumber: buildVersion.slice(0, 7), // First 7 chars of git SHA
    platform,
  };
}

/**
 * Get unique device identifier
 *
 * On web, returns null (no persistent device ID available)
 */
export async function getDeviceUUID(): Promise<DeviceInfo> {
  const platform = getPlatform();
  const isNative = Capacitor.isNativePlatform() || isDespiaEnvironment();

  // Despia environment - use native bridge
  if (isDespiaEnvironment()) {
    try {
      const result = await despia('get-uuid://', ['uuid']);

      if (result && typeof result === 'object' && result.uuid) {
        return {
          uuid: result.uuid,
          platform,
          isNative: true,
        };
      }
    } catch (error) {
      console.warn('[AppInfo] Failed to get device UUID:', error);
    }
  }

  // Web fallback - no persistent device ID
  // Could use fingerprinting but that has privacy implications
  return {
    uuid: null,
    platform,
    isNative,
  };
}

/**
 * Get store location (App Store region)
 */
export async function getStoreLocation(): Promise<StoreLocation> {
  const platform = getPlatform();

  // Despia environment - use native bridge
  if (isDespiaEnvironment()) {
    try {
      const result = await despia('getstorelocation://', ['storeLocation']);

      if (result && typeof result === 'object' && result.storeLocation) {
        return {
          storeLocation: result.storeLocation,
          platform,
        };
      }
    } catch (error) {
      console.warn('[AppInfo] Failed to get store location:', error);
    }
  }

  // Web fallback - use browser locale
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const region = locale.split('-')[1] || 'US';

  return {
    storeLocation: region,
    platform,
  };
}

/**
 * Get all app info at once
 */
export async function getAllAppInfo(): Promise<{
  version: AppVersion;
  device: DeviceInfo;
  store: StoreLocation;
}> {
  const [version, device, store] = await Promise.all([
    getAppVersion(),
    getDeviceUUID(),
    getStoreLocation(),
  ]);

  return { version, device, store };
}

/**
 * Format version for display in settings
 * e.g., "Version 1.0.0 (123)"
 */
export function formatVersionDisplay(version: AppVersion): string {
  return `Version ${version.versionNumber} (${version.bundleNumber})`;
}

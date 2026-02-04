/**
 * Platform Detection Utilities
 * 
 * Detects browser, OS, and PWA status for platform-specific features.
 * Particularly important for iOS Safari which has limited push notification support.
 * 
 * iOS Push Notification Support Timeline:
 * - iOS < 16.4: No push notification support at all
 * - iOS 16.4+: Push notifications only work in "Add to Home Screen" (standalone) mode
 * - iOS Safari (not standalone): No push support, show Add to Home Screen prompt
 * 
 * @see https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
 */

// ============================================================================
// Types
// ============================================================================

export interface PlatformInfo {
  /** Operating system */
  os: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';
  /** Browser name */
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'unknown';
  /** Whether running as installed PWA (standalone mode) */
  isStandalone: boolean;
  /** Whether running in a mobile browser */
  isMobile: boolean;
  /** Whether running on a tablet */
  isTablet: boolean;
  /** iOS version if applicable (e.g., "16.4") */
  iosVersion: string | null;
  /** Major iOS version number */
  iosMajorVersion: number | null;
  /** Minor iOS version number */
  iosMinorVersion: number | null;
  /** Android version if applicable */
  androidVersion: string | null;
  /** User agent string */
  userAgent: string;
}

export interface PushSupportInfo {
  /** Whether push notifications are supported on this platform */
  isSupported: boolean;
  /** Reason if not supported */
  unsupportedReason: PushUnsupportedReason | null;
  /** Whether user needs to Add to Home Screen first */
  requiresHomeScreen: boolean;
  /** Whether email fallback should be used */
  useEmailFallback: boolean;
  /** Whether in-app notifications should be the primary method */
  useInAppFallback: boolean;
  /** Human-readable explanation */
  explanation: string;
}

export type PushUnsupportedReason =
  | 'ios_too_old'           // iOS < 16.4
  | 'ios_not_standalone'    // iOS Safari but not Add to Home Screen
  | 'browser_not_supported' // Browser doesn't support Push API
  | 'no_service_worker'     // No service worker support
  | 'insecure_context';     // Not HTTPS

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect current platform information
 */
export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent;
  
  // Detect OS
  const os = detectOS(ua);
  
  // Detect browser
  const browser = detectBrowser(ua);
  
  // Detect if running as standalone PWA
  const isStandalone = detectStandalone();
  
  // Detect mobile/tablet
  const isMobile = detectMobile(ua);
  const isTablet = detectTablet(ua);
  
  // Detect iOS version
  const { version: iosVersion, major: iosMajorVersion, minor: iosMinorVersion } = detectIOSVersion(ua);
  
  // Detect Android version
  const androidVersion = detectAndroidVersion(ua);
  
  return {
    os,
    browser,
    isStandalone,
    isMobile,
    isTablet,
    iosVersion,
    iosMajorVersion,
    iosMinorVersion,
    androidVersion,
    userAgent: ua,
  };
}

/**
 * Detect operating system
 */
function detectOS(ua: string): PlatformInfo['os'] {
  // iOS detection (must check before Mac since iPad can report as Mac)
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  
  if (/Android/.test(ua)) {
    return 'android';
  }
  
  if (/Mac OS X/.test(ua)) {
    return 'macos';
  }
  
  if (/Windows/.test(ua)) {
    return 'windows';
  }
  
  if (/Linux/.test(ua)) {
    return 'linux';
  }
  
  return 'unknown';
}

/**
 * Detect browser
 */
function detectBrowser(ua: string): PlatformInfo['browser'] {
  // Order matters - check more specific patterns first
  if (/Edg/.test(ua)) {
    return 'edge';
  }
  
  if (/OPR|Opera/.test(ua)) {
    return 'opera';
  }
  
  if (/Firefox/.test(ua)) {
    return 'firefox';
  }
  
  // Chrome must be checked after Edge (Edge includes "Chrome" in UA)
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    return 'chrome';
  }
  
  // Safari must be checked last (many browsers include "Safari" in UA)
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    return 'safari';
  }
  
  return 'unknown';
}

/**
 * Detect if running as installed PWA (standalone mode)
 */
function detectStandalone(): boolean {
  // Check display-mode media query (works for most browsers)
  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    return true;
  }
  
  // iOS Safari standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }
  
  // Android TWA
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
}

/**
 * Detect if mobile device
 */
function detectMobile(ua: string): boolean {
  return /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Detect if tablet device
 */
function detectTablet(ua: string): boolean {
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect iOS version
 */
function detectIOSVersion(ua: string): { version: string | null; major: number | null; minor: number | null } {
  // Match patterns like "iPhone OS 16_4" or "CPU OS 16_4"
  const match = ua.match(/(?:iPhone|CPU) OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
  
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = match[3] ? parseInt(match[3], 10) : 0;
    
    return {
      version: `${major}.${minor}${patch ? `.${patch}` : ''}`,
      major,
      minor,
    };
  }
  
  // Check for iPad on iPadOS 13+ which reports as Mac
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    // Can't reliably detect version for iPad pretending to be Mac
    // Assume it's recent enough (iPadOS 13+)
    return { version: '16.0', major: 16, minor: 0 };
  }
  
  return { version: null, major: null, minor: null };
}

/**
 * Detect Android version
 */
function detectAndroidVersion(ua: string): string | null {
  const match = ua.match(/Android (\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}

// ============================================================================
// Push Notification Support Detection
// ============================================================================

/**
 * Determine push notification support for current platform
 */
export function detectPushSupport(platform?: PlatformInfo): PushSupportInfo {
  const info = platform || detectPlatform();
  
  // Check basic requirements first
  if (!('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      unsupportedReason: 'no_service_worker',
      requiresHomeScreen: false,
      useEmailFallback: true,
      useInAppFallback: true,
      explanation: 'Your browser does not support service workers, which are required for push notifications.',
    };
  }
  
  if (!('PushManager' in window)) {
    return {
      isSupported: false,
      unsupportedReason: 'browser_not_supported',
      requiresHomeScreen: false,
      useEmailFallback: true,
      useInAppFallback: true,
      explanation: 'Your browser does not support push notifications.',
    };
  }
  
  if (!window.isSecureContext) {
    return {
      isSupported: false,
      unsupportedReason: 'insecure_context',
      requiresHomeScreen: false,
      useEmailFallback: true,
      useInAppFallback: true,
      explanation: 'Push notifications require a secure connection (HTTPS).',
    };
  }
  
  // iOS-specific checks
  if (info.os === 'ios') {
    // iOS < 16.4 doesn't support push at all
    if (info.iosMajorVersion !== null) {
      const version = info.iosMajorVersion + (info.iosMinorVersion || 0) / 10;
      
      if (version < 16.4) {
        return {
          isSupported: false,
          unsupportedReason: 'ios_too_old',
          requiresHomeScreen: false,
          useEmailFallback: true,
          useInAppFallback: true,
          explanation: `Push notifications require iOS 16.4 or later. You're on iOS ${info.iosVersion}. Please update your device or use email notifications instead.`,
        };
      }
    }
    
    // iOS 16.4+ but not standalone - need to Add to Home Screen
    if (!info.isStandalone) {
      return {
        isSupported: false,
        unsupportedReason: 'ios_not_standalone',
        requiresHomeScreen: true,
        useEmailFallback: true,
        useInAppFallback: true,
        explanation: 'On iOS, push notifications only work when you add Chravel to your Home Screen. Tap the Share button and select "Add to Home Screen".',
      };
    }
    
    // iOS 16.4+ standalone - push is supported!
    return {
      isSupported: true,
      unsupportedReason: null,
      requiresHomeScreen: false,
      useEmailFallback: false,
      useInAppFallback: false,
      explanation: 'Push notifications are fully supported.',
    };
  }
  
  // Non-iOS platforms - generally supported
  return {
    isSupported: true,
    unsupportedReason: null,
    requiresHomeScreen: false,
    useEmailFallback: false,
    useInAppFallback: false,
    explanation: 'Push notifications are fully supported.',
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return detectPlatform().os === 'ios';
}

/**
 * Check if running on iOS Safari (not standalone)
 */
export function isIOSSafari(): boolean {
  const platform = detectPlatform();
  return platform.os === 'ios' && platform.browser === 'safari' && !platform.isStandalone;
}

/**
 * Check if running as standalone PWA
 */
export function isStandalonePWA(): boolean {
  return detectStandalone();
}

/**
 * Check if iOS version supports push (16.4+)
 */
export function iosVersionSupportsPush(): boolean {
  const platform = detectPlatform();
  
  if (platform.os !== 'ios') {
    return true; // Not iOS, so iOS version doesn't matter
  }
  
  if (platform.iosMajorVersion === null) {
    return false; // Can't determine version, assume not supported
  }
  
  const version = platform.iosMajorVersion + (platform.iosMinorVersion || 0) / 10;
  return version >= 16.4;
}

/**
 * Check if push notifications are supported on current platform
 */
export function isPushSupported(): boolean {
  return detectPushSupport().isSupported;
}

/**
 * Check if user needs to Add to Home Screen for push support
 */
export function needsHomeScreenForPush(): boolean {
  return detectPushSupport().requiresHomeScreen;
}

/**
 * Get a user-friendly platform name
 */
export function getPlatformDisplayName(): string {
  const platform = detectPlatform();
  
  let device = '';
  if (platform.os === 'ios') {
    device = platform.isTablet ? 'iPad' : 'iPhone';
  } else if (platform.os === 'android') {
    device = platform.isTablet ? 'Android Tablet' : 'Android Phone';
  } else if (platform.os === 'macos') {
    device = 'Mac';
  } else if (platform.os === 'windows') {
    device = 'Windows PC';
  } else if (platform.os === 'linux') {
    device = 'Linux';
  } else {
    device = 'Device';
  }
  
  const browser = {
    safari: 'Safari',
    chrome: 'Chrome',
    firefox: 'Firefox',
    edge: 'Edge',
    opera: 'Opera',
    unknown: 'Browser',
  }[platform.browser];
  
  if (platform.isStandalone) {
    return `${device} (App)`;
  }
  
  return `${device} (${browser})`;
}

// ============================================================================
// Caching
// ============================================================================

let cachedPlatform: PlatformInfo | null = null;
let cachedPushSupport: PushSupportInfo | null = null;

/**
 * Get cached platform info (avoids repeated detection)
 */
export function getCachedPlatform(): PlatformInfo {
  if (!cachedPlatform) {
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
}

/**
 * Get cached push support info
 */
export function getCachedPushSupport(): PushSupportInfo {
  if (!cachedPushSupport) {
    cachedPushSupport = detectPushSupport(getCachedPlatform());
  }
  return cachedPushSupport;
}

/**
 * Clear cached platform info (useful if standalone mode changes)
 */
export function clearPlatformCache(): void {
  cachedPlatform = null;
  cachedPushSupport = null;
}

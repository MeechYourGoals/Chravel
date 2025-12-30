/**
 * Native Biometric Authentication Wrapper
 *
 * Provides Face ID, Touch ID, and fingerprint authentication
 * for secure operations like payment approval and app unlock.
 *
 * Uses Despia bridge on Lovable native apps, with web fallback.
 */

import { Capacitor } from '@capacitor/core';
import { despia } from '@/lib/despia';

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

export interface BiometricResult {
  success: boolean;
  authenticated: boolean;
  error?: string;
  biometricType?: BiometricType;
}

export interface BiometricAvailability {
  available: boolean;
  biometricType: BiometricType;
  reason?: string;
}

/**
 * Check if running in Despia native environment
 */
function isDespiaEnvironment(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('despia');
}

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<BiometricAvailability> {
  // Web fallback - no biometric support
  if (!Capacitor.isNativePlatform() && !isDespiaEnvironment()) {
    return {
      available: false,
      biometricType: 'none',
      reason: 'Biometric authentication requires native app',
    };
  }

  // In Despia environment, biometrics are generally available on iOS
  if (isDespiaEnvironment()) {
    const platform = Capacitor.getPlatform();
    return {
      available: true,
      biometricType: platform === 'ios' ? 'face' : 'fingerprint',
    };
  }

  // Capacitor native - check plugin availability
  if (Capacitor.isNativePlatform()) {
    return {
      available: true,
      biometricType: Capacitor.getPlatform() === 'ios' ? 'face' : 'fingerprint',
    };
  }

  return {
    available: false,
    biometricType: 'none',
    reason: 'Platform not supported',
  };
}

/**
 * Request biometric authentication
 *
 * @param reason - Reason shown to user (e.g., "Confirm payment of $25.00")
 * @returns BiometricResult with authentication status
 */
export async function authenticateWithBiometrics(
  reason: string = 'Authenticate to continue',
): Promise<BiometricResult> {
  // Check availability first
  const availability = await isBiometricAvailable();
  if (!availability.available) {
    return {
      success: false,
      authenticated: false,
      error: availability.reason || 'Biometric authentication not available',
    };
  }

  try {
    // Despia environment - use bioauth protocol
    if (isDespiaEnvironment()) {
      // despia('bioauth://') triggers native biometric prompt
      // Returns when authentication completes or fails
      // The despia function may return void in TS, but native bridge returns actual value
      const result = await despia('bioauth://') as unknown;

      // Despia returns success/failure indicator - cast to unknown first for type safety
      const authenticated = 
        result === true || 
        result === 'success' || 
        (typeof result === 'object' && result !== null && (result as { success?: boolean }).success === true);

      return {
        success: true,
        authenticated,
        biometricType: availability.biometricType,
        error: authenticated ? undefined : 'Authentication failed or cancelled',
      };
    }

    // Capacitor native fallback - would need @capacitor-community/biometric-auth plugin
    // For now, return unsupported
    return {
      success: false,
      authenticated: false,
      error: 'Biometric plugin not configured. Use Despia native build.',
    };
  } catch (error) {
    console.error('[Biometrics] Authentication error:', error);
    return {
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Authenticate for payment approval
 * Wraps biometric auth with payment-specific UX
 */
export async function authenticateForPayment(
  amount: number,
  currency: string = 'USD',
): Promise<BiometricResult> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

  return authenticateWithBiometrics(`Confirm payment of ${formattedAmount}`);
}

/**
 * Authenticate for app unlock
 */
export async function authenticateForAppUnlock(): Promise<BiometricResult> {
  return authenticateWithBiometrics('Unlock Chravel');
}

/**
 * Authenticate for sensitive data access
 */
export async function authenticateForSensitiveData(
  dataType: string = 'sensitive information',
): Promise<BiometricResult> {
  return authenticateWithBiometrics(`Access ${dataType}`);
}

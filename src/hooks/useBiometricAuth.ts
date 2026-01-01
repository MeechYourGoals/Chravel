/**
 * Hook for biometric authentication
 *
 * Provides easy access to biometric auth for payment approval,
 * app unlock, and sensitive data access.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  isBiometricAvailable,
  authenticateWithBiometrics,
  authenticateForPayment,
  authenticateForAppUnlock,
  authenticateForSensitiveData,
  type BiometricResult,
  type BiometricAvailability,
  type BiometricType,
} from '@/native/biometrics';
import * as haptics from '@/native/haptics';

interface UseBiometricAuthResult {
  // State
  isAvailable: boolean;
  biometricType: BiometricType;
  isAuthenticating: boolean;
  lastResult: BiometricResult | null;

  // Actions
  authenticate: (reason?: string) => Promise<boolean>;
  authenticatePayment: (amount: number, currency?: string) => Promise<boolean>;
  authenticateUnlock: () => Promise<boolean>;
  authenticateSensitive: (dataType?: string) => Promise<boolean>;

  // Loading state
  isLoading: boolean;
}

export function useBiometricAuth(): UseBiometricAuthResult {
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    biometricType: 'none',
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastResult, setLastResult] = useState<BiometricResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check availability on mount
  useEffect(() => {
    let mounted = true;

    async function checkAvailability() {
      const result = await isBiometricAvailable();
      if (mounted) {
        setAvailability(result);
        setIsLoading(false);
      }
    }

    checkAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  // Generic authenticate
  const authenticate = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!availability.available) return false;

      setIsAuthenticating(true);
      try {
        const result = await authenticateWithBiometrics(reason);
        setLastResult(result);

        // Haptic feedback
        if (result.authenticated) {
          await haptics.success();
        } else {
          await haptics.error();
        }

        return result.authenticated;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [availability.available],
  );

  // Payment authentication
  const authenticatePayment = useCallback(
    async (amount: number, currency: string = 'USD'): Promise<boolean> => {
      if (!availability.available) return false;

      setIsAuthenticating(true);
      try {
        const result = await authenticateForPayment(amount, currency);
        setLastResult(result);

        if (result.authenticated) {
          await haptics.success();
        } else {
          await haptics.error();
        }

        return result.authenticated;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [availability.available],
  );

  // App unlock authentication
  const authenticateUnlock = useCallback(async (): Promise<boolean> => {
    if (!availability.available) return false;

    setIsAuthenticating(true);
    try {
      const result = await authenticateForAppUnlock();
      setLastResult(result);

      if (result.authenticated) {
        await haptics.success();
      }

      return result.authenticated;
    } finally {
      setIsAuthenticating(false);
    }
  }, [availability.available]);

  // Sensitive data authentication
  const authenticateSensitive = useCallback(
    async (dataType?: string): Promise<boolean> => {
      if (!availability.available) return false;

      setIsAuthenticating(true);
      try {
        const result = await authenticateForSensitiveData(dataType);
        setLastResult(result);

        if (result.authenticated) {
          await haptics.success();
        } else {
          await haptics.warning();
        }

        return result.authenticated;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [availability.available],
  );

  return {
    isAvailable: availability.available,
    biometricType: availability.biometricType,
    isAuthenticating,
    lastResult,
    authenticate,
    authenticatePayment,
    authenticateUnlock,
    authenticateSensitive,
    isLoading,
  };
}

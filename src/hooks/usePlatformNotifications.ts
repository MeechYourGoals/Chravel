/**
 * Platform-Specific Notification Permission Hook
 * 
 * Provides a unified interface for managing push notifications across platforms,
 * with special handling for iOS Safari which requires "Add to Home Screen" first.
 * 
 * Features:
 * - Automatic platform detection
 * - iOS-specific flow (shows Add to Home Screen instructions)
 * - Fallback to email/in-app notifications when push is not available
 * - Graceful degradation for older iOS versions
 * 
 * @example
 * ```tsx
 * const { 
 *   canUsePush, 
 *   showIOSInstructions,
 *   requestPermission 
 * } = usePlatformNotifications();
 * 
 * <button onClick={requestPermission}>
 *   Enable Notifications
 * </button>
 * 
 * <IOSAddToHomeModal 
 *   open={showIOSInstructions} 
 *   onClose={() => setShowIOSInstructions(false)} 
 * />
 * ```
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useWebPush } from './useWebPush';
import {
  detectPlatform,
  detectPushSupport,
  type PlatformInfo,
  type PushSupportInfo,
} from '@/utils/platformDetection';
import { notificationService } from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type NotificationMethod = 'push' | 'email' | 'in_app' | 'sms';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  email: string | null;
  phone: string | null;
}

export interface PlatformNotificationState {
  /** Platform information */
  platform: PlatformInfo;
  /** Push support information */
  pushSupport: PushSupportInfo;
  /** Whether push notifications can be used on this platform */
  canUsePush: boolean;
  /** Whether to show iOS Add to Home Screen instructions */
  showIOSInstructions: boolean;
  /** Current notification permission status */
  permission: NotificationPermission | 'unsupported';
  /** Whether user is subscribed to push */
  isSubscribed: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Available notification methods for this platform */
  availableMethods: NotificationMethod[];
  /** Current notification preferences */
  preferences: NotificationPreferences | null;
}

export interface PlatformNotificationActions {
  /** Request notification permission (platform-aware) */
  requestPermission: () => Promise<void>;
  /** Subscribe to push notifications */
  subscribeToPush: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribeFromPush: () => Promise<boolean>;
  /** Update notification preferences */
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  /** Show iOS instructions modal */
  showIOSModal: () => void;
  /** Hide iOS instructions modal */
  hideIOSModal: () => void;
  /** Enable email fallback */
  enableEmailFallback: (email: string) => Promise<boolean>;
  /** Check if user has completed iOS home screen setup */
  checkIOSSetupComplete: () => boolean;
}

export type UsePlatformNotificationsReturn = PlatformNotificationState & PlatformNotificationActions;

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePlatformNotifications(): UsePlatformNotificationsReturn {
  const { user } = useAuth();
  const webPush = useWebPush();
  
  // State
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detect platform and push support
  const platform = useMemo(() => detectPlatform(), []);
  const pushSupport = useMemo(() => detectPushSupport(platform), [platform]);
  
  // Determine available notification methods
  const availableMethods = useMemo((): NotificationMethod[] => {
    const methods: NotificationMethod[] = ['in_app']; // Always available
    
    if (pushSupport.isSupported) {
      methods.unshift('push');
    }
    
    // Email is always available as fallback
    methods.push('email');
    
    // SMS could be available for high-priority
    if (preferences?.phone) {
      methods.push('sms');
    }
    
    return methods;
  }, [pushSupport.isSupported, preferences?.phone]);

  // Load user preferences
  useEffect(() => {
    if (!user) return;
    
    const loadPreferences = async () => {
      try {
        const prefs = await notificationService.getNotificationPreferences(user.id);
        if (prefs) {
          setPreferences({
            pushEnabled: prefs.pushEnabled,
            emailEnabled: prefs.emailEnabled,
            inAppEnabled: true, // Always enabled
            smsEnabled: prefs.smsEnabled,
            email: user.email || null,
            phone: null, // Would come from user profile
          });
        }
      } catch (err) {
        console.error('[usePlatformNotifications] Failed to load preferences:', err);
      }
    };
    
    loadPreferences();
  }, [user]);

  /**
   * Request notification permission (platform-aware)
   * On iOS Safari, shows Add to Home Screen instructions instead
   */
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // iOS Safari (not standalone) - show instructions
      if (pushSupport.requiresHomeScreen) {
        setShowIOSInstructions(true);
        setIsLoading(false);
        return;
      }
      
      // iOS too old - show explanation
      if (pushSupport.unsupportedReason === 'ios_too_old') {
        setError(pushSupport.explanation);
        setIsLoading(false);
        return;
      }
      
      // Push not supported for other reasons
      if (!pushSupport.isSupported) {
        // Suggest email fallback
        setError(`${pushSupport.explanation} We'll send you email notifications instead.`);
        
        // Auto-enable email fallback
        if (user?.email) {
          await updatePreferences({ emailEnabled: true });
        }
        setIsLoading(false);
        return;
      }
      
      // Push is supported - request permission via webPush hook
      const success = await webPush.subscribe();
      
      if (!success && webPush.permission === 'denied') {
        setError('Notification permission was denied. You can enable it in your browser settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    } finally {
      setIsLoading(false);
    }
  }, [pushSupport, user?.email, webPush]);

  /**
   * Subscribe to push notifications
   */
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!pushSupport.isSupported) {
      return false;
    }
    return webPush.subscribe();
  }, [pushSupport.isSupported, webPush]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    return webPush.unsubscribe();
  }, [webPush]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (
    prefs: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await notificationService.updateNotificationPreferences(user.id, {
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        smsEnabled: prefs.smsEnabled,
      });
      
      if (success) {
        setPreferences(prev => prev ? { ...prev, ...prefs } : null);
      }
      
      return success;
    } catch (err) {
      console.error('[usePlatformNotifications] Failed to update preferences:', err);
      return false;
    }
  }, [user]);

  /**
   * Show iOS instructions modal
   */
  const showIOSModal = useCallback(() => {
    setShowIOSInstructions(true);
  }, []);

  /**
   * Hide iOS instructions modal
   */
  const hideIOSModal = useCallback(() => {
    setShowIOSInstructions(false);
  }, []);

  /**
   * Enable email fallback notifications
   */
  const enableEmailFallback = useCallback(async (email: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Update email in preferences
      const success = await updatePreferences({ 
        emailEnabled: true,
        email 
      });
      
      return success;
    } catch (err) {
      console.error('[usePlatformNotifications] Failed to enable email fallback:', err);
      return false;
    }
  }, [user, updatePreferences]);

  /**
   * Check if user has completed iOS home screen setup
   * (i.e., they're now running in standalone mode)
   */
  const checkIOSSetupComplete = useCallback((): boolean => {
    // Re-detect platform to check if now standalone
    const currentPlatform = detectPlatform();
    return currentPlatform.isStandalone;
  }, []);

  return {
    // State
    platform,
    pushSupport,
    canUsePush: pushSupport.isSupported,
    showIOSInstructions,
    permission: webPush.permission === 'unsupported' ? 'unsupported' : webPush.permission as NotificationPermission,
    isSubscribed: webPush.isSubscribed,
    isLoading: isLoading || webPush.isLoading,
    error: error || webPush.error,
    availableMethods,
    preferences,
    
    // Actions
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    showIOSModal,
    hideIOSModal,
    enableEmailFallback,
    checkIOSSetupComplete,
  };
}

/**
 * Hook to get just the platform info (lighter weight)
 */
export function usePlatformInfo(): PlatformInfo {
  return useMemo(() => detectPlatform(), []);
}

/**
 * Hook to get just the push support info
 */
export function usePushSupport(): PushSupportInfo {
  const platform = usePlatformInfo();
  return useMemo(() => detectPushSupport(platform), [platform]);
}

export default usePlatformNotifications;

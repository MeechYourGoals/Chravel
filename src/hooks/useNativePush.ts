/**
 * Native Push Notifications Hook
 * Manages push notification lifecycle for Capacitor apps
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import * as NativePush from '@/native/push';
import { saveDeviceToken, removeDeviceToken, updateLastSeen } from '@/services/pushTokenService';
import { buildRouteFromPayload } from '@/native/pushRouting';

export interface NativePushState {
  token: string | null;
  permission: 'granted' | 'denied' | 'prompt';
  isNative: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useNativePush() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<NativePushState>({
    token: null,
    permission: 'prompt',
    isNative: NativePush.isNativePush(),
    isRegistered: false,
    isLoading: false,
    error: null,
  });
  
  const listenersSetup = useRef(false);
  const tokenRef = useRef<string | null>(null);

  /**
   * Request permission and register for push notifications
   * Call after user login and consent
   */
  const registerForPush = useCallback(async (): Promise<string | null> => {
    if (!user || !NativePush.isNativePush()) {
      return null;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Request permission
      const permission = await NativePush.requestPermissions();
      setState(prev => ({ ...prev, permission }));
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Permission not granted' 
        }));
        return null;
      }
      
      // Register for push
      const result = await NativePush.register();
      
      if (result.error || !result.token) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: result.error || 'Failed to get token' 
        }));
        return null;
      }
      
      // Save token to Supabase
      const saved = await saveDeviceToken(user.id, result.token);
      
      if (!saved) {
        console.warn('[useNativePush] Failed to save token to database');
      }
      
      tokenRef.current = result.token;
      setState(prev => ({ 
        ...prev, 
        token: result.token,
        isRegistered: true,
        isLoading: false 
      }));
      
      return result.token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage 
      }));
      return null;
    }
  }, [user]);

  /**
   * Unregister from push notifications
   */
  const unregisterFromPush = useCallback(async (): Promise<void> => {
    if (!user || !tokenRef.current) return;
    
    try {
      await removeDeviceToken(user.id, tokenRef.current);
      await NativePush.unregister();
      tokenRef.current = null;
      setState(prev => ({ 
        ...prev, 
        token: null,
        isRegistered: false 
      }));
    } catch (err) {
      console.error('[useNativePush] Failed to unregister:', err);
    }
  }, [user]);

  /**
   * Check current permission status
   */
  const checkPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    const permission = await NativePush.checkPermissions();
    setState(prev => ({ ...prev, permission }));
    return permission;
  }, []);

  /**
   * Clear all delivered notifications (badge management)
   */
  const clearNotifications = useCallback(async (): Promise<void> => {
    await NativePush.removeAllDeliveredNotifications();
  }, []);

  // Setup notification listeners on mount
  useEffect(() => {
    if (!NativePush.isNativePush() || listenersSetup.current) {
      return;
    }
    
    listenersSetup.current = true;

    // Handle foreground notifications - show toast
    const unsubReceived = NativePush.onNotificationReceived((notification) => {
      const payload = NativePush.parsePayload(notification.data || {});
      
      toast(notification.title || 'New notification', {
        description: notification.body,
        action: payload ? {
          label: 'View',
          onClick: () => {
            const route = buildRouteFromPayload(payload);
            navigate(route);
          }
        } : undefined,
        duration: 5000,
      });
    });

    // NOTE: Notification tap routing is handled centrally in `src/native/lifecycle.ts`
    // to guarantee cold-start routing. Keep this hook focused on registration and
    // foreground UX only.

    return () => {
      unsubReceived();
    };
  }, [navigate]);

  // Update last_seen periodically when app is active
  useEffect(() => {
    if (!user || !tokenRef.current) return;
    
    // Update on mount
    updateLastSeen(user.id, tokenRef.current);
    
    // Update every 5 minutes
    const interval = setInterval(() => {
      if (tokenRef.current) {
        updateLastSeen(user.id, tokenRef.current);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Check permission status on mount
  useEffect(() => {
    if (NativePush.isNativePush()) {
      checkPermission();
    }
  }, [checkPermission]);

  return {
    ...state,
    registerForPush,
    unregisterFromPush,
    checkPermission,
    clearNotifications,
  };
}

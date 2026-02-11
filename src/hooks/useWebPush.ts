/**
 * Web Push Notifications Hook
 * 
 * Manages push subscription lifecycle with iOS-aware handling.
 * Single source of truth for push notification state.
 * 
 * iOS Notes:
 * - iOS < 16.4: Push not supported
 * - iOS 16.4+ in Safari: Requires "Add to Home Screen" first
 * - iOS 16.4+ standalone PWA: Full push support
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ============================================================================
// Types
// ============================================================================

export type WebPushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface WebPushState {
  isSupported: boolean;
  permission: WebPushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  /** iOS requires Add to Home Screen for push */
  requiresHomeScreen: boolean;
  /** iOS version too old for push */
  iosUnsupported: boolean;
}

export interface UseWebPushReturn extends WebPushState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkPermission: () => Promise<WebPushPermission>;
}

// ============================================================================
// Simple iOS Detection (inline, no separate utility needed)
// ============================================================================

function detectiOS(): { isIOS: boolean; version: number | null; isStandalone: boolean } {
  const ua = navigator.userAgent;
  
  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (!isIOS) {
    return { isIOS: false, version: null, isStandalone: false };
  }
  
  // Parse iOS version
  const match = ua.match(/OS (\d+)_(\d+)/);
  const version = match ? parseFloat(`${match[1]}.${match[2]}`) : null;
  
  // Check standalone mode
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
  
  return { isIOS, version, isStandalone };
}

function checkPushSupport(): { 
  supported: boolean; 
  requiresHomeScreen: boolean; 
  iosUnsupported: boolean;
  reason?: string;
} {
  // Basic browser support
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, requiresHomeScreen: false, iosUnsupported: false, reason: 'Browser does not support push' };
  }
  
  const { isIOS, version, isStandalone } = detectiOS();
  
  if (isIOS) {
    // iOS < 16.4 has no push support
    if (version !== null && version < 16.4) {
      return { supported: false, requiresHomeScreen: false, iosUnsupported: true, reason: 'iOS 16.4+ required' };
    }
    
    // iOS 16.4+ but not standalone - needs Add to Home Screen
    if (!isStandalone) {
      return { supported: false, requiresHomeScreen: true, iosUnsupported: false, reason: 'Add to Home Screen required' };
    }
  }
  
  return { supported: true, requiresHomeScreen: false, iosUnsupported: false };
}

// ============================================================================
// Utilities
// ============================================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  const browser = ua.includes('Chrome') ? 'Chrome' : 
                  ua.includes('Firefox') ? 'Firefox' : 
                  ua.includes('Safari') ? 'Safari' : 'Browser';
  const os = ua.includes('Windows') ? 'Windows' :
             ua.includes('Mac') ? 'Mac' :
             ua.includes('Android') ? 'Android' :
             ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : 'Unknown';
  return `${browser} on ${os}`;
}

// ============================================================================
// Hook
// ============================================================================

export function useWebPush(): UseWebPushReturn {
  const { user } = useAuth();
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  
  // Check platform support once
  const pushSupport = checkPushSupport();
  
  const [state, setState] = useState<WebPushState>({
    isSupported: pushSupport.supported,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
    requiresHomeScreen: pushSupport.requiresHomeScreen,
    iosUnsupported: pushSupport.iosUnsupported,
  });

  // Get service worker registration
  const getRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (serviceWorkerRef.current) return serviceWorkerRef.current;
    try {
      serviceWorkerRef.current = await navigator.serviceWorker.ready;
      return serviceWorkerRef.current;
    } catch {
      return null;
    }
  }, []);

  // Check permission
  const checkPermission = useCallback(async (): Promise<WebPushPermission> => {
    if (!pushSupport.supported) return 'unsupported';
    const permission = Notification.permission as WebPushPermission;
    setState(prev => ({ ...prev, permission }));
    return permission;
  }, [pushSupport.supported]);

  // Subscribe to push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!pushSupport.supported) {
      setState(prev => ({ ...prev, error: pushSupport.reason || 'Push not supported' }));
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setState(prev => ({ ...prev, error: 'VAPID key not configured' }));
      return false;
    }

    if (!user) {
      setState(prev => ({ ...prev, error: 'Must be logged in' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          permission: permission as WebPushPermission,
          error: permission === 'denied' ? 'Permission denied' : null 
        }));
        return false;
      }

      // Get service worker and subscribe
      const registration = await getRegistration();
      if (!registration) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Service worker unavailable' }));
        return false;
      }

      let subscription = await (registration as any).pushManager.getSubscription();
      if (!subscription) {
        subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to database
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Invalid subscription keys' }));
        return false;
      }

      const { error } = await supabase.from('web_push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        device_name: getDeviceName(),
        is_active: true,
        failed_count: 0,
      }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('[useWebPush] Save error:', error);
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to save subscription' }));
        return false;
      }

      setState(prev => ({ ...prev, isLoading: false, isSubscribed: true, permission: 'granted' }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscription failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return false;
    }
  }, [user, getRegistration, pushSupport]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await getRegistration();
      const subscription = await (registration as any)?.pushManager?.getSubscription();
      
      if (subscription) {
        await supabase.from('web_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }

      setState(prev => ({ ...prev, isLoading: false, isSubscribed: false }));
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Unsubscribe failed' }));
      return false;
    }
  }, [user, getRegistration]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (!pushSupport.supported) return;
      
      await checkPermission();
      
      try {
        const registration = await getRegistration();
        const subscription = await (registration as any)?.pushManager?.getSubscription();
        setState(prev => ({ ...prev, isSubscribed: !!subscription }));
      } catch {
        // Ignore
      }
    };
    init();
  }, [pushSupport.supported, checkPermission, getRegistration]);

  return { ...state, subscribe, unsubscribe, checkPermission };
}

export default useWebPush;

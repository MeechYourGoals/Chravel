/**
 * Web Push Notifications Hook
 * 
 * Manages the Web Push subscription lifecycle for PWA/browser push notifications.
 * Handles permission requests, subscription management, and Supabase storage.
 * 
 * @example
 * ```tsx
 * const { 
 *   isSupported, 
 *   permission, 
 *   subscribe, 
 *   unsubscribe 
 * } = useWebPush();
 * 
 * // Request permission and subscribe on first trip creation
 * const handleFirstTrip = async () => {
 *   if (permission === 'default') {
 *     await subscribe();
 *   }
 * };
 * ```
 * 
 * @see https://web.dev/push-notifications-subscribing-a-user/
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export type WebPushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface WebPushState {
  /** Whether Web Push is supported in this browser */
  isSupported: boolean;
  /** Current notification permission status */
  permission: WebPushPermission;
  /** Whether user is currently subscribed to push */
  isSubscribed: boolean;
  /** Loading state during async operations */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** The active subscription object (for debugging) */
  subscription: PushSubscription | null;
}

export interface WebPushActions {
  /** Request permission and subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Check current permission status */
  checkPermission: () => Promise<WebPushPermission>;
  /** Check if user is currently subscribed */
  checkSubscription: () => Promise<boolean>;
  /** Request permission without subscribing */
  requestPermission: () => Promise<WebPushPermission>;
}

export type UseWebPushReturn = WebPushState & WebPushActions;

/**
 * Convert base64url string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64url string
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Check if Web Push is supported in current browser
 */
function isWebPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get user-friendly device name from user agent
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return `${browser} on ${os}`;
}

/**
 * Hook for managing Web Push notifications
 */
export function useWebPush(): UseWebPushReturn {
  const { user } = useAuth();
  const [state, setState] = useState<WebPushState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscription: null,
  });
  
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const initializingRef = useRef(false);

  /**
   * Get the service worker registration
   */
  const getServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (serviceWorkerRef.current) {
      return serviceWorkerRef.current;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      serviceWorkerRef.current = registration;
      return registration;
    } catch (err) {
      console.error('[useWebPush] Failed to get service worker registration:', err);
      return null;
    }
  }, []);

  /**
   * Check current permission status
   */
  const checkPermission = useCallback(async (): Promise<WebPushPermission> => {
    if (!isWebPushSupported()) {
      return 'unsupported';
    }
    
    const permission = Notification.permission as WebPushPermission;
    setState(prev => ({ ...prev, permission }));
    return permission;
  }, []);

  /**
   * Check if user is currently subscribed
   */
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!isWebPushSupported()) {
      return false;
    }

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      const isSubscribed = !!subscription;
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed,
        subscription 
      }));
      
      return isSubscribed;
    } catch (err) {
      console.error('[useWebPush] Failed to check subscription:', err);
      return false;
    }
  }, [getServiceWorkerRegistration]);

  /**
   * Request notification permission without subscribing
   */
  const requestPermission = useCallback(async (): Promise<WebPushPermission> => {
    if (!isWebPushSupported()) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      const permission = result as WebPushPermission;
      setState(prev => ({ ...prev, permission }));
      return permission;
    } catch (err) {
      console.error('[useWebPush] Failed to request permission:', err);
      return 'denied';
    }
  }, []);

  /**
   * Save subscription to Supabase
   */
  const saveSubscription = useCallback(async (subscription: PushSubscription): Promise<boolean> => {
    if (!user) {
      console.warn('[useWebPush] Cannot save subscription: no user');
      return false;
    }

    try {
      const subscriptionJSON = subscription.toJSON();
      const keys = subscriptionJSON.keys;

      if (!keys?.p256dh || !keys?.auth) {
        console.error('[useWebPush] Subscription missing required keys');
        return false;
      }

      const { error } = await supabase
        .from('web_push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh_key: keys.p256dh,
            auth_key: keys.auth,
            user_agent: navigator.userAgent,
            device_name: getDeviceName(),
            is_active: true,
            failed_count: 0,
            last_error: null,
          },
          {
            onConflict: 'user_id,endpoint',
          }
        );

      if (error) {
        console.error('[useWebPush] Failed to save subscription:', error);
        return false;
      }

      console.log('[useWebPush] Subscription saved successfully');
      return true;
    } catch (err) {
      console.error('[useWebPush] Error saving subscription:', err);
      return false;
    }
  }, [user]);

  /**
   * Remove subscription from Supabase
   */
  const removeSubscription = useCallback(async (endpoint: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('web_push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (error) {
        console.error('[useWebPush] Failed to remove subscription:', error);
        return false;
      }

      console.log('[useWebPush] Subscription removed successfully');
      return true;
    } catch (err) {
      console.error('[useWebPush] Error removing subscription:', err);
      return false;
    }
  }, [user]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isWebPushSupported()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Web Push is not supported in this browser' 
      }));
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setState(prev => ({ 
        ...prev, 
        error: 'VAPID public key is not configured' 
      }));
      console.error('[useWebPush] VITE_VAPID_PUBLIC_KEY environment variable is not set');
      return false;
    }

    if (!user) {
      setState(prev => ({ 
        ...prev, 
        error: 'User must be logged in to subscribe' 
      }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission if not already granted
      const permission = await requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          permission,
          error: permission === 'denied' 
            ? 'Notification permission was denied. Please enable notifications in your browser settings.' 
            : null
        }));
        return false;
      }

      // Get service worker registration
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Service worker not available' 
        }));
        return false;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      // Create new subscription if none exists
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to Supabase
      const saved = await saveSubscription(subscription);
      
      if (!saved) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Failed to save subscription to server' 
        }));
        return false;
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isSubscribed: true,
        subscription,
        error: null
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useWebPush] Subscribe error:', err);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: `Failed to subscribe: ${errorMessage}`
      }));
      
      return false;
    }
  }, [user, requestPermission, getServiceWorkerRegistration, saveSubscription]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isWebPushSupported()) {
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove from database first
        await removeSubscription(subscription.endpoint);
        
        // Then unsubscribe from push service
        await subscription.unsubscribe();
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isSubscribed: false,
        subscription: null
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useWebPush] Unsubscribe error:', err);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: `Failed to unsubscribe: ${errorMessage}`
      }));
      
      return false;
    }
  }, [getServiceWorkerRegistration, removeSubscription]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initialize = async () => {
      const supported = isWebPushSupported();
      
      if (!supported) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false,
          permission: 'unsupported'
        }));
        return;
      }

      setState(prev => ({ ...prev, isSupported: true }));
      
      // Check permission and subscription status
      await checkPermission();
      await checkSubscription();
    };

    initialize();
  }, [checkPermission, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkPermission,
    checkSubscription,
    requestPermission,
  };
}

/**
 * Hook to request notification permission on first trip creation
 * 
 * @example
 * ```tsx
 * const { requestOnFirstTrip } = useWebPushOnFirstTrip();
 * 
 * // In trip creation handler
 * await createTrip(tripData);
 * await requestOnFirstTrip();
 * ```
 */
export function useWebPushOnFirstTrip() {
  const { subscribe, permission, isSupported } = useWebPush();
  const [hasRequested, setHasRequested] = useState(() => {
    return localStorage.getItem('chravel_push_requested') === 'true';
  });

  const requestOnFirstTrip = useCallback(async () => {
    // Skip if already requested, not supported, or already granted/denied
    if (hasRequested || !isSupported || permission !== 'default') {
      return;
    }

    // Mark as requested
    localStorage.setItem('chravel_push_requested', 'true');
    setHasRequested(true);

    // Subscribe to push notifications
    await subscribe();
  }, [hasRequested, isSupported, permission, subscribe]);

  return {
    requestOnFirstTrip,
    hasRequested,
    shouldPrompt: isSupported && permission === 'default' && !hasRequested,
  };
}

export default useWebPush;

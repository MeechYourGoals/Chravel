/**
 * Native Push Notifications Wrapper
 * Uses Capacitor Push Notifications API with web safety guards
 */

import { Capacitor } from '@capacitor/core';
import { 
  PushNotifications, 
  Token, 
  ActionPerformed, 
  PushNotificationSchema 
} from '@capacitor/push-notifications';

// Typed payload format for Chravel notifications
export interface ChravelPushPayload {
  type: 'chat_message' | 'trip_update' | 'poll_update' | 'task_update' | 'calendar_event' | 'broadcast';
  tripId: string;
  threadId?: string;
  messageId?: string;
  eventId?: string;
  pollId?: string;
  taskId?: string;
}

export interface PushNotificationResult {
  token: string | null;
  error?: string;
}

/**
 * Check if native push is available
 * Guards all native calls to prevent web crashes
 */
export function isNativePush(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

type PermissionResult = 'granted' | 'denied' | 'prompt';

function normalizePermission(permission: string): PermissionResult {
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'prompt';
}

/**
 * Request push notification permissions
 * Call AFTER user consent (e.g., after login, on settings screen)
 */
export async function requestPermissions(): Promise<PermissionResult> {
  if (!isNativePush()) {
    return 'denied';
  }
  
  try {
    const result = await PushNotifications.requestPermissions();
    return normalizePermission(result.receive);
  } catch (error) {
    console.error('[NativePush] Permission request failed:', error);
    return 'denied';
  }
}

/**
 * Check current permission status without prompting
 */
export async function checkPermissions(): Promise<PermissionResult> {
  if (!isNativePush()) {
    return 'denied';
  }
  
  try {
    const result = await PushNotifications.checkPermissions();
    return normalizePermission(result.receive);
  } catch (error) {
    console.error('[NativePush] Check permissions failed:', error);
    return 'denied';
  }
}

/**
 * Register for push notifications
 * Returns the device token on success
 */
export async function register(): Promise<PushNotificationResult> {
  if (!isNativePush()) {
    return { token: null, error: 'Not native platform' };
  }
  
  return new Promise(async (resolve) => {
    // Set up one-time listeners for registration result
    const registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
      await registrationListener.remove();
      resolve({ token: token.value });
    });
    
    const errorListener = await PushNotifications.addListener('registrationError', async (error) => {
      await errorListener.remove();
      console.error('[NativePush] Registration error:', error);
      resolve({ token: null, error: error.error });
    });
    
    // Trigger registration
    try {
      await PushNotifications.register();
    } catch (err) {
      await registrationListener.remove();
      await errorListener.remove();
      resolve({ token: null, error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });
}

/**
 * Unregister from push notifications
 * Removes all listeners
 */
export async function unregister(): Promise<void> {
  if (!isNativePush()) return;
  
  try {
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error('[NativePush] Unregister failed:', error);
  }
}

/**
 * Handle foreground notifications
 * Returns cleanup function to remove listener
 */
export function onNotificationReceived(
  callback: (notification: PushNotificationSchema) => void
): () => void {
  if (!isNativePush()) {
    return () => {};
  }
  
  const listener = PushNotifications.addListener('pushNotificationReceived', callback);
  return () => {
    listener.then(l => l.remove()).catch(console.error);
  };
}

/**
 * Handle notification tap (background/killed state)
 * Returns cleanup function to remove listener
 */
export function onNotificationActionPerformed(
  callback: (action: ActionPerformed) => void
): () => void {
  if (!isNativePush()) {
    return () => {};
  }
  
  const listener = PushNotifications.addListener('pushNotificationActionPerformed', callback);
  return () => {
    listener.then(l => l.remove()).catch(console.error);
  };
}

/**
 * Parse notification data into typed Chravel payload
 */
export function parsePayload(data: Record<string, unknown>): ChravelPushPayload | null {
  if (!data || typeof data.type !== 'string' || typeof data.tripId !== 'string') {
    return null;
  }
  
  const validTypes = ['chat_message', 'trip_update', 'poll_update', 'task_update', 'calendar_event', 'broadcast'];
  if (!validTypes.includes(data.type)) {
    return null;
  }
  
  return {
    type: data.type as ChravelPushPayload['type'],
    tripId: data.tripId as string,
    threadId: typeof data.threadId === 'string' ? data.threadId : undefined,
    messageId: typeof data.messageId === 'string' ? data.messageId : undefined,
    eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
    pollId: typeof data.pollId === 'string' ? data.pollId : undefined,
    taskId: typeof data.taskId === 'string' ? data.taskId : undefined,
  };
}

/**
 * Get delivered notifications (iOS badge management)
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!isNativePush()) {
    return [];
  }
  
  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  } catch (error) {
    console.error('[NativePush] Get delivered failed:', error);
    return [];
  }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!isNativePush()) return;
  
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('[NativePush] Remove delivered failed:', error);
  }
}

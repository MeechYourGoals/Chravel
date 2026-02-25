/**
 * Push Token Storage Service
 * Manages device tokens in Supabase for push notification delivery
 */

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

const DEVICE_ID_KEY = 'chravel_device_id';

/**
 * Generate or retrieve a stable device ID
 * Persisted in localStorage for consistency across sessions
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the current platform
 */
function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Save a device token to Supabase
 * Uses upsert to handle token refresh scenarios
 */
export async function saveDeviceToken(userId: string, token: string): Promise<boolean> {
  const platform = getPlatform();
  const deviceId = getDeviceId();
  const now = new Date().toISOString();

  try {
    const { error } = await supabase.from('push_device_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        device_id: deviceId,
        last_seen_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id,token',
      },
    );

    if (error) {
      console.error('[PushTokenService] Failed to save token:', error);
      return false;
    }

    console.log('[PushTokenService] Token saved successfully');
    return true;
  } catch (err) {
    console.error('[PushTokenService] Unexpected error saving token:', err);
    return false;
  }
}

/**
 * Remove a device token from Supabase
 * Called on logout or when user disables notifications
 */
export async function removeDeviceToken(userId: string, token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('[PushTokenService] Failed to remove token:', error);
      return false;
    }

    console.log('[PushTokenService] Token removed successfully');
    return true;
  } catch (err) {
    console.error('[PushTokenService] Unexpected error removing token:', err);
    return false;
  }
}

/**
 * Remove all device tokens for a user
 * Called on full logout from all devices
 */
export async function removeAllUserTokens(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('push_device_tokens').delete().eq('user_id', userId);

    if (error) {
      console.error('[PushTokenService] Failed to remove all tokens:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[PushTokenService] Unexpected error removing all tokens:', err);
    return false;
  }
}

/**
 * Update last_seen_at timestamp for a token
 * Call periodically to track active devices
 */
export async function updateLastSeen(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('push_device_tokens')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', token);
  } catch (err) {
    // Silent fail - not critical
    console.warn('[PushTokenService] Failed to update last_seen:', err);
  }
}

/**
 * Get all tokens for a user (for debugging)
 */
export async function getUserTokens(userId: string): Promise<DeviceToken[]> {
  try {
    const { data, error } = await supabase
      .from('push_device_tokens')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform as 'ios' | 'android' | 'web',
      deviceId: row.device_id,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[PushTokenService] Failed to get user tokens:', err);
    return [];
  }
}

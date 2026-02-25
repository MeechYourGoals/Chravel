import { supabase } from '@/integrations/supabase/client';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

interface UserPreferences {
  archived_trips?: {
    consumer: string[];
    pro: string[];
    event: string[];
  };
  demo_mode_enabled?: boolean;
  last_updated?: string;
}

export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  // Get user preferences from secure server-side storage (fallback to platform storage for now)
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // For now, use platform storage until user_preferences table is set up
      return await getStorageItem<UserPreferences>(`user_preferences_${userId}`, {});
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return {};
    }
  }

  // Save user preferences to secure server-side storage (fallback to platform storage for now)
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const updatedPreferences = {
        ...preferences,
        last_updated: new Date().toISOString(),
      };

      // For now, use platform storage until user_preferences table is set up
      await setStorageItem(`user_preferences_${userId}`, updatedPreferences);
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
    }
  }

  // Fallback to platform storage for non-authenticated users (demo mode only)
  private async getLocalPreferences<T>(key: string): Promise<T | null> {
    try {
      return await getStorageItem<T>(key);
    } catch (error) {
      console.warn('Failed to parse local preferences:', error);
      return null;
    }
  }

  private async setLocalPreferences<T>(key: string, value: T): Promise<void> {
    try {
      await setStorageItem(key, value);
    } catch (error) {
      console.warn('Failed to save local preferences:', error);
    }
  }

  // Archive operations with secure storage
  async getArchivedTrips(userId?: string): Promise<UserPreferences['archived_trips']> {
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      return preferences.archived_trips || { consumer: [], pro: [], event: [] };
    } else {
      // Fallback for demo mode
      return (
        this.getLocalPreferences('trips_archive_state') || { consumer: [], pro: [], event: [] }
      );
    }
  }

  async saveArchivedTrips(
    archivedTrips: UserPreferences['archived_trips'],
    userId?: string,
  ): Promise<void> {
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      await this.saveUserPreferences(userId, {
        ...preferences,
        archived_trips: archivedTrips,
      });
    } else {
      // Fallback for demo mode
      this.setLocalPreferences('trips_archive_state', archivedTrips);
    }
  }

  // Demo mode operations with secure storage
  async isDemoModeEnabled(userId?: string): Promise<boolean> {
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      return preferences.demo_mode_enabled || false;
    } else {
      const value = await getStorageItem<string>('TRIPS_DEMO_MODE');
      return value === 'true';
    }
  }

  async setDemoMode(enabled: boolean, userId?: string): Promise<void> {
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      await this.saveUserPreferences(userId, {
        ...preferences,
        demo_mode_enabled: enabled,
      });
    } else {
      if (enabled) {
        await setStorageItem('TRIPS_DEMO_MODE', 'true');
      } else {
        await removeStorageItem('TRIPS_DEMO_MODE');
      }
    }
  }

  // Clear all preferences (for logout/reset)
  async clearUserPreferences(userId: string): Promise<void> {
    try {
      const { error } = await supabase.from('user_preferences').delete().eq('user_id', userId);

      if (error) {
        console.error('Error clearing user preferences:', error);
      }
    } catch (error) {
      console.error('Error in clearUserPreferences:', error);
    }
  }
}

export const secureStorageService = SecureStorageService.getInstance();

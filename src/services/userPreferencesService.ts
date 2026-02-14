import { supabase } from '@/integrations/supabase/client';
import { TripPreferences } from '@/types/consumer';

export interface AppPreferences {
  hide_sample_content?: boolean;
  ai_concierge_preferences?: TripPreferences;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  hide_sample_content: false,
  ai_concierge_preferences: {
    dietary: [],
    vibe: [],
    accessibility: [],
    business: [],
    entertainment: [],
    lifestyle: [],
    budgetMin: 0,
    budgetMax: 1000,
    timePreference: 'flexible',
  },
};

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_phone_number?: string | null; // Phone number for SMS delivery
  chat_messages: boolean;
  mentions_only: boolean;
  broadcasts: boolean;
  tasks: boolean;
  payments: boolean;
  calendar_events: boolean;
  calendar_reminders: boolean; // Alias for calendar_events for backward compatibility
  polls: boolean;
  trip_invites: boolean;
  join_requests: boolean;
  basecamp_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

// Category types that map to database columns
export type NotificationCategory =
  | 'chat_messages'
  | 'broadcasts'
  | 'calendar_events'
  | 'payments'
  | 'tasks'
  | 'polls'
  | 'trip_invites'
  | 'join_requests'
  | 'basecamp_updates';

// Categories eligible for email delivery (high-signal only)
export const EMAIL_ELIGIBLE_CATEGORIES: NotificationCategory[] = [
  'broadcasts',
  'payments',
  'basecamp_updates',
];

// Categories eligible for SMS delivery (high-urgency only)
export const SMS_ELIGIBLE_CATEGORIES: NotificationCategory[] = [
  'broadcasts',       // Critical announcements from organizers
  'payments',         // Payment requests and deadlines
  'basecamp_updates', // Location/basecamp changes
  'calendar_events',  // Event updates and reminders
  'join_requests',    // New member join requests (for organizers)
  'tasks',            // Assigned task notifications
  'polls',            // New poll notifications
  'chat_messages',    // Privacy-safe new message alerts
];

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  email_enabled: false,
  sms_enabled: false,
  chat_messages: false,
  mentions_only: true,
  broadcasts: true,
  tasks: true,
  payments: true,
  calendar_events: true,
  calendar_reminders: true,
  polls: true,
  trip_invites: true,
  join_requests: true,
  basecamp_updates: true,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '08:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const userPreferencesService = {
  async get(userId: string): Promise<AppPreferences> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...(data?.preferences || {}) } as AppPreferences;
    } catch (e) {
      return DEFAULT_PREFERENCES;
    }
  },

  async set(userId: string, updates: Partial<AppPreferences>): Promise<boolean> {
    try {
      const current = await this.get(userId);
      const merged = { ...current, ...updates };

      const { error } = await (supabase as any)
        .from('user_preferences')
        .upsert({ user_id: userId, preferences: merged }, { onConflict: 'user_id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  async getAIPreferences(userId: string): Promise<TripPreferences> {
    const prefs = await this.get(userId);
    return prefs.ai_concierge_preferences || DEFAULT_PREFERENCES.ai_concierge_preferences!;
  },

  async setAIPreferences(userId: string, aiPrefs: TripPreferences): Promise<boolean> {
    return this.set(userId, { ai_concierge_preferences: aiPrefs });
  },

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching notification preferences:', error);
        }
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      if (!data) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data } as NotificationPreferences;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to get notification preferences:', error);
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  },

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            ...preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating notification preferences:', error);
        }
        throw error;
      }

      return data as NotificationPreferences;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to update notification preferences:', error);
      }
      throw error;
    }
  },
};

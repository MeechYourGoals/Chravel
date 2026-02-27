import { supabase } from '@/integrations/supabase/client';

export interface TripSettings {
    trip_id: string;
    privacy_mode: string;
    ai_access_enabled: boolean;
    can_change_privacy: boolean;
}

export interface UserTripPreferences {
    user_id: string;
    trip_id: string;
    show_system_messages: boolean;
    // ... other prefs
}

/**
 * Settings Repository (TDAL)
 */
export const settingsRepo = {
    /**
     * Get global trip settings (privacy, AI).
     */
    async getTripSettings(tripId: string): Promise<TripSettings | null> {
        const { data, error } = await supabase
            .from('trip_privacy_configs')
            .select('*')
            .eq('trip_id', tripId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Get per-user preferences for a trip.
     */
    async getUserPreferences(tripId: string, userId: string): Promise<UserTripPreferences | null> {
        const { data, error } = await supabase
            .from('trip_member_preferences')
            .select('*')
            .eq('trip_id', tripId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Update trip settings.
     */
    async updateTripSettings(tripId: string, updates: Partial<TripSettings>): Promise<void> {
        const { error } = await supabase
            .from('trip_privacy_configs')
            .update(updates)
            .eq('trip_id', tripId);

        if (error) throw error;
    }
};

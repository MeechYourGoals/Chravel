import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from './demoModeService';
import { tripsData } from '@/data/tripsData';
import { adaptTripsDataToTripSchema } from '@/utils/schemaAdapters';

/**
 * Normalizes date input to YYYY-MM-DD format for database date columns
 * Accepts: YYYY-MM-DD, MM/DD/YYYY, or ISO 8601 datetime strings
 * Returns date-only format (YYYY-MM-DD) expected by Postgres date columns
 */
function normalizeDateInput(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // If already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If ISO 8601 datetime, extract date part only
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Match MM/DD/YYYY and convert to YYYY-MM-DD
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return undefined;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  trip_type: string;
  basecamp_name?: string;
  basecamp_address?: string;
  enabled_features?: string[];  // ✅ Phase 2: Feature toggles for Pro/Event trips
}

export interface CreateTripData {
  id?: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  trip_type?: string;
  basecamp_name?: string;
  basecamp_address?: string;
  enabled_features?: string[];  // ✅ Phase 2: Feature toggles for Pro/Event trips
}

export const tripService = {
  async createTrip(tripData: CreateTripData): Promise<Trip | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Enhanced validation with detailed error logging
      if (!user) {
        if (import.meta.env.DEV) {
          console.error('[tripService] No authenticated user found');
        }
        throw new Error('No authenticated user');
      }

      if (!user.id) {
        if (import.meta.env.DEV) {
          console.error('[tripService] Authenticated user missing ID', { user });
        }
        throw new Error('Invalid user state - missing ID');
      }

      // Check active trip limit for free users
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_product_id, email')
        .eq('user_id', user.id)
        .single();

      // Super admin bypass - ccamechi@gmail.com has unlimited access
      const { SUPER_ADMIN_EMAILS } = await import('@/constants/admins');
      const isSuperAdmin = profile?.email && SUPER_ADMIN_EMAILS.includes(profile.email.toLowerCase().trim());
      
      if (isSuperAdmin) {
        console.log('[tripService] Super admin bypass for:', profile.email);
      } else {
        const tier = profile?.subscription_status === 'active' 
          ? (profile.subscription_product_id?.includes('explorer') ? 'explorer' : 'frequent-chraveler')
          : 'free';

        // Count active (non-archived) trips OF THE SAME TYPE being created
        const tripTypeToCheck = tripData.trip_type || 'consumer';
        const { count, error: countError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .eq('is_archived', false)
          .eq('trip_type', tripTypeToCheck);

        if (countError) throw countError;

        // 3 trips per type for free users
        const activeTripsLimit = tier === 'free' ? 3 : -1;
        if (activeTripsLimit !== -1 && (count || 0) >= activeTripsLimit) {
          throw new Error('TRIP_LIMIT_REACHED');
        }
      }

      // Dates already in ISO 8601 format from CreateTripModal - no normalization needed
      console.log('[tripService] Creating trip:', {
        name: tripData.name,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        trip_type: tripData.trip_type,
        user_id: user.id
      });

      // Use edge function for server-side validation and Pro tier enforcement
      const { data, error } = await supabase.functions.invoke('create-trip', {
        body: {
          name: tripData.name,
          description: tripData.description,
          destination: tripData.destination,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          trip_type: tripData.trip_type || 'consumer',
          cover_image_url: tripData.cover_image_url,
          enabled_features: tripData.enabled_features  // ✅ Phase 2: Pass feature toggles
        }
      });

      console.log('[tripService] Edge function response:', { success: data?.success, error });

      if (error) {
        console.error('[tripService] Edge function error:', error);
        throw new Error(error.message || 'Failed to create trip');
      }

      if (!data?.success) {
        console.error('[tripService] Edge function returned failure:', data);
        throw new Error(data?.error || 'Failed to create trip');
      }

      console.log('[tripService] Trip created successfully:', data.trip.id);
      return data.trip;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[tripService] Error creating trip:', error);
      }
      // Re-throw to preserve error message for UI
      throw error;
    }
  },

  async getUserTrips(isDemoMode?: boolean): Promise<Trip[]> {
    try {
      // Phase 3: Accept isDemoMode as parameter to avoid repeated checks
      const demoEnabled = isDemoMode ?? await demoModeService.isDemoModeEnabled();
      if (demoEnabled) {
        // PHASE 0A: Use schema adapter to convert tripsData to Trip interface
        // This ensures all 12 consumer trips are returned in the correct format
        const adaptedTrips = adaptTripsDataToTripSchema(tripsData);
        return adaptedTrips;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Phase 2: Optimized query - direct lookup without JOIN
      // Uses indexed created_by column and RLS policies for access control
      // Filters out both archived and hidden trips (they have separate sections)
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_archived', false)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching trips:', error);
      }
      return [];
    }
  },

  async getTripById(tripId: string): Promise<Trip | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching trip:', error);
      }
      return null;
    }
  },

  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating trip:', error);
      }
      return false;
    }
  },

  async archiveTrip(tripId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ is_archived: true })
        .eq('id', tripId);

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error archiving trip:', error);
      }
      return false;
    }
  },

  async getTripMembers(tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('trip_id', tripId);

      if (error) throw error;
      
      // Fetch profiles separately since there's no foreign key
      if (!data || data.length === 0) return [];
      
      const userIds = data.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, email')
        .in('user_id', userIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      
      // Merge trip_members with profiles
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      return data.map(m => ({
        ...m,
        profiles: profilesMap.get(m.user_id) || null
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching trip members:', error);
      }
      return [];
    }
  },

  async addTripMember(tripId: string, userId: string, role: string = 'member'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: role
        });

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding trip member:', error);
      }
      return false;
    }
  }
};
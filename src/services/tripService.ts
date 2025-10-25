import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from './demoModeService';
import { tripsData } from '@/data/tripsData';
import { adaptTripsDataToTripSchema } from '@/utils/schemaAdapters';

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
}

export const tripService = {
  async createTrip(tripData: CreateTripData): Promise<Trip | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Enhanced validation with detailed error logging
      if (!user) {
        console.error('[tripService] No authenticated user found');
        throw new Error('No authenticated user');
      }
      
      if (!user.id) {
        console.error('[tripService] Authenticated user missing ID', { user });
        throw new Error('Invalid user state - missing ID');
      }
      
      console.log('[tripService] Creating trip for user:', user.id, 'Trip data:', tripData);

      // Use edge function for server-side validation and Pro tier enforcement
      const { data, error } = await supabase.functions.invoke('create-trip', {
        body: {
          name: tripData.name,
          description: tripData.description,
          destination: tripData.destination,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          trip_type: tripData.trip_type || 'consumer',
          cover_image_url: tripData.cover_image_url
        }
      });

      if (error) {
        console.error('[tripService] Edge function error:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('[tripService] Edge function returned failure:', data);
        throw new Error(data?.error || 'Failed to create trip');
      }

      console.log('[tripService] Trip created successfully:', data.trip);
      return data.trip;
    } catch (error) {
      console.error('[tripService] Error creating trip:', error);
      return null;
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
        console.log(`[tripService] Demo mode enabled - returning ${adaptedTrips.length} adapted consumer trips`);
        return adaptedTrips;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Phase 2: Optimized query - direct lookup without JOIN
      // Uses indexed created_by column and RLS policies for access control
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trips:', error);
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
      console.error('Error fetching trip:', error);
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
      console.error('Error updating trip:', error);
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
      console.error('Error archiving trip:', error);
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
          created_at,
          profiles:user_id (
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip members:', error);
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
      console.error('Error adding trip member:', error);
      return false;
    }
  }
};
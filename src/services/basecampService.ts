import { supabase } from '../integrations/supabase/client';
import { BasecampLocation } from '../types/basecamp';

export interface TripBasecamp {
  trip_id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface PersonalBasecamp {
  id: string;
  trip_id: string;
  user_id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

class BasecampService {
  /**
   * Get the trip basecamp (shared across all users)
   */
  async getTripBasecamp(tripId: string): Promise<BasecampLocation | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error('Failed to get trip basecamp:', error);
        return null;
      }

      if (!data?.basecamp_address) {
        return null;
      }

      return {
        address: data.basecamp_address,
        name: data.basecamp_name || undefined,
        type: 'other', // Trip basecamps default to 'other' type
        coordinates: undefined // Can be enhanced later
      };
    } catch (error) {
      console.error('Error getting trip basecamp:', error);
      return null;
    }
  }

  /**
   * Set the trip basecamp (shared across all users)
   * Only trip creator/admin can do this
   */
  async setTripBasecamp(
    tripId: string,
    basecamp: { name?: string; address: string; latitude?: number; longitude?: number }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          basecamp_name: basecamp.name,
          basecamp_address: basecamp.address
        })
        .eq('id', tripId);

      if (error) {
        console.error('Failed to set trip basecamp:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting trip basecamp:', error);
      return false;
    }
  }

  /**
   * Get user's personal basecamp for a trip
   */
  async getPersonalBasecamp(tripId: string, userId?: string): Promise<PersonalBasecamp | null> {
    try {
      const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!effectiveUserId) {
        return null;
      }

      const { data, error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error('Failed to get personal basecamp:', error);
        return null;
      }

      return data as PersonalBasecamp | null;
    } catch (error) {
      console.error('Error getting personal basecamp:', error);
      return null;
    }
  }

  /**
   * Set/update user's personal basecamp for a trip
   */
  async upsertPersonalBasecamp(payload: {
    trip_id: string;
    name?: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }): Promise<PersonalBasecamp | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .upsert({
          trip_id: payload.trip_id,
          user_id: user.id,
          name: payload.name,
          address: payload.address,
          latitude: payload.latitude,
          longitude: payload.longitude,
        }, {
          onConflict: 'trip_id,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to upsert personal basecamp:', error);
        throw error;
      }

      return data as PersonalBasecamp;
    } catch (error) {
      console.error('Error upserting personal basecamp:', error);
      return null;
    }
  }

  /**
   * Delete user's personal basecamp
   */
  async deletePersonalBasecamp(basecampId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .delete()
        .eq('id', basecampId);

      if (error) {
        console.error('Failed to delete personal basecamp:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting personal basecamp:', error);
      return false;
    }
  }

  /**
   * Convert PersonalBasecamp to BasecampLocation format
   */
  toBasecampLocation(basecamp: PersonalBasecamp): BasecampLocation {
    return {
      address: basecamp.address || '',
      name: basecamp.name,
      type: 'other',
      coordinates: basecamp.latitude && basecamp.longitude
        ? { lat: basecamp.latitude, lng: basecamp.longitude }
        : undefined
    };
  }
}

export const basecampService = new BasecampService();

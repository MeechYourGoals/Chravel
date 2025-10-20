import { supabase } from '../integrations/supabase/client';

export interface PersonalAccommodation {
  id: string;
  trip_id: string;
  user_id: string;
  accommodation_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  check_in?: string;
  check_out?: string;
  accommodation_type: 'hotel' | 'airbnb' | 'hostel' | 'apartment' | 'resort' | 'other';
  created_at: string;
  updated_at: string;
}

export interface CreateAccommodationRequest {
  trip_id: string;
  accommodation_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  check_in?: string;
  check_out?: string;
  accommodation_type?: 'hotel' | 'airbnb' | 'hostel' | 'apartment' | 'resort' | 'other';
}

export interface UpdateAccommodationRequest {
  accommodation_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  check_in?: string;
  check_out?: string;
  accommodation_type?: 'hotel' | 'airbnb' | 'hostel' | 'apartment' | 'resort' | 'other';
}

class PersonalAccommodationService {
  /**
   * Get user's accommodation for a specific trip
   */
  async getUserAccommodation(tripId: string, userId?: string): Promise<PersonalAccommodation | null> {
    const { data, error } = await (supabase as any)
      .from('user_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id || '')
      .maybeSingle();

    if (error) {
      console.error('Failed to get user accommodation:', error);
      throw error;
    }

    return data as PersonalAccommodation | null;
  }

  /**
   * Get all accommodations for a trip
   */
  async getTripAccommodations(tripId: string): Promise<PersonalAccommodation[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PersonalAccommodation[];
    } catch (error) {
      console.error('Failed to get trip accommodations:', error);
      return [];
    }
  }

  /**
   * Create or update user's accommodation
   */
  async setUserAccommodation(request: CreateAccommodationRequest): Promise<PersonalAccommodation | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await (supabase as any)
      .from('user_accommodations')
      .upsert({
        trip_id: request.trip_id,
        user_id: user.id,
        accommodation_name: request.accommodation_name,
        address: request.address,
        latitude: request.latitude,
        longitude: request.longitude,
        check_in: request.check_in,
        check_out: request.check_out,
        accommodation_type: request.accommodation_type || 'hotel'
      }, {
        onConflict: 'trip_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to set user accommodation:', error);
      throw error;
    }
    return data as PersonalAccommodation | null;
  }

  /**
   * Update user's accommodation
   */
  async updateUserAccommodation(
    accommodationId: string, 
    updates: UpdateAccommodationRequest
  ): Promise<PersonalAccommodation | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_accommodations')
        .update(updates)
        .eq('id', accommodationId)
        .select()
        .single();

      if (error) throw error;
      return data as PersonalAccommodation | null;
    } catch (error) {
      console.error('Failed to update user accommodation:', error);
      return null;
    }
  }

  /**
   * Delete user's accommodation
   */
  async deleteUserAccommodation(accommodationId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('user_accommodations')
        .delete()
        .eq('id', accommodationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete user accommodation:', error);
      return false;
    }
  }

  /**
   * Get accommodations within a radius of a location
   */
  async getAccommodationsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<PersonalAccommodation[]> {
    try {
      // Use PostGIS ST_DWithin for accurate distance calculation
      const { data, error } = await (supabase as any).rpc('get_accommodations_within_radius', {
        lat: latitude,
        lng: longitude,
        radius: radiusKm * 1000 // Convert km to meters
      });

      if (error) throw error;
      return (data || []) as PersonalAccommodation[];
    } catch (error) {
      console.error('Failed to get accommodations near location:', error);
      return [];
    }
  }

  /**
   * Get accommodation statistics for a trip
   */
  async getTripAccommodationStats(tripId: string): Promise<{
    totalAccommodations: number;
    accommodationTypes: Record<string, number>;
    averageDistanceFromBasecamp?: number;
  }> {
    try {
      const accommodations = await this.getTripAccommodations(tripId);
      
      const stats = {
        totalAccommodations: accommodations.length,
        accommodationTypes: accommodations.reduce((acc, accommodation) => {
          acc[accommodation.accommodation_type] = (acc[accommodation.accommodation_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get accommodation stats:', error);
      return {
        totalAccommodations: 0,
        accommodationTypes: {}
      };
    }
  }
}

export const personalAccommodationService = new PersonalAccommodationService();

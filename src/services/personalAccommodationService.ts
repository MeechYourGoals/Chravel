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

export interface TripBasecamp {
  id: string;
  trip_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  created_by: string;
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

  // Update user's personal accommodation
  static async updateAccommodation(
    accommodationId: string, 
    updates: UpdateAccommodationRequest
  ): Promise<PersonalAccommodation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_accommodations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', accommodationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as PersonalAccommodation;
    } catch (error) {
      console.error('Error updating personal accommodation:', error);
      return null;
    }
  }

  // Delete user's personal accommodation
  static async deleteAccommodation(accommodationId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_accommodations')
        .delete()
        .eq('id', accommodationId)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting personal accommodation:', error);
      return false;
    }
  }

  // Instance method for deleting user accommodation
  async deleteUserAccommodation(accommodationId: string): Promise<boolean> {
    return PersonalAccommodationService.deleteAccommodation(accommodationId);
  }

  // Get trip basecamp (shared by all members)
  static async getTripBasecamp(tripId: string): Promise<TripBasecamp | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      
      if (!data.basecamp_name) return null;

      return {
        id: `basecamp_${tripId}`,
        trip_id: tripId,
        name: data.basecamp_name,
        address: data.basecamp_address || '',
        latitude: data.basecamp_latitude,
        longitude: data.basecamp_longitude,
        created_by: '', // Not stored in trips table
        created_at: '',
        updated_at: ''
      };
    } catch (error) {
      console.error('Error fetching trip basecamp:', error);
      return null;
    }
  }

  // Update trip basecamp (admin only)
  static async updateTripBasecamp(
    tripId: string, 
    name: string, 
    address: string, 
    latitude?: number, 
    longitude?: number
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is trip admin
      const { data: trip } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();

      if (!trip || trip.created_by !== user.id) {
        throw new Error('Only trip admin can update basecamp');
      }

      const { error } = await supabase
        .from('trips')
        .update({
          basecamp_name: name,
          basecamp_address: address,
          basecamp_latitude: latitude,
          basecamp_longitude: longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating trip basecamp:', error);
      return false;
    }
  }
}

export { PersonalAccommodationService };
export const personalAccommodationService = new PersonalAccommodationService();
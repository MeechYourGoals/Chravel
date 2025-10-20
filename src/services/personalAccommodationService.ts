import { supabase } from '@/integrations/supabase/client';
import { UserAccommodation, CreateAccommodationRequest, UpdateAccommodationRequest, TripBasecamp } from '@/types/accommodations';

export class PersonalAccommodationService {
  // Get user's personal accommodation for a trip
  static async getMyAccommodation(tripId: string): Promise<UserAccommodation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching personal accommodation:', error);
      return null;
    }
  }

  // Create or update user's personal accommodation
  static async saveAccommodation(request: CreateAccommodationRequest): Promise<UserAccommodation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_accommodations')
        .upsert({
          trip_id: request.trip_id,
          user_id: user.id,
          label: request.label || 'My Stay',
          address: request.address,
          latitude: request.latitude,
          longitude: request.longitude,
          place_id: request.place_id,
          is_private: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'trip_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving personal accommodation:', error);
      return null;
    }
  }

  // Update user's personal accommodation
  static async updateAccommodation(
    accommodationId: string, 
    updates: UpdateAccommodationRequest
  ): Promise<UserAccommodation | null> {
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
      return data;
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

  // Get trip basecamp (shared by all members)
  static async getTripBasecamp(tripId: string): Promise<TripBasecamp | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address, basecamp_lat, basecamp_lng')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      
      if (!data.basecamp_name) return null;

      return {
        id: `basecamp_${tripId}`,
        trip_id: tripId,
        name: data.basecamp_name,
        address: data.basecamp_address || '',
        latitude: data.basecamp_lat,
        longitude: data.basecamp_lng,
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
          basecamp_lat: latitude,
          basecamp_lng: longitude,
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
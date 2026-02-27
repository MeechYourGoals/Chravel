import { supabase } from '@/integrations/supabase/client';
import { Trip, CreateTripData } from '@/services/tripService';

/**
 * Trip Repository (TDAL)
 *
 * Single Source of Truth for Trip Metadata.
 * Responsible for Create, Read, Update, Delete (CRUD) and caching via standard keys.
 */
export const tripRepo = {
  /**
   * Fetch a trip by ID.
   * Prefer this over direct supabase.from('trips').select().
   */
  async getById(tripId: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * List trips created by a user.
   */
  async listByCreator(userId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('created_by', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new trip.
   */
  async create(data: CreateTripData): Promise<Trip> {
    // Ideally calls the Edge Function 'create-trip' for complex logic
    // But for simple cases, direct insert is fine if RLS allows.
    // Here we wrap the existing service logic or implement it directly.
    // For now, let's keep it simple and assume the service handles the complex Edge Function part.
    // We will just expose the data access pattern.

    // In a full refactor, we'd move the service logic here.
    // For this step, we'll implement direct DB access where possible.
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse.user?.id) {
        throw new Error('User authentication required to create a trip.');
    }

    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert({
        name: data.name,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        destination: data.destination,
        cover_image_url: data.cover_image_url,
        trip_type: data.trip_type || 'consumer',
        created_by: userResponse.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return newTrip;
  },

  /**
   * Update trip metadata.
   */
  async update(tripId: string, updates: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Archive a trip (soft delete).
   */
  async archive(tripId: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .update({ is_archived: true })
      .eq('id', tripId);

    if (error) throw error;
  },
};

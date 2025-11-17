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

export interface BasecampChangeHistory {
  id: string;
  trip_id: string;
  user_id: string;
  basecamp_type: 'trip' | 'personal';
  action: 'created' | 'updated' | 'deleted';
  previous_name?: string;
  previous_address?: string;
  previous_latitude?: number;
  previous_longitude?: number;
  new_name?: string;
  new_address?: string;
  new_latitude?: number;
  new_longitude?: number;
  created_at: string;
}

class BasecampService {
  /**
   * Get the trip basecamp (shared across all users)
   */
  async getTripBasecamp(tripId: string): Promise<BasecampLocation | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
        .eq('id', tripId)
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to get trip basecamp:', error);
        return null;
      }

      if (!data?.basecamp_address) {
        return null;
      }

      return {
        address: data.basecamp_address,
        name: data.basecamp_name || undefined,
        type: 'other',
        coordinates: data.basecamp_latitude && data.basecamp_longitude
          ? { lat: data.basecamp_latitude, lng: data.basecamp_longitude }
          : undefined
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting trip basecamp:', error);
      return null;
    }
  }

  /**
   * Validate address by attempting geocoding
   * Returns coordinates if valid, null if invalid
   */
  async validateAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Import GoogleMapsService dynamically to avoid circular dependencies
      const { GoogleMapsService } = await import('./googleMapsService');
      
      // Try geocoding first (most reliable for addresses)
      let coordinates = await GoogleMapsService.geocodeAddress(address);
      
      // If geocoding fails, try text search as fallback
      if (!coordinates) {
        const textSearchResult = await GoogleMapsService.searchPlacesByText(address);
        if (textSearchResult?.results?.[0]?.geometry?.location) {
          coordinates = {
            lat: textSearchResult.results[0].geometry.location.lat,
            lng: textSearchResult.results[0].geometry.location.lng
          };
        }
      }


      return coordinates;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error validating address:', error);
      return null;
    }
  }

  /**
   * Set the trip basecamp (shared across all users)
   * Only trip creator/admin can do this
   * Validates address geocoding if coordinates not provided
   * Logs changes to history
   */
  async setTripBasecamp(
    tripId: string,
    basecamp: { name?: string; address: string; latitude?: number; longitude?: number },
    options?: { validateAddress?: boolean; skipHistory?: boolean; currentVersion?: number }
  ): Promise<{ success: boolean; error?: string; conflict?: boolean; coordinates?: { lat: number; lng: number } }> {
    try {
      // Get current version if not provided
      const currentVersion = options?.currentVersion ?? await this.getBasecampVersion(tripId);
      
      let finalLatitude = basecamp.latitude;
      let finalLongitude = basecamp.longitude;

      // Validate address geocoding if coordinates missing and validation enabled
      if ((!finalLatitude || !finalLongitude) && options?.validateAddress !== false) {
        const validatedCoords = await this.validateAddress(basecamp.address);
        if (validatedCoords) {
          finalLatitude = validatedCoords.lat;
          finalLongitude = validatedCoords.lng;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Use versioned update RPC
      const { data, error } = await supabase.rpc('update_trip_basecamp_with_version', {
        p_trip_id: tripId,
        p_current_version: currentVersion,
        p_name: basecamp.name || null,
        p_address: basecamp.address,
        p_latitude: finalLatitude || null,
        p_longitude: finalLongitude || null,
        p_user_id: userId
      }) as { data: any; error: any };

      if (error) {
        console.error('Failed to update basecamp:', error);
        return { success: false, error: error.message };
      }

      // Check for conflict
      if (data && typeof data === 'object' && data.conflict === true) {
        return {
          success: false,
          conflict: true,
          error: 'Basecamp was modified by another user. Please refresh and try again.'
        };
      }

      return {
        success: true,
        coordinates: finalLatitude && finalLongitude ? { lat: finalLatitude, lng: finalLongitude } : undefined
      };
    } catch (error) {
      console.error('Error setting trip basecamp:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the current basecamp version for a trip
   */
  async getBasecampVersion(tripId: string): Promise<number> {
    const { data, error } = await supabase
      .from('trips')
      .select('basecamp_version')
      .eq('id', tripId)
      .single();
    
    return data?.basecamp_version ?? 1;
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
        if (import.meta.env.DEV) console.error('Failed to get personal basecamp:', error);
        return null;
      }

      return data as PersonalBasecamp | null;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting personal basecamp:', error);
      return null;
    }
  }

  /**
   * Set/update user's personal basecamp for a trip
   * Validates address geocoding if coordinates not provided
   * Logs changes to history
   */
  async upsertPersonalBasecamp(
    payload: {
      trip_id: string;
      name?: string;
      address: string;
      latitude?: number;
      longitude?: number;
    },
    options?: { validateAddress?: boolean; skipHistory?: boolean }
  ): Promise<PersonalBasecamp | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current personal basecamp for history logging
      const currentBasecamp = await this.getPersonalBasecamp(payload.trip_id, user.id);
      const isUpdate = !!currentBasecamp;

      let finalLatitude = payload.latitude;
      let finalLongitude = payload.longitude;

      // Validate address geocoding if coordinates missing and validation enabled
      if ((!finalLatitude || !finalLongitude) && options?.validateAddress !== false) {
        const validatedCoords = await this.validateAddress(payload.address);
        if (validatedCoords) {
          finalLatitude = validatedCoords.lat;
          finalLongitude = validatedCoords.lng;
        }
      }

      const { data, error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .upsert({
          trip_id: payload.trip_id,
          user_id: user.id,
          name: payload.name,
          address: payload.address,
          latitude: finalLatitude,
          longitude: finalLongitude,
        }, {
          onConflict: 'trip_id,user_id'
        })
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to upsert personal basecamp:', error);
        throw error;
      }

      // Log to history (if not skipped)
      if (!options?.skipHistory) {
        try {
          // @ts-ignore - Edge function not in generated types yet
          await supabase.rpc('log_basecamp_change', {
            p_trip_id: payload.trip_id,
            p_user_id: user.id,
            p_basecamp_type: 'personal',
            p_action: isUpdate ? 'updated' : 'created',
            p_previous_name: currentBasecamp?.name || null,
            p_previous_address: currentBasecamp?.address || null,
            p_previous_latitude: currentBasecamp?.latitude || null,
            p_previous_longitude: currentBasecamp?.longitude || null,
            p_new_name: payload.name || null,
            p_new_address: payload.address,
            p_new_latitude: finalLatitude || null,
            p_new_longitude: finalLongitude || null
          });
        } catch (historyError) {
          // Don't fail the operation if history logging fails
          if (import.meta.env.DEV) console.error('[BasecampService] Failed to log history:', historyError);
        }
      }

      return data as PersonalBasecamp;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error upserting personal basecamp:', error);
      return null;
    }
  }

  /**
   * Delete user's personal basecamp
   * Logs deletion to history
   */
  async deletePersonalBasecamp(basecampId: string, options?: { skipHistory?: boolean }): Promise<boolean> {
    try {
      // Get basecamp before deletion for history
      const { data: basecamp, error: fetchError } = await (supabase as any)
        .from('trip_personal_basecamps')
        .select('*')
        .eq('id', basecampId)
        .single();

      if (fetchError) {
        if (import.meta.env.DEV) console.error('Failed to fetch personal basecamp for deletion:', fetchError);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .delete()
        .eq('id', basecampId);

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to delete personal basecamp:', error);
        return false;
      }

      // Log to history (if not skipped)
      if (!options?.skipHistory && basecamp) {
        try {
          // @ts-ignore - Edge function not in generated types yet
          await supabase.rpc('log_basecamp_change', {
            p_trip_id: basecamp.trip_id,
            p_user_id: user.id,
            p_basecamp_type: 'personal',
            p_action: 'deleted',
            p_previous_name: basecamp.name || null,
            p_previous_address: basecamp.address || null,
            p_previous_latitude: basecamp.latitude || null,
            p_previous_longitude: basecamp.longitude || null,
            p_new_name: null,
            p_new_address: null,
            p_new_latitude: null,
            p_new_longitude: null
          });
        } catch (historyError) {
          // Don't fail the operation if history logging fails
          if (import.meta.env.DEV) console.error('[BasecampService] Failed to log deletion history:', historyError);
        }
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting personal basecamp:', error);
      return false;
    }
  }

  /**
   * Get basecamp change history for a trip
   */
  async getBasecampHistory(
    tripId: string,
    options?: { basecampType?: 'trip' | 'personal'; limit?: number }
  ): Promise<BasecampChangeHistory[]> {
    try {
      // Table not in generated types yet - temporary until types regenerated
      let query = supabase
        .from('basecamp_change_history' as any)
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (options?.basecampType) {
        query = query.eq('basecamp_type', options.basecampType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        if (import.meta.env.DEV) console.error('Failed to get basecamp history:', error);
        return [];
      }

      return (data || []) as any as BasecampChangeHistory[];
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting basecamp history:', error);
      return [];
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

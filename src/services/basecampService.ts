import { supabase } from '../integrations/supabase/client';
import { BasecampLocation } from '../types/basecamp';
import { systemMessageService } from './systemMessageService';
import { cacheEntity, getCachedEntity } from '@/offline/cache';

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
  private readonly LOG_PREFIX = '[BasecampService]';

  /**
   * Get the trip basecamp (shared across all users)
   *
   * This function is the canonical source of truth for reading trip basecamps.
   * It fetches from the database and caches for offline access.
   */
  async getTripBasecamp(tripId: string): Promise<BasecampLocation | null> {
    try {
      // Offline-first: use cached basecamp when offline.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const cached = await getCachedEntity({ entityType: 'trip_basecamp', entityId: tripId });
        const cachedResult = (cached?.data as BasecampLocation | null | undefined) ?? null;
        return cachedResult;
      }

      const { data, error } = await supabase
        .from('trips')
        .select('basecamp_name, basecamp_address, basecamp_latitude, basecamp_longitude')
        .eq('id', tripId)
        .single();

      if (error) {
        console.error(this.LOG_PREFIX, 'getTripBasecamp: Database error', {
          tripId,
          error: error.message,
          code: error.code,
          details: error.details,
        });
        // Try to return cached value as fallback
        try {
          const cached = await getCachedEntity({ entityType: 'trip_basecamp', entityId: tripId });
          if (cached?.data) {
            return cached.data as BasecampLocation;
          }
        } catch {
          // ignore cache errors
        }
        return null;
      }

      if (!data) {
        console.warn(this.LOG_PREFIX, 'getTripBasecamp: No data returned for trip', { tripId });
        return null;
      }

      if (!data.basecamp_address) {
        return null;
      }

      const result: BasecampLocation = {
        address: data.basecamp_address,
        name: data.basecamp_name || undefined,
        type: 'other',
        coordinates:
          data.basecamp_latitude && data.basecamp_longitude
            ? { lat: data.basecamp_latitude, lng: data.basecamp_longitude }
            : undefined,
      };

      // Cache for offline access (best-effort).
      try {
        await cacheEntity({
          entityType: 'trip_basecamp',
          entityId: tripId,
          tripId,
          data: result,
        });
      } catch (cacheError) {
        console.warn(
          this.LOG_PREFIX,
          'getTripBasecamp: Failed to cache (non-critical)',
          cacheError,
        );
      }

      return result;
    } catch (error) {
      console.error(this.LOG_PREFIX, 'getTripBasecamp: Unexpected exception', {
        tripId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fallback to cached.
      try {
        const cached = await getCachedEntity({ entityType: 'trip_basecamp', entityId: tripId });
        if (cached?.data) {
          console.log(this.LOG_PREFIX, 'getTripBasecamp: Using cached fallback due to exception');
          return cached.data as BasecampLocation;
        }
      } catch {
        // ignore cache errors
      }
      return null;
    }
  }

  /**
   * Set the trip basecamp (shared across all users)
   * Only trip creator/admin can do this
   * Logs changes to history
   *
   * CRITICAL: This function now verifies the update was successful by reading back the data.
   */
  async setTripBasecamp(
    tripId: string,
    basecamp: { name?: string; address: string; latitude?: number; longitude?: number },
    options?: { skipHistory?: boolean; currentVersion?: number; previousAddress?: string },
  ): Promise<{
    success: boolean;
    error?: string;
    conflict?: boolean;
    coordinates?: { lat: number; lng: number };
  }> {
    console.log(this.LOG_PREFIX, 'setTripBasecamp called:', {
      tripId,
      newAddress: basecamp.address,
      newName: basecamp.name,
      hasCoordinates: !!(basecamp.latitude && basecamp.longitude),
      timestamp: new Date().toISOString(),
    });

    try {
      // First, verify the trip exists
      const { data: tripExists, error: tripCheckError } = await supabase
        .from('trips')
        .select('id, basecamp_version')
        .eq('id', tripId)
        .single();

      if (tripCheckError || !tripExists) {
        console.error(this.LOG_PREFIX, 'setTripBasecamp: Trip not found or access denied', {
          tripId,
          error: tripCheckError?.message,
          code: tripCheckError?.code,
        });
        return {
          success: false,
          error:
            tripCheckError?.code === 'PGRST116'
              ? 'Trip not found. It may have been deleted.'
              : 'Unable to access trip. Check your permissions.',
        };
      }

      // Get current version from the trip check (more reliable than separate call)
      const currentVersion = options?.currentVersion ?? tripExists.basecamp_version ?? 1;

      // No validation or geocoding - use provided coordinates (if any) or null
      const finalLatitude = basecamp.latitude || null;
      const finalLongitude = basecamp.longitude || null;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        console.error(this.LOG_PREFIX, 'setTripBasecamp: User not authenticated', { authError });
        return { success: false, error: 'User not authenticated' };
      }

      console.log(
        this.LOG_PREFIX,
        'setTripBasecamp: calling RPC update_trip_basecamp_with_version',
        {
          tripId,
          userId: user.id,
          currentVersion,
          address: basecamp.address,
        },
      );

      // Use versioned update RPC
      const { data, error } = (await supabase.rpc('update_trip_basecamp_with_version', {
        p_trip_id: tripId,
        p_current_version: currentVersion,
        p_name: basecamp.name || null,
        p_address: basecamp.address,
        p_latitude: finalLatitude || null,
        p_longitude: finalLongitude || null,
        p_user_id: user.id,
      })) as { data: any; error: any };

      if (error) {
        console.error(this.LOG_PREFIX, 'setTripBasecamp RPC error:', {
          tripId,
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return { success: false, error: error.message };
      }

      // Check for conflict
      if (data && typeof data === 'object' && data.conflict === true) {
        console.warn(this.LOG_PREFIX, 'setTripBasecamp: conflict detected', {
          tripId,
          currentVersion,
          serverVersion: data.current_version,
        });
        return {
          success: false,
          conflict: true,
          error: 'Basecamp was modified by another user. Please refresh and try again.',
        };
      }

      // CRITICAL FIX: Verify the update was actually persisted by reading back
      const { data: verifyData, error: verifyError } = await supabase
        .from('trips')
        .select('basecamp_address, basecamp_name, basecamp_version')
        .eq('id', tripId)
        .single();

      if (verifyError) {
        console.error(this.LOG_PREFIX, 'setTripBasecamp: Verification query failed', {
          tripId,
          error: verifyError.message,
        });
        // Don't fail - the RPC said success, this is just a verification issue
      } else if (verifyData?.basecamp_address !== basecamp.address) {
        console.error(this.LOG_PREFIX, 'setTripBasecamp: CRITICAL - Data mismatch after save!', {
          tripId,
          expected: basecamp.address,
          actual: verifyData?.basecamp_address,
          newVersion: verifyData?.basecamp_version,
        });
        // The RPC said success but the data doesn't match - this is a serious bug
        return {
          success: false,
          error: 'Save appeared successful but data was not persisted. Please try again.',
        };
      }

      console.log(this.LOG_PREFIX, 'setTripBasecamp SUCCESS (verified):', {
        tripId,
        newAddress: basecamp.address,
        newVersion: verifyData?.basecamp_version,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      // Create system message for consumer trips
      const userName = user?.email?.split('@')[0] || 'Someone';
      systemMessageService.tripBaseCampUpdated(
        tripId,
        userName,
        options?.previousAddress,
        basecamp.address,
      );

      return {
        success: true,
        coordinates:
          finalLatitude && finalLongitude ? { lat: finalLatitude, lng: finalLongitude } : undefined,
      };
    } catch (error) {
      console.error(this.LOG_PREFIX, 'setTripBasecamp exception:', {
        tripId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
   *
   * Personal basecamps are private to each user and not shared with trip members.
   */
  async getPersonalBasecamp(tripId: string, userId?: string): Promise<PersonalBasecamp | null> {
    console.log(this.LOG_PREFIX, 'getPersonalBasecamp called:', {
      tripId,
      userIdProvided: !!userId,
      timestamp: new Date().toISOString(),
    });

    try {
      let effectiveUserId = userId;

      if (!effectiveUserId) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          console.error(this.LOG_PREFIX, 'getPersonalBasecamp: Auth error', { error: authError });
          return null;
        }
        effectiveUserId = user?.id;
      }

      if (!effectiveUserId) {
        console.log(this.LOG_PREFIX, 'getPersonalBasecamp: No user ID available');
        return null;
      }

      const { data, error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error(this.LOG_PREFIX, 'getPersonalBasecamp: Database error', {
          tripId,
          userId: effectiveUserId,
          error: error.message,
          code: error.code,
        });
        return null;
      }

      if (!data) {
        console.log(this.LOG_PREFIX, 'getPersonalBasecamp: No personal basecamp found', {
          tripId,
          userId: effectiveUserId,
        });
        return null;
      }

      console.log(this.LOG_PREFIX, 'getPersonalBasecamp SUCCESS:', {
        tripId,
        userId: effectiveUserId,
        address: data.address,
        id: data.id,
      });

      return data as PersonalBasecamp;
    } catch (error) {
      console.error(this.LOG_PREFIX, 'getPersonalBasecamp: Unexpected exception', {
        tripId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set/update user's personal basecamp for a trip
   * Logs changes to history
   *
   * CRITICAL: This function now returns null ONLY for recoverable errors.
   * Unrecoverable errors are logged with detailed context for debugging.
   */
  async upsertPersonalBasecamp(
    payload: {
      trip_id: string;
      name?: string;
      address: string;
      latitude?: number;
      longitude?: number;
    },
    options?: { skipHistory?: boolean },
  ): Promise<PersonalBasecamp | null> {
    console.log(this.LOG_PREFIX, 'upsertPersonalBasecamp called:', {
      trip_id: payload.trip_id,
      address: payload.address,
      name: payload.name,
      timestamp: new Date().toISOString(),
    });

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(this.LOG_PREFIX, 'upsertPersonalBasecamp: Auth error', { error: authError });
        return null;
      }

      if (!user) {
        console.error(this.LOG_PREFIX, 'upsertPersonalBasecamp: User not authenticated');
        return null;
      }

      console.log(this.LOG_PREFIX, 'upsertPersonalBasecamp: User authenticated', {
        userId: user.id,
      });

      // Get current personal basecamp for history logging
      const currentBasecamp = await this.getPersonalBasecamp(payload.trip_id, user.id);
      const isUpdate = !!currentBasecamp;

      // Skip geocoding entirely - basecamps are text-only references
      // This prevents the save from hanging if Google Maps API doesn't respond
      const finalLatitude = payload.latitude || null;
      const finalLongitude = payload.longitude || null;

      console.log(this.LOG_PREFIX, 'upsertPersonalBasecamp: Executing upsert', {
        trip_id: payload.trip_id,
        user_id: user.id,
        isUpdate,
      });

      const { data, error } = await (supabase as any)
        .from('trip_personal_basecamps')
        .upsert(
          {
            trip_id: payload.trip_id,
            user_id: user.id,
            name: payload.name,
            address: payload.address,
            latitude: finalLatitude,
            longitude: finalLongitude,
          },
          {
            onConflict: 'trip_id,user_id',
          },
        )
        .select()
        .single();

      if (error) {
        console.error(this.LOG_PREFIX, 'upsertPersonalBasecamp: Database error', {
          trip_id: payload.trip_id,
          user_id: user.id,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return null;
      }

      if (!data) {
        console.error(this.LOG_PREFIX, 'upsertPersonalBasecamp: No data returned from upsert', {
          trip_id: payload.trip_id,
          user_id: user.id,
        });
        return null;
      }

      console.log(this.LOG_PREFIX, 'upsertPersonalBasecamp: SUCCESS', {
        trip_id: payload.trip_id,
        savedAddress: data.address,
        id: data.id,
      });

      // Log to history (if not skipped)
      if (!options?.skipHistory) {
        try {
          await (supabase as any).rpc('log_basecamp_change', {
            p_trip_id: payload.trip_id,
            p_user_id: user.id,
            p_scope: 'personal',
            p_action: isUpdate ? 'updated' : 'created',
            p_old_name: currentBasecamp?.name || null,
            p_old_address: currentBasecamp?.address || null,
            p_old_lat: currentBasecamp?.latitude || null,
            p_old_lng: currentBasecamp?.longitude || null,
            p_new_name: payload.name || null,
            p_new_address: payload.address,
            p_new_lat: finalLatitude || null,
            p_new_lng: finalLongitude || null,
          });
        } catch (historyError) {
          // Don't fail the operation if history logging fails
          console.warn(this.LOG_PREFIX, 'Failed to log history (non-critical):', historyError);
        }
      }

      // Create system message for consumer trips
      const userName = user?.email?.split('@')[0] || 'Someone';
      systemMessageService.personalBaseCampUpdated(payload.trip_id, userName, payload.address);

      return data as PersonalBasecamp;
    } catch (error) {
      console.error(this.LOG_PREFIX, 'upsertPersonalBasecamp: Unexpected exception', {
        trip_id: payload.trip_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  /**
   * Delete user's personal basecamp
   * Logs deletion to history
   */
  async deletePersonalBasecamp(
    basecampId: string,
    options?: { skipHistory?: boolean },
  ): Promise<boolean> {
    try {
      // Get basecamp before deletion for history
      const { data: basecamp, error: fetchError } = await (supabase as any)
        .from('trip_personal_basecamps')
        .select('*')
        .eq('id', basecampId)
        .single();

      if (fetchError) {
        if (import.meta.env.DEV)
          console.error('Failed to fetch personal basecamp for deletion:', fetchError);
        return false;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
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
          await (supabase as any).rpc('log_basecamp_change', {
            p_trip_id: basecamp.trip_id,
            p_user_id: user.id,
            p_scope: 'personal',
            p_action: 'deleted',
            p_old_name: basecamp.name || null,
            p_old_address: basecamp.address || null,
            p_old_lat: basecamp.latitude || null,
            p_old_lng: basecamp.longitude || null,
            p_new_name: null,
            p_new_address: null,
            p_new_lat: null,
            p_new_lng: null,
          });
        } catch (historyError) {
          // Don't fail the operation if history logging fails
          if (import.meta.env.DEV)
            console.error('[BasecampService] Failed to log deletion history:', historyError);
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
    options?: { basecampType?: 'trip' | 'personal'; limit?: number },
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
   * Geocode an address to get latitude/longitude coordinates
   * Uses Google Geocoding API via the browser's geolocation proxy
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    // Add 5-second timeout to prevent hanging
    const TIMEOUT_MS = 5000;

    try {
      if (typeof google === 'undefined' || !google.maps?.Geocoder) {
        console.warn('[BasecampService] Google Maps Geocoder not available');
        return null;
      }

      const geocoder = new google.maps.Geocoder();

      const geocodePromise = new Promise<{ lat: number; lng: number } | null>(resolve => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            resolve({ lat: location.lat(), lng: location.lng() });
          } else {
            console.warn('[BasecampService] Geocoding failed:', status);
            resolve(null);
          }
        });
      });

      const timeoutPromise = new Promise<null>(resolve =>
        setTimeout(() => {
          console.warn('[BasecampService] Geocoding timed out after', TIMEOUT_MS, 'ms');
          resolve(null);
        }, TIMEOUT_MS),
      );

      return await Promise.race([geocodePromise, timeoutPromise]);
    } catch (error) {
      console.error('[BasecampService] Geocoding error:', error);
      return null;
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
      coordinates:
        basecamp.latitude && basecamp.longitude
          ? { lat: basecamp.latitude, lng: basecamp.longitude }
          : undefined,
    };
  }
}

export const basecampService = new BasecampService();

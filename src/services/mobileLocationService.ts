import { supabase } from '../integrations/supabase/client';

export interface UserLocation {
  id: string;
  userId: string;
  tripId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  batteryLevel?: number;
  isMoving?: boolean;
  updatedAt: Date;
}

export interface LocationPermissionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class MobileLocationService {
  private static instance: MobileLocationService;
  private watchId: number | null = null;
  private isWatching = false;
  private currentTripId: string | null = null;

  private constructor() {}

  static getInstance(): MobileLocationService {
    if (!MobileLocationService.instance) {
      MobileLocationService.instance = new MobileLocationService();
    }
    return MobileLocationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      if (import.meta.env.DEV) {
        console.warn('Geolocation not supported');
      }
      return false;
    }

    try {
      // Test if we can get location
      const position = await this.getCurrentPosition();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Location permission denied:', error);
      }
      return false;
    }
  }

  async getCurrentPosition(options?: LocationPermissionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions);
    });
  }

  async startLocationSharing(tripId: string, userId: string): Promise<boolean> {
    if (this.isWatching) {
      await this.stopLocationSharing();
    }

    this.currentTripId = tripId;

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Get initial position
      const position = await this.getCurrentPosition();
      await this.updateUserLocation(userId, tripId, position);

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.updateUserLocation(userId, tripId, position);
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.error('Location watch error:', error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 30000
        }
      );

      this.isWatching = true;
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to start location sharing:', error);
      }
      return false;
    }
  }

  async stopLocationSharing(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
    this.currentTripId = null;
  }

  private async updateUserLocation(userId: string, tripId: string, position: GeolocationPosition): Promise<void> {
    try {
      const locationData = {
        user_id: userId,
        trip_id: tripId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        battery_level: await this.getBatteryLevel(),
        is_moving: await this.getMovementStatus(position)
      };

      // Use a generic table approach until migrations are applied
      const { error } = await (supabase as any)
        .from('user_locations')
        .upsert(locationData, {
          onConflict: 'user_id,trip_id'
        });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating location:', error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating user location:', error);
      }
    }
  }

  async getUserLocations(tripId: string): Promise<UserLocation[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_locations')
        .select(`
          *,
          profiles!user_locations_user_id_fkey(display_name, avatar_url)
        `)
        .eq('trip_id', tripId)
        .gte('updated_at', new Date(Date.now() - 1000 * 60 * 60).toISOString()); // Last hour

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching user locations:', error);
        }
        return [];
      }

      return data?.map((location: any) => ({
        id: location.id,
        userId: location.user_id,
        tripId: location.trip_id,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        heading: location.heading,
        batteryLevel: location.battery_level,
        isMoving: location.is_moving,
        updatedAt: new Date(location.updated_at)
      })) || [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching user locations:', error);
      }
      return [];
    }
  }

  async removeUserLocation(userId: string, tripId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('user_locations')
        .delete()
        .eq('user_id', userId)
        .eq('trip_id', tripId);

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error removing user location:', error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error removing user location:', error);
      }
    }
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      // @ts-ignore - Battery API is experimental
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch (error) {
      // Battery API not available - silent fail
    }
    return undefined;
  }

  private async getMovementStatus(position: GeolocationPosition): Promise<boolean> {
    // Simple movement detection based on speed
    if (position.coords.speed && position.coords.speed > 1) {
      return true;
    }
    return false;
  }

  isLocationSharingActive(): boolean {
    return this.isWatching;
  }

  getCurrentTripId(): string | null {
    return this.currentTripId;
  }
}

export const mobileLocationService = MobileLocationService.getInstance();
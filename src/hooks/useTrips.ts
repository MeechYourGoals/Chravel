import { useState, useEffect } from 'react';
import { tripService, Trip, CreateTripData } from '@/services/tripService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';

const TRIPS_CACHE_KEY = 'chravel_trips_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false); // Phase 1: Start optimistic
  const [initializing, setInitializing] = useState(true);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  // Phase 6: Load cached trips immediately
  useEffect(() => {
    const loadCachedTrips = () => {
      try {
        const cached = localStorage.getItem(TRIPS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_DURATION;
          if (!isExpired && Array.isArray(data)) {
            setTrips(data);
            setInitializing(false);
          }
        }
      } catch (error) {
        console.error('Error loading cached trips:', error);
      }
    };

    loadCachedTrips();
    loadTrips();
  }, [user]);

  const loadTrips = async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      setInitializing(false);
      return;
    }

    try {
      // Phase 3: Pass cached isDemoMode to avoid repeated checks
      const userTrips = await tripService.getUserTrips(isDemoMode);
      setTrips(userTrips);
      
      // Phase 6: Cache trips to localStorage
      try {
        localStorage.setItem(TRIPS_CACHE_KEY, JSON.stringify({
          data: userTrips,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching trips:', error);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  const createTrip = async (tripData: CreateTripData): Promise<Trip | null> => {
    // CRITICAL: Validate user authentication state
    if (!user || !user.id) {
      console.error('[useTrips] Cannot create trip: No authenticated user or missing user ID', { user });
      throw new Error('AUTHENTICATION_REQUIRED');
    }
    
    console.log('[useTrips] Creating trip with data:', tripData, 'User ID:', user.id);
    const newTrip = await tripService.createTrip(tripData);
    
    if (newTrip) {
      console.log('[useTrips] Trip created successfully:', newTrip);
      setTrips(prevTrips => [newTrip, ...prevTrips]);
    } else {
      console.error('[useTrips] Trip creation returned null');
    }
    return newTrip;
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>): Promise<boolean> => {
    const success = await tripService.updateTrip(tripId, updates);
    if (success) {
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === tripId ? { ...trip, ...updates } : trip
        )
      );
    }
    return success;
  };

  const archiveTrip = async (tripId: string): Promise<boolean> => {
    const success = await tripService.archiveTrip(tripId);
    if (success) {
      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));
    }
    return success;
  };

  return {
    trips,
    loading,
    initializing,
    createTrip,
    updateTrip,
    archiveTrip,
    refreshTrips: loadTrips
  };
};
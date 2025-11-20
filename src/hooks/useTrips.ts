import { useState, useEffect } from 'react';
import { tripService, Trip, CreateTripData } from '@/services/tripService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';

const TRIPS_CACHE_KEY = 'chravel_trips_cache';
const DEMO_TRIPS_CACHE_KEY = 'demo_chravel_trips_cache'; // PHASE 0A: Separate cache for demo mode
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false); // Phase 1: Start optimistic
  const [initializing, setInitializing] = useState(true);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  // Phase 6: Load cached trips immediately
  useEffect(() => {
    // 🎯 CRITICAL: Demo mode NEVER runs useEffect - complete isolation from Supabase
    // Demo mode uses mock data from tripsData, not real user trips
    if (isDemoMode) {
      setTrips([]);
      setLoading(false);
      setInitializing(false);
      return;
    }

    const loadCachedTrips = () => {
      try {
        // PHASE 0A: Use separate cache keys for demo vs real mode to prevent collisions
        const cacheKey = isDemoMode ? DEMO_TRIPS_CACHE_KEY : TRIPS_CACHE_KEY;
        const cached = localStorage.getItem(cacheKey);
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
  }, [user, isDemoMode]);

  const loadTrips = async () => {
    // 🎯 CRITICAL: Demo mode NEVER queries Supabase - it's completely independent
    if (isDemoMode) {
      setTrips([]);
      setLoading(false);
      setInitializing(false);
      return;
    }

    if (!user) {
      setTrips([]);
      setLoading(false);
      setInitializing(false);
      return;
    }

    try {
      // Only query Supabase when NOT in demo mode and user is authenticated
      const userTrips = await tripService.getUserTrips(false);
      setTrips(userTrips);
      
      // Phase 6: Cache trips to localStorage
      // PHASE 0A: Use separate cache keys for demo vs real mode
      try {
        const cacheKey = isDemoMode ? DEMO_TRIPS_CACHE_KEY : TRIPS_CACHE_KEY;
        localStorage.setItem(cacheKey, JSON.stringify({
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
    
    const newTrip = await tripService.createTrip(tripData);
    
    if (newTrip) {
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
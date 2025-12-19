import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { BasecampLocation } from '@/types/basecamp';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

interface BasecampContextType {
  /**
   * Legacy/global basecamp (historically stored under a single key).
   * Prefer trip-scoped basecamps via `useTripBasecamp(tripId)` for authenticated multi-trip usage.
   */
  basecamp: BasecampLocation | null;
  setBasecamp: (basecamp: BasecampLocation | null) => Promise<void>;
  isBasecampSet: boolean;
  clearBasecamp: () => void;
  isLoading: boolean;

  // Trip-scoped basecamps (keyed by trip id)
  getTripBasecamp: (tripId: string) => BasecampLocation | null;
  setTripBasecamp: (tripId: string, basecamp: BasecampLocation | null) => Promise<void>;
  clearTripBasecamp: (tripId: string) => void;
  loadTripBasecamp: (tripId: string) => Promise<void>;
  isTripBasecampSet: (tripId: string) => boolean;
  isTripBasecampLoading: (tripId: string) => boolean;
}

const BasecampContext = createContext<BasecampContextType | undefined>(undefined);

const BASECAMP_STORAGE_KEY = 'trip-basecamp';
const getTripStorageKey = (tripId: string) => `${BASECAMP_STORAGE_KEY}:${tripId}`;

export const BasecampProvider = ({ children }: { children: ReactNode }) => {
  const [basecamp, setBasecampState] = useState<BasecampLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Trip-scoped state: `undefined` means "not hydrated yet"
  const [tripBasecamps, setTripBasecamps] = useState<
    Record<string, BasecampLocation | null | undefined>
  >({});
  const [tripLoading, setTripLoading] = useState<Record<string, boolean>>({});

  // Load basecamp from platform storage on mount
  useEffect(() => {
    const loadBasecamp = async () => {
      try {
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
        const stored = await Promise.race([
          getStorageItem<BasecampLocation>(BASECAMP_STORAGE_KEY),
          timeout
        ]);
        if (stored) {
          setBasecampState(stored as BasecampLocation);
        }
      } catch (error) {
        console.warn('Failed to load basecamp from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBasecamp();
  }, []);

  // Save basecamp to platform storage whenever it changes
  const setBasecamp = useCallback(async (newBasecamp: BasecampLocation | null) => {
    setBasecampState(newBasecamp);
    
    try {
      if (newBasecamp) {
        await setStorageItem(BASECAMP_STORAGE_KEY, newBasecamp);
      } else {
        await removeStorageItem(BASECAMP_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save basecamp to storage:', error);
    }
  }, []);

  const clearBasecamp = useCallback(() => {
    void setBasecamp(null);
  }, [setBasecamp]);

  const loadTripBasecamp = useCallback(
    async (tripId: string) => {
      // Already hydrated
      if (tripBasecamps[tripId] !== undefined) return;

      setTripLoading(prev => ({ ...prev, [tripId]: true }));
      try {
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
        const stored = await Promise.race([
          getStorageItem<BasecampLocation>(getTripStorageKey(tripId)),
          timeout,
        ]);

        setTripBasecamps(prev => ({
          ...prev,
          [tripId]: stored ? (stored as BasecampLocation) : null,
        }));
      } catch (error) {
        console.warn('Failed to load trip basecamp from storage:', error);
        setTripBasecamps(prev => ({ ...prev, [tripId]: null }));
      } finally {
        setTripLoading(prev => ({ ...prev, [tripId]: false }));
      }
    },
    [tripBasecamps],
  );

  const setTripBasecamp = useCallback(async (tripId: string, newBasecamp: BasecampLocation | null) => {
    setTripBasecamps(prev => ({ ...prev, [tripId]: newBasecamp }));

    try {
      const storageKey = getTripStorageKey(tripId);
      if (newBasecamp) {
        await setStorageItem(storageKey, newBasecamp);
      } else {
        await removeStorageItem(storageKey);
      }
    } catch (error) {
      console.warn('Failed to save trip basecamp to storage:', error);
    }
  }, []);

  const clearTripBasecamp = useCallback(
    (tripId: string) => {
      void setTripBasecamp(tripId, null);
    },
    [setTripBasecamp],
  );

  const getTripBasecamp = useCallback(
    (tripId: string) => {
      const value = tripBasecamps[tripId];
      return value === undefined ? null : value;
    },
    [tripBasecamps],
  );

  const isTripBasecampSet = useCallback(
    (tripId: string) => !!getTripBasecamp(tripId),
    [getTripBasecamp],
  );

  const isTripBasecampLoading = useCallback(
    (tripId: string) => !!tripLoading[tripId],
    [tripLoading],
  );

  const isBasecampSet = !!basecamp;

  const value = useMemo<BasecampContextType>(() => {
    return {
      basecamp,
      setBasecamp,
      isBasecampSet,
      clearBasecamp,
      isLoading,
      getTripBasecamp,
      setTripBasecamp,
      clearTripBasecamp,
      loadTripBasecamp,
      isTripBasecampSet,
      isTripBasecampLoading,
    };
  }, [
    basecamp,
    setBasecamp,
    isBasecampSet,
    clearBasecamp,
    isLoading,
    getTripBasecamp,
    setTripBasecamp,
    clearTripBasecamp,
    loadTripBasecamp,
    isTripBasecampSet,
    isTripBasecampLoading,
  ]);

  return (
    <BasecampContext.Provider value={value}>
      {children}
    </BasecampContext.Provider>
  );
};

export const useBasecamp = () => {
  const context = useContext(BasecampContext);
  if (context === undefined) {
    throw new Error('useBasecamp must be used within a BasecampProvider');
  }
  return context;
};

export const useTripBasecamp = (tripId: string) => {
  const context = useBasecamp();

  useEffect(() => {
    if (!tripId) return;
    void context.loadTripBasecamp(tripId);
  }, [context, tripId]);

  const basecamp = context.getTripBasecamp(tripId);

  return {
    basecamp,
    setBasecamp: (newBasecamp: BasecampLocation | null) => context.setTripBasecamp(tripId, newBasecamp),
    clearBasecamp: () => context.clearTripBasecamp(tripId),
    isBasecampSet: context.isTripBasecampSet(tripId),
    isLoading: context.isTripBasecampLoading(tripId),
  };
};

// Helper hook for getting basecamp coordinates
export const useBasecampCoordinates = () => {
  const { basecamp } = useBasecamp();
  return basecamp?.coordinates || null;
};

// Helper hook for getting basecamp search center
export const useBasecampSearchCenter = () => {
  const { basecamp } = useBasecamp();
  
  if (basecamp?.coordinates) {
    return {
      lat: basecamp.coordinates.lat,
      lng: basecamp.coordinates.lng,
      address: basecamp.address
    };
  }
  
  return null;
};
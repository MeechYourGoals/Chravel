/**
 * BasecampContext - UI state container for current basecamp display
 *
 * IMPORTANT: This context is now a PURE UI STATE CONTAINER.
 * It does NOT persist to localStorage. The source of truth is:
 * - Database (for authenticated users) via useTripBasecamp hook
 * - In-memory session storage (for demo mode) via demoModeService
 *
 * This context exists for:
 * 1. Sharing basecamp state between components that don't have tripId
 * 2. Backward compatibility with existing component APIs
 * 3. Real-time sync updates (populated from useTripBasecamp)
 *
 * For new code, prefer using useTripBasecamp(tripId) directly.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BasecampLocation } from '@/types/basecamp';

interface BasecampContextType {
  basecamp: BasecampLocation | null;
  setBasecamp: (basecamp: BasecampLocation | null) => void;
  isBasecampSet: boolean;
  clearBasecamp: () => void;
  isLoading: boolean;
}

const BasecampContext = createContext<BasecampContextType | undefined>(undefined);

export const BasecampProvider = ({ children }: { children: ReactNode }) => {
  // Pure in-memory state - NO localStorage
  const [basecamp, setBasecampState] = useState<BasecampLocation | null>(null);

  // isLoading is always false now since we don't load from storage
  const isLoading = false;

  const setBasecamp = (newBasecamp: BasecampLocation | null) => {
    // Just update React state - no persistence
    // Persistence is handled by useTripBasecamp/useUpdateTripBasecamp
    setBasecampState(newBasecamp);
  };

  const clearBasecamp = () => {
    setBasecamp(null);
  };

  const isBasecampSet = !!basecamp;

  return (
    <BasecampContext.Provider
      value={{
        basecamp,
        setBasecamp,
        isBasecampSet,
        clearBasecamp,
        isLoading,
      }}
    >
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
      address: basecamp.address,
    };
  }

  return null;
};

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SwipeableRowContextValue {
  /** Currently open row ID */
  openRowId: string | null;
  /** Set the currently open row */
  setOpenRowId: (rowId: string | null) => void;
  /** Close all rows */
  closeAllRows: () => void;
}

const SwipeableRowContext = createContext<SwipeableRowContextValue | undefined>(undefined);

interface SwipeableRowProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for managing single-row-open behavior across swipeable lists.
 * Wrap your list with this provider to ensure only one row can be open at a time.
 */
export function SwipeableRowProvider({ children }: SwipeableRowProviderProps): JSX.Element {
  const [openRowId, setOpenRowIdState] = useState<string | null>(null);

  const setOpenRowId = useCallback((rowId: string | null) => {
    setOpenRowIdState(rowId);
  }, []);

  const closeAllRows = useCallback(() => {
    setOpenRowIdState(null);
  }, []);

  return (
    <SwipeableRowContext.Provider value={{ openRowId, setOpenRowId, closeAllRows }}>
      {children}
    </SwipeableRowContext.Provider>
  );
}

/**
 * Hook to access swipeable row context.
 * Returns null values if used outside of SwipeableRowProvider (graceful fallback).
 */
export function useSwipeableRowContext(): SwipeableRowContextValue {
  const context = useContext(SwipeableRowContext);

  // Return no-op fallback if not in provider (allows standalone usage)
  if (!context) {
    return {
      openRowId: null,
      setOpenRowId: () => {},
      closeAllRows: () => {},
    };
  }

  return context;
}

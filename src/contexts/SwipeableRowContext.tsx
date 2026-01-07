import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SwipeableRowContextValue {
  /** ID of the currently open row (null if none open) */
  openRowId: string | null;
  /** Register that a row is now open */
  setOpenRow: (id: string) => void;
  /** Close the currently open row */
  closeOpenRow: () => void;
  /** Check if a specific row should be forced closed */
  shouldForceClose: (id: string) => boolean;
}

const SwipeableRowContext = createContext<SwipeableRowContextValue | null>(null);

interface SwipeableRowProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for managing swipeable row state across a list.
 * Ensures only one row can be open at a time (iOS-style behavior).
 */
export const SwipeableRowProvider: React.FC<SwipeableRowProviderProps> = ({ children }) => {
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [previousOpenId, setPreviousOpenId] = useState<string | null>(null);

  const setOpenRow = useCallback(
    (id: string) => {
      // Store previous for force-close logic
      setPreviousOpenId(openRowId);
      setOpenRowId(id);
    },
    [openRowId],
  );

  const closeOpenRow = useCallback(() => {
    setPreviousOpenId(openRowId);
    setOpenRowId(null);
  }, [openRowId]);

  const shouldForceClose = useCallback(
    (id: string) => {
      // Force close if: this row was open, but now a different row is open
      return previousOpenId === id && openRowId !== id && openRowId !== null;
    },
    [previousOpenId, openRowId],
  );

  const value = useMemo(
    () => ({
      openRowId,
      setOpenRow,
      closeOpenRow,
      shouldForceClose,
    }),
    [openRowId, setOpenRow, closeOpenRow, shouldForceClose],
  );

  return <SwipeableRowContext.Provider value={value}>{children}</SwipeableRowContext.Provider>;
};

/**
 * Hook to access swipeable row context.
 * Must be used within SwipeableRowProvider.
 */
export const useSwipeableRowContext = (): SwipeableRowContextValue => {
  const context = useContext(SwipeableRowContext);

  if (!context) {
    // Return a no-op context if not within provider (graceful degradation)
    return {
      openRowId: null,
      setOpenRow: () => {},
      closeOpenRow: () => {},
      shouldForceClose: () => false,
    };
  }

  return context;
};

/**
 * Hook to check if context is available.
 */
export const useHasSwipeableRowContext = (): boolean => {
  const context = useContext(SwipeableRowContext);
  return context !== null;
};

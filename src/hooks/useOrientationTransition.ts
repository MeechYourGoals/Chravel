import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from './use-mobile';

/**
 * Hook to detect layout mode changes (mobile <-> desktop) and provide
 * animation state for smooth transitions during orientation changes.
 */
export function useOrientationTransition() {
  const isMobile = useIsMobile();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevIsMobile = useRef(isMobile);

  useEffect(() => {
    // Detect when layout mode changes
    if (prevIsMobile.current !== isMobile) {
      setIsTransitioning(true);
      prevIsMobile.current = isMobile;

      // Clear transition state after animation completes
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return { isMobile, isTransitioning };
}

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

interface ScrollState {
  scrollDirection: 'up' | 'down' | null;
  isAtTop: boolean;
}

interface UseScrollDirectionOptions {
  threshold?: number;
  containerRef?: RefObject<HTMLElement | null>;
}

export const useScrollDirection = (
  thresholdOrOptions: number | UseScrollDirectionOptions = 10,
): ScrollState => {
  // Handle both legacy number argument and new options object
  const options =
    typeof thresholdOrOptions === 'number' ? { threshold: thresholdOrOptions } : thresholdOrOptions;
  const { threshold = 10, containerRef } = options;

  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    // Get scroll position from container or window
    const scrollY = containerRef?.current ? containerRef.current.scrollTop : window.scrollY;

    // Check if at top
    setIsAtTop(scrollY <= 0);

    // Determine direction with threshold to prevent jitter
    const diff = scrollY - lastScrollY.current;

    if (Math.abs(diff) >= threshold) {
      const newDirection = diff > 0 ? 'down' : 'up';
      setScrollDirection(newDirection);
      lastScrollY.current = scrollY;
    }

    ticking.current = false;
  }, [threshold, containerRef]);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    // Determine scroll target (container element or window)
    const scrollTarget = containerRef?.current || window;
    const initialScrollY = containerRef?.current ? containerRef.current.scrollTop : window.scrollY;

    // Set initial state
    lastScrollY.current = initialScrollY;
    setIsAtTop(initialScrollY <= 0);

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
    };
  }, [updateScrollDirection, containerRef]);

  return { scrollDirection, isAtTop };
};

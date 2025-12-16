import { useState, useEffect, useRef, useCallback } from 'react';

interface ScrollState {
  scrollDirection: 'up' | 'down' | null;
  isAtTop: boolean;
}

export const useScrollDirection = (threshold: number = 10): ScrollState => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY;
    
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
  }, [threshold]);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    // Set initial state
    lastScrollY.current = window.scrollY;
    setIsAtTop(window.scrollY <= 0);

    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [updateScrollDirection]);

  return { scrollDirection, isAtTop };
};

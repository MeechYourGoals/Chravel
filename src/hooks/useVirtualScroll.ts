import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

export const useVirtualScroll = <T>(items: T[], options: VirtualScrollOptions) => {
  const { itemHeight, overscan = 3, containerHeight = window.innerHeight } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
    offsetTop: (startIndex + index) * itemHeight,
  }));

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    scrollTop,
  };
};

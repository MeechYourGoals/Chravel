import { useEffect, useRef, useState } from 'react';
import { hapticService } from '../services/hapticService';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
}

/**
 * Pull-to-refresh gesture hook.
 *
 * Gesture state lives in refs so the event listeners are registered once
 * and never torn down mid-gesture. React state is only used for the two
 * values the UI reads: `isRefreshing` and `pullDistance`.
 */
export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
}: PullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Refs for gesture tracking — read by stable event handlers
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref current without re-running the effect
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const distance = e.touches[0].clientY - startYRef.current;

      if (distance > 0) {
        e.preventDefault();
        const prevDistance = pullDistanceRef.current;
        const cappedDistance = Math.min(distance * 0.5, maxPullDistance);
        pullDistanceRef.current = cappedDistance;
        setPullDistance(cappedDistance);

        // Haptic feedback when crossing threshold
        if (cappedDistance >= threshold && prevDistance < threshold) {
          hapticService.medium();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;

      const distance = pullDistanceRef.current;
      isPullingRef.current = false;

      if (distance >= threshold) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        await hapticService.success();

        try {
          await onRefreshRef.current();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }
      }

      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, maxPullDistance]);

  return {
    isPulling: pullDistance > 0,
    isRefreshing,
    pullDistance,
    shouldTrigger: pullDistance >= threshold,
  };
};

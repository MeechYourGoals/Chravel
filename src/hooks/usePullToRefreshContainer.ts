import { useRef, useCallback, useState, useEffect } from 'react';
import { hapticService } from '../services/hapticService';

// Constants for native-feeling pull-to-refresh
const THRESHOLD = 80; // Distance needed to trigger refresh
const MAX_PULL_DISTANCE = 120; // Maximum pull distance
const RESISTANCE_FACTOR = 0.4; // Damping factor for rubber band effect
const VERTICAL_THRESHOLD = 10; // Min vertical movement to start pull

interface PullToRefreshContainerOptions {
  /** Async function called when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Pull distance threshold to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance with resistance (default: 120) */
  maxPullDistance?: number;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
}

interface PullToRefreshState {
  /** Whether user is actively pulling */
  isPulling: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Current pull distance (0 to maxPullDistance) */
  pullDistance: number;
  /** Progress from 0 to 1 (pullDistance / threshold) */
  progress: number;
  /** Whether threshold has been reached */
  shouldTrigger: boolean;
}

/**
 * Enhanced pull-to-refresh hook for container-based implementation.
 *
 * Features:
 * - Works with specific scroll containers (not document-level)
 * - iOS Safari/PWA compatible with proper overscroll handling
 * - Native-feeling damped pull animation
 * - Haptic feedback at threshold and completion
 * - Doesn't interfere with horizontal swipes
 */
export const usePullToRefreshContainer = ({
  onRefresh,
  threshold = THRESHOLD,
  maxPullDistance = MAX_PULL_DISTANCE,
  disabled = false,
}: PullToRefreshContainerOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isVerticalPullRef = useRef<boolean | null>(null);
  const hasTriggeredHapticRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
    shouldTrigger: false,
  });

  // Check if scroll container is at top
  const isAtTop = useCallback((): boolean => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  // Update pull distance with RAF for smooth animation
  const updatePullDistance = useCallback(
    (distance: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const progress = Math.min(distance / threshold, 1);
        const shouldTrigger = distance >= threshold;

        // Haptic feedback when crossing threshold
        if (shouldTrigger && !hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          hapticService.medium();
        }

        setState(prev => ({
          ...prev,
          pullDistance: distance,
          progress,
          shouldTrigger,
        }));
      });
    },
    [threshold],
  );

  // Handle touch/pointer start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || state.isRefreshing) return;
      if (!isAtTop()) return;

      startYRef.current = e.clientY;
      startXRef.current = e.clientX;
      currentYRef.current = e.clientY;
      isVerticalPullRef.current = null;
      hasTriggeredHapticRef.current = false;

      setState(prev => ({ ...prev, isPulling: true }));
    },
    [disabled, state.isRefreshing, isAtTop],
  );

  // Handle touch/pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!state.isPulling || state.isRefreshing || disabled) return;

      const currentY = e.clientY;
      const currentX = e.clientX;
      currentYRef.current = currentY;

      const deltaY = currentY - startYRef.current;
      const deltaX = Math.abs(currentX - startXRef.current);

      // Determine if this is a vertical pull (only check once)
      if (isVerticalPullRef.current === null) {
        if (deltaY > VERTICAL_THRESHOLD && deltaY > deltaX * 1.5) {
          isVerticalPullRef.current = true;
        } else if (deltaX > VERTICAL_THRESHOLD) {
          isVerticalPullRef.current = false;
        }
      }

      // Not a vertical pull - don't interfere
      if (isVerticalPullRef.current === false) return;

      // Only activate on downward pull when at top
      if (deltaY <= 0) {
        updatePullDistance(0);
        return;
      }

      // Prevent default scrolling during pull
      e.preventDefault();

      // Apply resistance for rubber band effect
      const resistedDistance = deltaY * RESISTANCE_FACTOR;
      const cappedDistance = Math.min(resistedDistance, maxPullDistance);

      updatePullDistance(cappedDistance);
    },
    [state.isPulling, state.isRefreshing, disabled, maxPullDistance, updatePullDistance],
  );

  // Handle touch/pointer end
  const handlePointerUp = useCallback(async () => {
    if (!state.isPulling) return;

    if (state.shouldTrigger && !disabled) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold, // Hold at threshold during refresh
        progress: 1,
      }));

      hapticService.success();

      try {
        await onRefresh();
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
          shouldTrigger: false,
        }));
      }
    } else {
      // Reset without refresh
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        progress: 0,
        shouldTrigger: false,
      }));
    }

    // Reset refs
    startYRef.current = 0;
    startXRef.current = 0;
    isVerticalPullRef.current = null;
  }, [state.isPulling, state.shouldTrigger, disabled, threshold, onRefresh]);

  // Handle pointer cancel
  const handlePointerCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPulling: false,
      pullDistance: 0,
      progress: 0,
      shouldTrigger: false,
    }));
    startYRef.current = 0;
    startXRef.current = 0;
    isVerticalPullRef.current = null;
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Get style for the pull indicator
  const getIndicatorStyle = useCallback((): React.CSSProperties => {
    const { pullDistance, isRefreshing, isPulling } = state;

    return {
      transform: `translateY(${pullDistance}px)`,
      opacity: Math.min(pullDistance / (threshold * 0.5), 1),
      transition: isPulling ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
    };
  }, [state, threshold]);

  // Get style for the content area
  const getContentStyle = useCallback((): React.CSSProperties => {
    const { pullDistance, isPulling, isRefreshing } = state;

    return {
      transform: `translateY(${pullDistance}px)`,
      transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      // Prevent iOS overscroll bounce while pulling
      overscrollBehavior: isPulling || isRefreshing ? 'none' : 'auto',
    };
  }, [state]);

  return {
    containerRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    state,
    getIndicatorStyle,
    getContentStyle,
    threshold,
  };
};

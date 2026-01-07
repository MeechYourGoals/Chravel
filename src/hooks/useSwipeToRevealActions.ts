import { useRef, useCallback, useState, useEffect } from 'react';
import { hapticService } from '../services/hapticService';

// Constants for iOS-style swipe behavior
const ACTION_WIDTH = 88; // Width of the delete button area
const SWIPE_THRESHOLD = 12; // Min horizontal movement to start considering as swipe
const DIRECTION_THRESHOLD = 1.5; // Horizontal must be 1.5x vertical to be a swipe
const RUBBER_BAND_FACTOR = 0.2; // Resistance beyond max reveal
const SNAP_THRESHOLD = 44; // Half of ACTION_WIDTH - threshold to snap open

interface SwipeToRevealActionsOptions {
  /** Width of the action area to reveal (default: 88px) */
  actionWidth?: number;
  /** Called when row is opened */
  onOpen?: () => void;
  /** Called when row is closed */
  onClose?: () => void;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** External control to close this row */
  forceClose?: boolean;
}

interface SwipeState {
  /** Whether currently tracking a swipe gesture */
  isDragging: boolean;
  /** Whether the row is in open (revealed) state */
  isOpen: boolean;
  /** Current translateX value (always <= 0 for left swipe) */
  translateX: number;
  /** Whether a swipe was detected (prevents click navigation) */
  didSwipe: boolean;
}

/**
 * iOS-style swipe-to-reveal-actions hook.
 *
 * Features:
 * - Swipe left to reveal action button (no direct delete on swipe)
 * - Rubber-band resistance beyond max reveal
 * - Only horizontal swipes activate (protects vertical scroll)
 * - Tap anywhere outside closes revealed row
 * - Prevents navigation when user swiped
 */
export const useSwipeToRevealActions = ({
  actionWidth = ACTION_WIDTH,
  onOpen,
  onClose,
  disabled = false,
  forceClose = false,
}: SwipeToRevealActionsOptions = {}) => {
  const startPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipeLockedRef = useRef(false); // True once we've determined this is/isn't a swipe
  const isHorizontalSwipeRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const translateXRef = useRef(0); // Ref for RAF updates
  const hasTriggeredHapticRef = useRef(false);

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isDragging: false,
    isOpen: false,
    translateX: 0,
    didSwipe: false,
  });

  // Handle external force close
  useEffect(() => {
    if (forceClose && swipeState.isOpen) {
      setSwipeState(prev => ({
        ...prev,
        isOpen: false,
        translateX: 0,
        isDragging: false,
      }));
      translateXRef.current = 0;
      onClose?.();
    }
  }, [forceClose, swipeState.isOpen, onClose]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const updateTranslateX = useCallback((value: number) => {
    translateXRef.current = value;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setSwipeState(prev => ({
        ...prev,
        translateX: value,
        isDragging: true,
        didSwipe: true,
      }));
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      // Reset state for new gesture
      startPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      currentPosRef.current = { x: e.clientX, y: e.clientY };
      isSwipeLockedRef.current = false;
      isHorizontalSwipeRef.current = false;
      hasTriggeredHapticRef.current = false;

      // Capture pointer for tracking moves outside element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || disabled) return;

      currentPosRef.current = { x: e.clientX, y: e.clientY };

      const deltaX = startPosRef.current.x - currentPosRef.current.x; // Positive = swipe left
      const deltaY = Math.abs(startPosRef.current.y - currentPosRef.current.y);

      // If we haven't locked direction yet, check if we should
      if (!isSwipeLockedRef.current) {
        // Need minimum movement to determine direction
        if (Math.abs(deltaX) > SWIPE_THRESHOLD || deltaY > SWIPE_THRESHOLD) {
          isSwipeLockedRef.current = true;
          // It's a horizontal swipe if: horizontal movement dominates
          isHorizontalSwipeRef.current =
            Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > deltaY * DIRECTION_THRESHOLD;
        }
      }

      // If this isn't a horizontal swipe, don't interfere with scrolling
      if (!isHorizontalSwipeRef.current) return;

      // Prevent scrolling during horizontal swipe
      e.preventDefault();

      // Calculate target position based on current state
      const basePosition = swipeState.isOpen ? -actionWidth : 0;
      let targetX = basePosition - deltaX;

      // Clamp and apply rubber band effect
      if (targetX > 0) {
        // Trying to swipe right past origin - apply rubber band
        targetX = targetX * RUBBER_BAND_FACTOR;
      } else if (targetX < -actionWidth) {
        // Past the action width - apply rubber band
        const overswipe = -actionWidth - targetX;
        targetX = -actionWidth - overswipe * RUBBER_BAND_FACTOR;
      }

      // Haptic feedback when crossing the snap threshold (opening)
      if (!hasTriggeredHapticRef.current && targetX <= -SNAP_THRESHOLD && !swipeState.isOpen) {
        hasTriggeredHapticRef.current = true;
        hapticService.light();
      }

      updateTranslateX(targetX);
    },
    [disabled, swipeState.isOpen, actionWidth, updateTranslateX],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || disabled) {
        return;
      }

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const deltaX = startPosRef.current.x - (currentPosRef.current?.x ?? startPosRef.current.x);
      const timeDelta = Date.now() - startPosRef.current.time;
      const velocity = deltaX / timeDelta; // px/ms

      // Determine final state based on position and velocity
      const currentX = translateXRef.current;
      let shouldOpen = false;

      if (isHorizontalSwipeRef.current) {
        // Fast swipe detection (velocity-based)
        if (Math.abs(velocity) > 0.5) {
          shouldOpen = velocity > 0; // Fast left swipe = open
        } else {
          // Position-based snap
          shouldOpen = currentX <= -SNAP_THRESHOLD;
        }
      } else {
        // No swipe detected - maintain current open state
        shouldOpen = swipeState.isOpen;
      }

      // Apply final state
      const finalX = shouldOpen ? -actionWidth : 0;
      translateXRef.current = finalX;

      // Haptic feedback for state change
      if (shouldOpen !== swipeState.isOpen) {
        hapticService.light();
        if (shouldOpen) {
          onOpen?.();
        } else {
          onClose?.();
        }
      }

      setSwipeState(prev => ({
        ...prev,
        isDragging: false,
        isOpen: shouldOpen,
        translateX: finalX,
        // Keep didSwipe true only if we actually swiped
        didSwipe: isHorizontalSwipeRef.current && Math.abs(deltaX) > SWIPE_THRESHOLD,
      }));

      // Reset refs
      startPosRef.current = null;
      currentPosRef.current = null;
    },
    [disabled, swipeState.isOpen, actionWidth, onOpen, onClose],
  );

  const handlePointerCancel = useCallback(() => {
    // Reset to current open state on cancel
    const finalX = swipeState.isOpen ? -actionWidth : 0;
    translateXRef.current = finalX;

    setSwipeState(prev => ({
      ...prev,
      isDragging: false,
      translateX: finalX,
      didSwipe: false,
    }));

    startPosRef.current = null;
    currentPosRef.current = null;
  }, [swipeState.isOpen, actionWidth]);

  /** Close the revealed row programmatically */
  const close = useCallback(() => {
    if (!swipeState.isOpen) return;

    translateXRef.current = 0;
    setSwipeState(prev => ({
      ...prev,
      isOpen: false,
      translateX: 0,
      isDragging: false,
      didSwipe: false,
    }));
    onClose?.();
  }, [swipeState.isOpen, onClose]);

  /** Reset the didSwipe flag (call after click handler) */
  const resetSwipeFlag = useCallback(() => {
    setSwipeState(prev => ({
      ...prev,
      didSwipe: false,
    }));
  }, []);

  /** Get style for the swipeable content */
  const getContentStyle = useCallback((): React.CSSProperties => {
    const { translateX, isDragging } = swipeState;

    return {
      transform: `translateX(${translateX}px)`,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      touchAction: 'pan-y', // Allow vertical scroll, capture horizontal
      willChange: isDragging ? 'transform' : 'auto',
    };
  }, [swipeState]);

  /** Get style for the action area (revealed behind content) */
  const getActionStyle = useCallback((): React.CSSProperties => {
    const { translateX, isDragging } = swipeState;
    // Scale action area based on reveal amount
    const revealPercent = Math.min(Math.abs(translateX) / actionWidth, 1);

    return {
      opacity: revealPercent,
      transform: `scale(${0.8 + revealPercent * 0.2})`,
      transition: isDragging ? 'none' : 'opacity 0.3s ease, transform 0.3s ease',
    };
  }, [swipeState, actionWidth]);

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    swipeState,
    close,
    resetSwipeFlag,
    getContentStyle,
    getActionStyle,
    actionWidth,
  };
};

import { useRef, useCallback, useState } from 'react';
import { hapticService } from '../services/hapticService';

interface SwipeToDeleteOptions {
  onDelete: () => void;
  threshold?: number;
}

interface SwipeState {
  isSwiping: boolean;
  swipeDistance: number;
  shouldShowDelete: boolean;
}

/**
 * Hook for handling swipe-to-delete gestures on mobile
 * Provides a smooth swipe interaction with haptic feedback
 */
export const useSwipeToDelete = ({ onDelete, threshold = 100 }: SwipeToDeleteOptions) => {
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    swipeDistance: 0,
    shouldShowDelete: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    currentPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPosRef.current) return;

    const touch = e.touches[0];
    currentPosRef.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = startPosRef.current.x - currentPosRef.current.x;
    const deltaY = Math.abs(startPosRef.current.y - currentPosRef.current.y);

    // Only consider horizontal swipes (left)
    if (deltaX > 10 && deltaY < 30) {
      setSwipeState({
        isSwiping: true,
        swipeDistance: Math.min(deltaX, threshold * 1.5),
        shouldShowDelete: deltaX > threshold / 2,
      });

      // Haptic feedback when crossing threshold
      if (deltaX > threshold && !swipeState.shouldShowDelete) {
        hapticService.medium();
      }
    }
  }, [threshold, swipeState.shouldShowDelete]);

  const handleTouchEnd = useCallback(() => {
    if (!startPosRef.current || !currentPosRef.current) {
      setSwipeState({ isSwiping: false, swipeDistance: 0, shouldShowDelete: false });
      return;
    }

    const deltaX = startPosRef.current.x - currentPosRef.current.x;

    // If swiped past threshold, trigger delete
    if (deltaX > threshold) {
      hapticService.heavy();
      onDelete();
    }

    // Reset state
    setSwipeState({ isSwiping: false, swipeDistance: 0, shouldShowDelete: false });
    startPosRef.current = null;
    currentPosRef.current = null;
  }, [threshold, onDelete]);

  const handleTouchCancel = useCallback(() => {
    setSwipeState({ isSwiping: false, swipeDistance: 0, shouldShowDelete: false });
    startPosRef.current = null;
    currentPosRef.current = null;
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    swipeState,
  };
};

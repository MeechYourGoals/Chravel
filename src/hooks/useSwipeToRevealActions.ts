import { useRef, useCallback, useState, useEffect } from 'react';
import { hapticService } from '../services/hapticService';

// Constants for gesture thresholds
const HORIZONTAL_THRESHOLD = 12; // Minimum px to activate horizontal swipe
const HORIZONTAL_RATIO = 1.5; // deltaX must be > deltaY * this ratio
const ACTION_WIDTH = 88; // Default width of action area
const RUBBER_BAND_FACTOR = 0.2; // Resistance factor beyond max
const SNAP_VELOCITY_THRESHOLD = 0.3; // px/ms to trigger snap open/close
const SNAP_POSITION_THRESHOLD = 0.5; // % of action width to snap open

interface UseSwipeToRevealActionsOptions {
  /** Callback when row opens */
  onOpen?: () => void;
  /** Callback when row closes */
  onClose?: () => void;
  /** Width of the action area in px (default: 88) */
  actionWidth?: number;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** External control for open state */
  isOpen?: boolean;
  /** Unique ID for this row (used for single-row-open behavior) */
  rowId?: string;
  /** Currently open row ID (for single-row-open behavior) */
  openRowId?: string | null;
}

interface SwipeToRevealState {
  /** Current horizontal offset */
  offsetX: number;
  /** Whether user is actively dragging */
  isDragging: boolean;
  /** Whether actions are fully revealed */
  isOpen: boolean;
  /** Whether a swipe gesture was detected (to prevent click) */
  didSwipe: boolean;
}

interface SwipeToRevealReturn {
  /** Event handlers to attach to the swipeable element */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  /** Current swipe state */
  state: SwipeToRevealState;
  /** Programmatically close the row */
  close: () => void;
  /** Programmatically open the row */
  open: () => void;
  /** Style to apply to the content for smooth animation */
  contentStyle: React.CSSProperties;
  /** Style to apply to the actions container */
  actionsStyle: React.CSSProperties;
  /** Call this before onClick to check if click should be prevented */
  shouldPreventClick: () => boolean;
}

/**
 * Hook for iOS-style swipe-to-reveal actions on mobile.
 *
 * Features:
 * - Only activates when horizontal movement dominates (preserves vertical scroll)
 * - Rubber-band resistance beyond max reveal
 * - Smooth animations with CSS transforms
 * - Haptic feedback on snap open
 * - Support for single-row-open behavior
 * - Click prevention after swipe gesture
 */
export function useSwipeToRevealActions({
  onOpen,
  onClose,
  actionWidth = ACTION_WIDTH,
  disabled = false,
  isOpen: externalIsOpen,
  rowId,
  openRowId,
}: UseSwipeToRevealActionsOptions = {}): SwipeToRevealReturn {
  // State
  const [state, setState] = useState<SwipeToRevealState>({
    offsetX: 0,
    isDragging: false,
    isOpen: false,
    didSwipe: false,
  });

  // Refs for tracking gesture
  const startPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastPos = useRef<{ x: number; time: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const wasOpen = useRef(false);
  const didSwipeRef = useRef(false);
  const animationFrame = useRef<number | null>(null);

  // Check reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  // Handle external open state changes
  useEffect(() => {
    if (externalIsOpen !== undefined && externalIsOpen !== state.isOpen) {
      setState(prev => ({
        ...prev,
        isOpen: externalIsOpen,
        offsetX: externalIsOpen ? -actionWidth : 0,
      }));
    }
  }, [externalIsOpen, actionWidth, state.isOpen]);

  // Close this row if another row opens (single-row-open behavior)
  useEffect(() => {
    if (openRowId !== undefined && rowId !== undefined && openRowId !== rowId && state.isOpen) {
      close();
    }
  }, [openRowId, rowId, state.isOpen, close]);

  // Clear animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      offsetX: 0,
      isOpen: false,
      isDragging: false,
    }));
    onClose?.();
  }, [onClose]);

  const open = useCallback(() => {
    setState(prev => ({
      ...prev,
      offsetX: -actionWidth,
      isOpen: true,
      isDragging: false,
    }));
    hapticService.light();
    onOpen?.();
  }, [actionWidth, onOpen]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      // Only handle primary button (touch or left click)
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // Capture pointer for tracking
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const now = Date.now();
      startPos.current = { x: e.clientX, y: e.clientY, time: now };
      lastPos.current = { x: e.clientX, time: now };
      isHorizontalSwipe.current = null;
      wasOpen.current = state.isOpen;
      didSwipeRef.current = false;

      setState(prev => ({ ...prev, didSwipe: false }));
    },
    [disabled, state.isOpen],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current || disabled) return;

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if this is a horizontal swipe (only once per gesture)
      if (isHorizontalSwipe.current === null) {
        // Need minimum movement to decide
        if (absDeltaX < HORIZONTAL_THRESHOLD && absDeltaY < HORIZONTAL_THRESHOLD) {
          return;
        }

        // Check if horizontal movement dominates
        isHorizontalSwipe.current =
          absDeltaX > HORIZONTAL_THRESHOLD && absDeltaX > absDeltaY * HORIZONTAL_RATIO;

        // If not horizontal, abort
        if (!isHorizontalSwipe.current) {
          startPos.current = null;
          return;
        }
      }

      // Horizontal swipe confirmed - prevent default to avoid scroll
      e.preventDefault();
      didSwipeRef.current = true;

      // Calculate new offset
      // If was open, start from -actionWidth
      const baseOffset = wasOpen.current ? -actionWidth : 0;
      let newOffset = baseOffset + deltaX;

      // Clamp: don't allow swiping right past resting position
      if (newOffset > 0) {
        newOffset = 0;
      }

      // Apply rubber-band resistance beyond action width
      if (newOffset < -actionWidth) {
        const extra = -actionWidth - newOffset;
        newOffset = -actionWidth - extra * RUBBER_BAND_FACTOR;
      }

      // Update position via requestAnimationFrame for smoothness
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      animationFrame.current = requestAnimationFrame(() => {
        setState(prev => ({
          ...prev,
          offsetX: newOffset,
          isDragging: true,
          didSwipe: true,
        }));
      });

      // Track for velocity calculation
      lastPos.current = { x: e.clientX, time: Date.now() };
    },
    [disabled, actionWidth],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current || disabled) {
        startPos.current = null;
        return;
      }

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      // If not a horizontal swipe, just reset
      if (!isHorizontalSwipe.current) {
        startPos.current = null;
        lastPos.current = null;
        return;
      }

      // Calculate velocity
      const now = Date.now();
      const timeDelta = lastPos.current ? now - lastPos.current.time : 1;
      const velocity = lastPos.current ? (e.clientX - lastPos.current.x) / timeDelta : 0;

      // Determine final state based on position and velocity
      const currentOffset = state.offsetX;
      const revealPercent = Math.abs(currentOffset) / actionWidth;

      let shouldOpen = false;

      // Fast swipe left = open, fast swipe right = close
      if (Math.abs(velocity) > SNAP_VELOCITY_THRESHOLD) {
        shouldOpen = velocity < 0;
      } else {
        // Otherwise based on position
        shouldOpen = revealPercent > SNAP_POSITION_THRESHOLD;
      }

      // Apply final state
      if (shouldOpen && !wasOpen.current) {
        open();
      } else if (!shouldOpen && wasOpen.current) {
        close();
      } else if (shouldOpen) {
        // Already was open, snap back to open position
        setState(prev => ({
          ...prev,
          offsetX: -actionWidth,
          isDragging: false,
          isOpen: true,
          didSwipe: didSwipeRef.current,
        }));
      } else {
        // Snap to closed
        setState(prev => ({
          ...prev,
          offsetX: 0,
          isDragging: false,
          isOpen: false,
          didSwipe: didSwipeRef.current,
        }));
      }

      // Reset refs
      startPos.current = null;
      lastPos.current = null;
      isHorizontalSwipe.current = null;
    },
    [disabled, state.offsetX, actionWidth, open, close],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      // Reset to last stable state
      setState(prev => ({
        ...prev,
        offsetX: wasOpen.current ? -actionWidth : 0,
        isDragging: false,
        didSwipe: didSwipeRef.current,
      }));

      startPos.current = null;
      lastPos.current = null;
      isHorizontalSwipe.current = null;
    },
    [actionWidth],
  );

  const shouldPreventClick = useCallback(() => {
    const result = didSwipeRef.current || state.didSwipe;
    // Reset after check
    didSwipeRef.current = false;
    return result;
  }, [state.didSwipe]);

  // Animation duration based on reduced motion preference
  const transitionDuration = prefersReducedMotion.current ? '0.1s' : '0.25s';

  const contentStyle: React.CSSProperties = {
    transform: `translateX(${state.offsetX}px)`,
    transition: state.isDragging
      ? 'none'
      : `transform ${transitionDuration} cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    willChange: state.isDragging ? 'transform' : 'auto',
    touchAction: 'pan-y', // Allow vertical scroll
  };

  const actionsStyle: React.CSSProperties = {
    width: actionWidth,
    opacity: Math.min(1, Math.abs(state.offsetX) / (actionWidth * 0.5)),
    transition: state.isDragging ? 'none' : `opacity ${transitionDuration} ease-out`,
  };

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    state,
    close,
    open,
    contentStyle,
    actionsStyle,
    shouldPreventClick,
  };
}

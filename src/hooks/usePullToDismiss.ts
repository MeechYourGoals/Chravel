import { useCallback, useRef, useState } from 'react';
import { PanInfo, useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { hapticService } from '../services/hapticService';

interface PullToDismissOptions {
  onDismiss: () => void;
  threshold?: number;        // Default: 150px
  velocityThreshold?: number; // Default: 500px/s
  resistance?: number;       // Default: 0.4 (for upward rubber-band)
}

interface PullToDismissReturn {
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
  handleDragStart: () => void;
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  isDragging: boolean;
  dragConstraints: { top: number; bottom?: number };
  dragElastic: { top: number; bottom: number };
}

/**
 * Hook for iOS-style pull-to-dismiss gesture
 * 
 * Usage:
 * ```tsx
 * const { y, opacity, scale, handleDragEnd, dragConstraints, dragElastic } = usePullToDismiss({
 *   onDismiss: () => setIsOpen(false),
 * });
 * 
 * <motion.div
 *   drag="y"
 *   dragConstraints={dragConstraints}
 *   dragElastic={dragElastic}
 *   onDragEnd={handleDragEnd}
 *   style={{ y, opacity, scale }}
 * >
 * ```
 */
export function usePullToDismiss({
  onDismiss,
  threshold = 150,
  velocityThreshold = 500,
  resistance = 0.4,
}: PullToDismissOptions): PullToDismissReturn {
  const [isDragging, setIsDragging] = useState(false);
  const hasTriggeredHaptic = useRef(false);

  // Motion values for smooth animations
  const y = useMotionValue(0);
  
  // Opacity decreases as user drags down
  const opacity = useTransform(y, [0, 300], [1, 0.5]);
  
  // Scale decreases slightly as user drags down
  const scale = useTransform(y, [0, 300], [1, 0.95]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    hasTriggeredHaptic.current = false;
    hapticService.light();
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      const { offset, velocity } = info;
      const shouldDismiss =
        offset.y > threshold || 
        (velocity.y > velocityThreshold && offset.y > 50);

      if (shouldDismiss) {
        hapticService.medium();
        onDismiss();
      } else {
        // Animate back to original position (handled by framer-motion)
        y.set(0);
      }
    },
    [threshold, velocityThreshold, onDismiss, y]
  );

  // Subscribe to y value changes for haptic feedback at threshold
  y.on('change', (latest) => {
    if (latest > threshold && !hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = true;
      hapticService.light();
    } else if (latest <= threshold) {
      hasTriggeredHaptic.current = false;
    }
  });

  return {
    y,
    opacity,
    scale,
    handleDragStart,
    handleDragEnd,
    isDragging,
    dragConstraints: { top: 0 },
    dragElastic: { top: resistance, bottom: 0.8 },
  };
}

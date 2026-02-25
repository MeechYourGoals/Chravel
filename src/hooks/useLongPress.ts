import { useRef, useCallback } from 'react';
import { hapticService } from '../services/hapticService';

interface LongPressOptions {
  onLongPress: () => void;
  threshold?: number;
}

export const useLongPress = ({ onLongPress, threshold = 500 }: LongPressOptions) => {
  const timerRef = useRef<number>();
  const startPosRef = useRef<{ x: number; y: number }>();

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const pos =
        'touches' in e
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };

      startPosRef.current = pos;

      timerRef.current = window.setTimeout(async () => {
        await hapticService.medium();
        onLongPress();
      }, threshold);
    },
    [onLongPress, threshold],
  );

  const cancel = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      // Check if finger moved significantly
      if (startPosRef.current) {
        const currentPos =
          'touches' in e
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

        const distance = Math.sqrt(
          Math.pow(currentPos.x - startPosRef.current.x, 2) +
            Math.pow(currentPos.y - startPosRef.current.y, 2),
        );

        if (distance > 10) {
          clearTimeout(timerRef.current);
        }
      }
    }
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: cancel,
    onTouchEnd: clear,
    onMouseDown: start,
    onMouseMove: cancel,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
};

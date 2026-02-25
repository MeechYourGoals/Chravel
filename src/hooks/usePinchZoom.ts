import { useRef, useEffect, useState } from 'react';

interface PinchZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export const usePinchZoom = (
  elementRef: React.RefObject<HTMLElement>,
  options: PinchZoomOptions = {},
) => {
  const { minZoom = 1, maxZoom = 4, onZoomChange } = options;
  const [zoom, setZoom] = useState(1);
  const initialDistance = useRef(0);
  const initialZoom = useRef(1);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance.current = getDistance(e.touches);
        initialZoom.current = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance.current;
        const newZoom = Math.min(Math.max(initialZoom.current * scale, minZoom), maxZoom);

        setZoom(newZoom);
        onZoomChange?.(newZoom);
      }
    };

    const handleTouchEnd = () => {
      initialDistance.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, zoom, minZoom, maxZoom, onZoomChange]);

  const resetZoom = () => {
    setZoom(1);
    onZoomChange?.(1);
  };

  return { zoom, resetZoom };
};

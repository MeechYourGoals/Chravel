import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

/**
 * iOS-aware orientation detection hook
 * Detects and tracks device orientation changes for responsive layout
 * @returns Current orientation ('portrait' | 'landscape')
 */
export const useOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    // Initial orientation check
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

      setOrientation(newOrientation);
    };

    // Listen to resize events (works on all devices)
    window.addEventListener('resize', handleOrientationChange);

    // Also listen to orientationchange event (iOS specific)
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial check
    handleOrientationChange();

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

import { useState, useEffect } from 'react';

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * iOS safe area inset detection hook
 * Returns safe area insets for iPhone X+ models with notch/Dynamic Island
 * @returns SafeAreaInsets object with top, right, bottom, left values in pixels
 */
export const useSafeArea = (): SafeAreaInsets => {
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const getSafeAreaInsets = () => {
      // Get computed style from root element
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      // Parse CSS env() values
      const top = parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0') || 0;
      const right = parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0') || 0;
      const bottom =
        parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0') || 0;
      const left = parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0') || 0;

      setSafeArea({ top, right, bottom, left });
    };

    // Set CSS variables from env()
    const updateCSSVariables = () => {
      document.documentElement.style.setProperty(
        '--safe-area-inset-top',
        'env(safe-area-inset-top, 0px)',
      );
      document.documentElement.style.setProperty(
        '--safe-area-inset-right',
        'env(safe-area-inset-right, 0px)',
      );
      document.documentElement.style.setProperty(
        '--safe-area-inset-bottom',
        'env(safe-area-inset-bottom, 0px)',
      );
      document.documentElement.style.setProperty(
        '--safe-area-inset-left',
        'env(safe-area-inset-left, 0px)',
      );
    };

    updateCSSVariables();
    getSafeAreaInsets();

    // Update on resize (orientation change may affect safe areas)
    window.addEventListener('resize', getSafeAreaInsets);

    return () => {
      window.removeEventListener('resize', getSafeAreaInsets);
    };
  }, []);

  return safeArea;
};

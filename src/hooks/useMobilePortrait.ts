import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile portrait orientation specifically
 *
 * Returns true ONLY when:
 * - Screen width ≤ 768px (mobile breakpoint)
 * - Portrait orientation (height > width)
 * - User agent indicates mobile device (iOS/Android)
 *
 * This ensures desktop/tablet landscape modes remain unchanged
 */
export function useMobilePortrait(): boolean {
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkMobilePortrait = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isNarrow = width <= 768;
      const isPortrait = height > width;

      // Check for mobile user agent (iOS Safari/WebKit or Android Chrome/WebView)
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      );

      setIsMobilePortrait(isNarrow && isPortrait && isMobileDevice);
    };

    // Initial check
    checkMobilePortrait();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkMobilePortrait);
    window.addEventListener('orientationchange', checkMobilePortrait);

    return () => {
      window.removeEventListener('resize', checkMobilePortrait);
      window.removeEventListener('orientationchange', checkMobilePortrait);
    };
  }, []);

  return isMobilePortrait;
}

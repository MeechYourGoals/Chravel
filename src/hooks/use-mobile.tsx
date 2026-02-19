import * as React from 'react';

// 1024px to include iPad in mobile view for PWA consistency
const MOBILE_BREAKPOINT = 1024;
const MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(MEDIA_QUERY).matches;
    }
    return true;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

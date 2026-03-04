/**
 * Onboarding Layout Hook
 *
 * Returns layout mode for onboarding screens:
 * - mobile: < 640px  (full-bleed, no phone frame)
 * - tablet: 640–1023px (phone frame centered)
 * - desktop: >= 1024px (two-column layout)
 */

import { useState, useEffect } from 'react';

export type OnboardingLayout = 'mobile' | 'tablet' | 'desktop';

export function useOnboardingLayout(): OnboardingLayout {
  const [layout, setLayout] = useState<OnboardingLayout>(() => getLayout());

  useEffect(() => {
    const onResize = () => setLayout(getLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return layout;
}

function getLayout(): OnboardingLayout {
  if (typeof window === 'undefined') return 'mobile';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

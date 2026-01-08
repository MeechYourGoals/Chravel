import React from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';

export const DemoModeBadge: React.FC = () => {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <span className="px-2 py-0.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px] uppercase tracking-wider font-semibold rounded-full">
      Demo
    </span>
  );
};

/**
 * Progress Dots for Onboarding Carousel
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingProgressDotsProps {
  totalScreens: number;
  currentScreen: number;
  onDotClick?: (index: number) => void;
}

export const OnboardingProgressDots = ({
  totalScreens,
  currentScreen,
  onDotClick,
}: OnboardingProgressDotsProps) => {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist">
      {Array.from({ length: totalScreens }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick?.(index)}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            index === currentScreen
              ? 'bg-primary w-6'
              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
          )}
          role="tab"
          aria-selected={index === currentScreen}
          aria-label={`Go to screen ${index + 1}`}
        />
      ))}
    </div>
  );
};

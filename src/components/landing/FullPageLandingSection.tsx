import React from 'react';
import { cn } from '@/lib/utils';
import { VideoBackground } from './VideoBackground';

interface FullPageLandingSectionProps {
  id: string;
  videoSrc?: string;
  imageFallback?: string;
  videoOpacity?: number;
  enableSnapScroll?: boolean;
  minHeight?: string;
  children: React.ReactNode;
  className?: string;
  imagePosition?: string;
  backgroundStyle?: 'image' | 'gradient';
  gradientColors?: [string, string];
}

export const FullPageLandingSection: React.FC<FullPageLandingSectionProps> = ({
  id,
  videoSrc,
  imageFallback,
  videoOpacity = 0.4,
  enableSnapScroll = true,
  minHeight = '100vh',
  children,
  className,
  imagePosition = 'center',
  backgroundStyle = 'image',
  gradientColors = ['#1a1a2e', '#16213e']
}) => {
  const useGradient = backgroundStyle === 'gradient' || (!videoSrc && !imageFallback);

  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex',
        // Mobile: content flows from top naturally. Desktop: vertically centered
        'items-start md:items-center justify-center',
        // Mobile: fill viewport so content starts at top. Desktop: use CSS variable for min-height
        'min-h-screen md:min-h-[var(--section-desktop-min-height,100vh)]',
        // Add top padding on mobile to account for header and safe areas
        'pt-20 md:pt-0',
        // Only enable snap scrolling on desktop
        enableSnapScroll && 'md:snap-start md:snap-always',
        className
      )}
      style={{
        ['--section-desktop-min-height' as string]: minHeight,
        ...(useGradient && {
          background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`
        })
      }}
    >
      {/* Background Video/Image - only render if not using gradient */}
      {!useGradient && (videoSrc || imageFallback) && (
        <VideoBackground
          videoSrc={videoSrc}
          imageFallback={imageFallback || ''}
          opacity={videoOpacity}
          imagePosition={imagePosition}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
};

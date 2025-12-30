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
  imagePosition = 'center'
}) => {
  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex',
        // Mobile: content flows from top naturally. Desktop: vertically centered
        'items-start md:items-center justify-center',
        // Mobile: auto height for natural flow. Desktop: use CSS variable for min-height
        'min-h-0 md:min-h-[var(--section-desktop-min-height,100vh)]',
        // Add top padding on mobile to account for header and safe areas
        'pt-20 md:pt-0',
        // Only enable snap scrolling on desktop
        enableSnapScroll && 'md:snap-start md:snap-always',
        className
      )}
      style={{
        ['--section-desktop-min-height' as string]: minHeight,
      }}
    >
      {/* Background Video/Image */}
      {(videoSrc || imageFallback) && (
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

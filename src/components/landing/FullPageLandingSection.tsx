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
}

export const FullPageLandingSection: React.FC<FullPageLandingSectionProps> = ({
  id,
  videoSrc,
  imageFallback,
  videoOpacity = 0.4,
  enableSnapScroll = true,
  minHeight = '100vh',
  children,
  className
}) => {
  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex items-center justify-center',
        enableSnapScroll && 'snap-start snap-always',
        className
      )}
      style={{ minHeight }}
    >
      {/* Background Video/Image */}
      {(videoSrc || imageFallback) && (
        <VideoBackground
          videoSrc={videoSrc}
          imageFallback={imageFallback || ''}
          opacity={videoOpacity}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
};

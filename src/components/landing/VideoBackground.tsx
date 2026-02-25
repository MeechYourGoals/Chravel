import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VideoBackgroundProps {
  videoSrc?: string;
  imageFallback: string;
  opacity?: number;
  className?: string;
  imagePosition?: string;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  videoSrc,
  imageFallback,
  opacity = 0.4,
  className,
  imagePosition = 'center',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [useVideo, setUseVideo] = useState(false);

  useEffect(() => {
    // Check if device should use video (desktop only)
    const shouldUseVideo =
      videoSrc &&
      window.innerWidth >= 768 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setUseVideo(!!shouldUseVideo);

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          setIsInView(entry.isIntersecting);

          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {
                // Fallback to image if video fails
                setUseVideo(false);
              });
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    const currentRef = videoRef.current?.parentElement;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [videoSrc]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {useVideo && videoSrc ? (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            onError={() => setUseVideo(false)}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80"
            style={{ opacity }}
          />
        </>
      ) : (
        <>
          <img
            src={imageFallback}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: imagePosition }}
            loading="lazy"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/85"
            style={{ opacity }}
          />
        </>
      )}
    </div>
  );
};

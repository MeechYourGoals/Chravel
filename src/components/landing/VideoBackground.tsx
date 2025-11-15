import React, { useState, useEffect, useRef } from 'react';
import { useMobilePortrait } from '../hooks/useMobilePortrait';

interface VideoBackgroundProps {
  src: string;
  imageFallback?: string;
  opacity?: number;
  className?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({
  src,
  imageFallback,
  opacity = 0.5,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobilePortrait = useMobilePortrait();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }, [isVisible]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {!isMobilePortrait ? (
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover"
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          style={{ opacity }}
        />
      ) : (
        imageFallback && (
          <img
            src={imageFallback}
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover"
            loading="lazy"
          />
        )
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20"
      ></div>
    </div>
  );
};

export default VideoBackground;

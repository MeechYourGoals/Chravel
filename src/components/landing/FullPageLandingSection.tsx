
import React, { useState, useEffect, useRef } from 'react';
import VideoBackground from './VideoBackground';

interface FullPageLandingSectionProps {
  id: string;
  videoSrc?: string;
  imageFallback?: string;
  videoOpacity?: number; // 0-1, for overlay darkness
  children: React.ReactNode;
  className?: string;
}

const FullPageLandingSection: React.FC<FullPageLandingSectionProps> = ({
  id,
  videoSrc,
  imageFallback,
  videoOpacity,
  children,
  className = '',
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        rootMargin: '0px',
        threshold: 0.3,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`full-page-section relative min-h-screen h-auto md:h-screen flex flex-col justify-center items-center text-white transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {videoSrc && (
        <VideoBackground
          src={videoSrc}
          imageFallback={imageFallback}
          opacity={videoOpacity}
        />
      )}
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center p-4 md:p-8">
        {children}
      </div>
    </section>
  );
};

export default FullPageLandingSection;

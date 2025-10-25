import { useState, useRef, useEffect } from 'react';

interface LazyMediaProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
}

export function LazyMedia({ src, type, alt = '', className = '' }: LazyMediaProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <div
        ref={ref}
        className={`bg-muted animate-pulse rounded-md h-[200px] w-full ${className}`}
      />
    );
  }

  return (
    <div ref={ref} className={className}>
      {!isLoaded && (
        <div className="bg-muted animate-pulse rounded-md h-[200px] w-full" />
      )}
      {type === 'video' ? (
        <video
          controls
          src={src}
          className={`rounded-lg max-w-full ${isLoaded ? 'block' : 'hidden'}`}
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={`rounded-lg max-w-full ${isLoaded ? 'block' : 'hidden'}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}

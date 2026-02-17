import React, { useState } from 'react';
import { getOptimizedImageUrl, generateBlurDataUrl } from '../../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
}

export const OptimizedImage = ({
  src,
  alt,
  width = 800,
  height,
  className = '',
  quality = 80,
  loading = 'lazy',
  onLoad,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  
  // Skip optimization for local assets (imported as ES modules)
  const isLocalAsset = src.startsWith('/') || src.startsWith('data:') || !src.includes('http');
  const [currentSrc, setCurrentSrc] = useState(() => 
    isLocalAsset ? src : getOptimizedImageUrl(src, width, quality)
  );
  const blurDataUrl = generateBlurDataUrl();

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (!triedFallback) {
      // Try the original unoptimized URL
      setTriedFallback(true);
      setCurrentSrc(src);
    } else {
      // Both optimized and original failed
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className={`${className} bg-transparent`} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blur placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-xl"
          style={{ backgroundImage: `url(${blurDataUrl})` }}
        />
      )}
      
      {/* Actual image */}
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          ${className}
          transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  );
};

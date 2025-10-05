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
  const blurDataUrl = generateBlurDataUrl();

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`${className} bg-white/10 flex items-center justify-center`}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
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
        src={getOptimizedImageUrl(src, width, quality)}
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

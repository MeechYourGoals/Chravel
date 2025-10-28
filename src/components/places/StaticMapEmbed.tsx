import React, { useState } from 'react';
import { GoogleMapsService } from '@/services/googleMapsService';

export interface StaticMapEmbedProps {
  address: string;
  coordinates?: { lat: number; lng: number };
  className?: string;
}

export const StaticMapEmbed: React.FC<StaticMapEmbedProps> = ({
  address,
  coordinates,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const embedUrl = GoogleMapsService.buildEmbeddableUrl(address, coordinates);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
          <p className="text-red-400 text-sm">Failed to load map</p>
        </div>
      )}
      
      <iframe
        src={embedUrl}
        className={`w-full h-full border-0 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="Location Map"
      />
    </div>
  );
};

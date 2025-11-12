
import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { useBasecamp } from '@/contexts/BasecampContext';

interface GoogleMapsEmbedProps {
  className?: string;
}

export const GoogleMapsEmbed = ({ className }: GoogleMapsEmbedProps) => {
  const { basecamp, isBasecampSet } = useBasecamp();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      let url: string;
      
      if (isBasecampSet && basecamp?.address) {
        // Initialize with Base Camp
        url = GoogleMapsService.buildEmbeddableUrl(basecamp.address, basecamp.coordinates);
      } else {
        // Default fallback - show world map centered on US
        url = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus';
      }

      setEmbedUrl(url);
    } catch (error) {
      console.error('[GoogleMapsEmbed] Error building URL:', error);
      // Ultimate fallback - simple embed without API key
      setEmbedUrl('https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus');
    }
    
    // Always stop loading after a short delay to ensure UI updates
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isBasecampSet, basecamp, retryCount]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = (e: any) => {
    console.error('[GoogleMapsEmbed] ❌ Iframe load error:', e);
    setIsLoading(false);
    setHasError(true);
  };
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-5 rounded-3xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-5 rounded-3xl">
          <div className="text-center p-6">
            <MapPin size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Map unavailable</h3>
            <p className="text-gray-500 text-sm mb-4">Unable to load Google Maps</p>
            <button 
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Google Maps Iframe - Always render */}
      <iframe
        key={`${embedUrl}-${retryCount}`}
        src={embedUrl || 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d25211418.31451683!2d-95.665!3d37.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus'}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allow="geolocation; camera; microphone"
        className="absolute inset-0 w-full h-full"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="Google Maps"
      />
    </div>
  );
};

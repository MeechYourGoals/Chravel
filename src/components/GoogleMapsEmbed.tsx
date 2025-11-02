
import React, { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { useBasecamp } from '@/contexts/BasecampContext';

interface GoogleMapsEmbedProps {
  className?: string;
}

export const GoogleMapsEmbed = ({ className }: GoogleMapsEmbedProps) => {
  const { basecamp, isBasecampSet } = useBasecamp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  
  useEffect(() => {
    setIsLoading(true);
    
    if (isBasecampSet && basecamp?.address) {
      // Initialize with Base Camp
      const url = GoogleMapsService.buildEmbeddableUrl(basecamp.address, basecamp.coordinates);
      setEmbedUrl(url);
    } else {
      // Default fallback
      const url = GoogleMapsService.buildEmbeddableUrl();
      setEmbedUrl(url);
    }
    
    setIsLoading(false);
  }, [isBasecampSet, basecamp]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const destination = searchQuery.trim();
    
    if (destination && isBasecampSet && basecamp?.address) {
      // Show directions from Base Camp to destination
      const url = GoogleMapsService.buildEmbeddableUrl(basecamp.address, basecamp.coordinates, destination);
      setEmbedUrl(url);
    } else if (destination) {
      // Search for destination without Base Camp
      const url = `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(destination)}`;
      setEmbedUrl(url);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Search Field - Centered and Compact */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-auto max-w-xs">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-48 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg text-xs"
          />
        </form>
      </div>

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
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                const url = GoogleMapsService.buildEmbeddableUrl();
                setEmbedUrl(url);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Google Maps Iframe */}
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
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
      )}
    </div>
  );
};

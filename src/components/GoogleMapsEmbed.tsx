
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { useBasecamp } from '@/contexts/BasecampContext';

interface GoogleMapsEmbedProps {
  className?: string;
}

export const GoogleMapsEmbed = ({ className }: GoogleMapsEmbedProps) => {
  const { basecamp, isBasecampSet } = useBasecamp();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDestination, setCurrentDestination] = useState('');
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

    if (destination) {
      // Show the destination location on the map (NOT directions in iframe - Google blocks that)
      const url = `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(destination)}`;
      setEmbedUrl(url);
      setCurrentDestination(destination);
    }
  };

  const handleOpenDirections = () => {
    if (!currentDestination) return;

    // Open directions in a new window/tab (this works, iframe embedding doesn't)
    if (isBasecampSet && basecamp?.address) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(basecamp.address)}&destination=${encodeURIComponent(currentDestination)}`;
      window.open(mapsUrl, '_blank');
    } else {
      // No basecamp, just open the destination
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentDestination)}`;
      window.open(mapsUrl, '_blank');
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
      {/* Search Field */}
      <div className="absolute top-4 left-4 right-4 z-10 space-y-2">
        <form onSubmit={handleSearch} className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations on map..."
            className="w-full bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg text-sm"
          />
        </form>

        {/* Directions Button - Show when destination is set and basecamp exists */}
        {currentDestination && isBasecampSet && (
          <button
            onClick={handleOpenDirections}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Navigation size={16} />
            Get Directions from Basecamp
          </button>
        )}
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
          className="absolute inset-0 w-full h-full"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

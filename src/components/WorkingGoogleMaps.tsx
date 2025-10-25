import React, { useState, useEffect } from 'react';
import { MapPin, Edit2 } from 'lucide-react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { useBasecamp } from '@/contexts/BasecampContext';
import { BasecampSelector } from './BasecampSelector';
import { BasecampLocation } from '@/types/basecamp';

interface WorkingGoogleMapsProps {
  className?: string;
}

export const WorkingGoogleMaps = ({ className = '' }: WorkingGoogleMapsProps) => {
  const { basecamp, isBasecampSet, setBasecamp } = useBasecamp();
  const [embedUrl, setEmbedUrl] = useState('');
  const [isBasecampSelectorOpen, setIsBasecampSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate embed URL based on Base Camp or geolocation
  useEffect(() => {
    setIsLoading(true);
    
    const setSrc = (url: string) => {
      setEmbedUrl(url);
      console.info('[WorkingGoogleMaps] Setting iframe src:', url);
    };

    if (isBasecampSet && basecamp?.address) {
      // Base Camp set: use it directly
      setSrc(GoogleMapsService.buildEmbeddableUrl(basecamp.address, basecamp.coordinates));
      setIsLoading(false);
      return;
    }

    // No Base Camp: try geolocation
    const timeout = setTimeout(() => {
      console.warn('[WorkingGoogleMaps] Geolocation timeout, using NYC fallback');
      setSrc(GoogleMapsService.buildEmbeddableUrl());
      setIsLoading(false);
    }, 4000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          const { latitude, longitude } = pos.coords;
          setSrc(GoogleMapsService.buildEmbeddableUrl(undefined, { lat: latitude, lng: longitude }));
          setIsLoading(false);
        },
        () => {
          clearTimeout(timeout);
          setSrc(GoogleMapsService.buildEmbeddableUrl());
          setIsLoading(false);
        },
        { maximumAge: 300000, timeout: 3500, enableHighAccuracy: false }
      );
    } else {
      clearTimeout(timeout);
      setSrc(GoogleMapsService.buildEmbeddableUrl());
      setIsLoading(false);
    }
  }, [basecamp, isBasecampSet]);

  const handleEditBasecamp = () => {
    setIsBasecampSelectorOpen(true);
  };

  const handleBasecampSet = (newBasecamp: BasecampLocation) => {
    setBasecamp(newBasecamp);
    setIsBasecampSelectorOpen(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative w-full h-full bg-background ${className}`}>
      {/* Floating Base Camp Button */}
      <button
        onClick={handleEditBasecamp}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg hover:bg-accent transition-colors text-sm font-medium"
      >
        {isBasecampSet ? (
          <>
            <MapPin size={16} className="text-primary" />
            <span className="text-foreground">{basecamp?.name || 'Base Camp'}</span>
            <Edit2 size={14} className="text-muted-foreground" />
          </>
        ) : (
          <>
            <MapPin size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Set Base Camp</span>
          </>
        )}
      </button>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-foreground font-medium">Loading map...</p>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Iframe - Stable Embed */}
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={handleIframeLoad}
        onError={() => {
          console.error('[WorkingGoogleMaps] Iframe error for URL:', embedUrl);
          
          // Try domain swap: maps.google.com → www.google.com
          if (embedUrl.includes('maps.google.com')) {
            const swapped = embedUrl.replace('maps.google.com', 'www.google.com');
            console.info('[WorkingGoogleMaps] Retrying with www.google.com:', swapped);
            setEmbedUrl(swapped);
          } else {
            // Final fallback: simple "near me" query
            const fallback = 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent('near me');
            console.info('[WorkingGoogleMaps] Applying fallback URL:', fallback);
            setEmbedUrl(fallback);
          }
        }}
        title="Google Maps"
        allow="geolocation"
      />

      {/* Basecamp Selector Modal */}
      <BasecampSelector
        isOpen={isBasecampSelectorOpen}
        onClose={() => setIsBasecampSelectorOpen(false)}
        onBasecampSet={handleBasecampSet}
        currentBasecamp={basecamp}
      />
    </div>
  );
};

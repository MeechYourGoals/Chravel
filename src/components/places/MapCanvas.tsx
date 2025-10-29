import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { BasecampLocation } from '@/types/basecamp';

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'trip-basecamp' | 'personal-basecamp' | 'pin' | 'place' | 'saved' | 'venue';
  icon?: string;
  visible?: boolean;
}

export interface MapCanvasProps {
  className?: string;
  activeContext: 'trip' | 'personal';
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: BasecampLocation | null;
  markers?: MapMarker[];
  onMapReady?: () => void;
}

export interface MapCanvasRef {
  centerOn: (latLng: { lat: number; lng: number }, zoom?: number) => void;
  fitBounds: (bounds: { north: number; south: number; east: number; west: number }) => void;
  highlight: (markerId: string) => void;
  getMap: () => HTMLIFrameElement | null;
}

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(
  (
    {
      className = '',
      activeContext,
      tripBasecamp,
      personalBasecamp,
      markers = [],
      onMapReady
    },
    ref
  ) => {
    const [embedUrl, setEmbedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      centerOn: (latLng: { lat: number; lng: number }, zoom = 15) => {
        // Update iframe src to center on new location
        const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, latLng);
        setEmbedUrl(newUrl);
      },
      fitBounds: (bounds: { north: number; south: number; east: number; west: number }) => {
        // Calculate center from bounds
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, {
          lat: centerLat,
          lng: centerLng
        });
        setEmbedUrl(newUrl);
      },
      highlight: (markerId: string) => {
        // Find marker and center on it
        const marker = markers.find(m => m.id === markerId);
        if (marker) {
          const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, marker.position);
          setEmbedUrl(newUrl);
        }
      },
      getMap: () => iframeRef.current
    }));

    // Generate embed URL based on active context and basecamps
    useEffect(() => {
      setIsLoading(true);

      // Determine which basecamp to use based on context
      let activeBasecamp: BasecampLocation | null = null;
      
      if (activeContext === 'trip') {
        activeBasecamp = tripBasecamp || null;
      } else if (activeContext === 'personal') {
        activeBasecamp = personalBasecamp || null;
      }

      console.log(`[MapCanvas] Context: ${activeContext}, Trip: ${tripBasecamp?.name || 'Not set'}, Personal: ${personalBasecamp?.name || 'Not set'}`);

      if (activeBasecamp?.address) {
        // Use active basecamp
        const url = GoogleMapsService.buildEmbeddableUrl(
          activeBasecamp.address,
          activeBasecamp.coordinates
        );
        setEmbedUrl(url);
        setIsLoading(false);
        return;
      }

      // Fallback: try geolocation
      const timeout = setTimeout(() => {
        console.warn('[MapCanvas] Geolocation timeout, using NYC fallback');
        setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
        setIsLoading(false);
      }, 4000);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            clearTimeout(timeout);
            const { latitude, longitude } = pos.coords;
            setEmbedUrl(
              GoogleMapsService.buildEmbeddableUrl(undefined, { lat: latitude, lng: longitude })
            );
            setIsLoading(false);
          },
          () => {
            clearTimeout(timeout);
            setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
            setIsLoading(false);
          },
          { maximumAge: 300000, timeout: 3500, enableHighAccuracy: false }
        );
      } else {
        clearTimeout(timeout);
        setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
        setIsLoading(false);
      }
    }, [activeContext, tripBasecamp, personalBasecamp]);

    const handleIframeLoad = () => {
      setIsLoading(false);
      onMapReady?.();
    };

    const handleIframeError = () => {
      console.error('[MapCanvas] Iframe error for URL:', embedUrl);

      // Try domain swap: maps.google.com → www.google.com
      if (embedUrl.includes('maps.google.com')) {
        const swapped = embedUrl.replace('maps.google.com', 'www.google.com');
        console.info('[MapCanvas] Retrying with www.google.com:', swapped);
        setEmbedUrl(swapped);
      } else {
        // Final fallback: simple "near me" query
        const fallback =
          'https://www.google.com/maps?output=embed&q=' + encodeURIComponent('near me');
        console.info('[MapCanvas] Applying fallback URL:', fallback);
        setEmbedUrl(fallback);
      }
    };

    return (
      <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl p-6 shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-white font-medium">Loading map...</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Maps Iframe */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Trip Map"
          allow="geolocation"
        />
      </div>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';

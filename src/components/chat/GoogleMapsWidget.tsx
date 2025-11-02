import React, { useEffect, useRef } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { getGoogleMapsApiKey } from '@/config/maps';

interface GoogleMapsWidgetProps {
  widgetToken: string;
  height?: number;
}

export const GoogleMapsWidget = ({ widgetToken, height = 300 }: GoogleMapsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Validate API key before attempting to load
    const apiKey = getGoogleMapsApiKey();
    
    if (!apiKey) {
      console.error('❌ Google Maps API key not available');
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full text-gray-400 text-sm">
            <div class="text-center">
              <p>🗺️ Google Maps configuration error</p>
              <p class="text-xs mt-1">API key not available</p>
            </div>
          </div>
        `;
      }
      return;
    }

    // Load Google Maps Extended Component Library
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=extended&loading=async`;
    script.async = true;
    
    const onScriptLoad = () => {
      if (containerRef.current && !containerRef.current.querySelector('gmp-place-contextual')) {
        try {
          const widget = document.createElement('gmp-place-contextual') as any;
          widget.setAttribute('context-token', widgetToken);
          widget.style.width = '100%';
          widget.style.height = `${height}px`;
          
          // Add error handler for widget
          widget.addEventListener('error', (e: any) => {
            console.error('Google Maps Widget error:', e);
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div class="flex items-center justify-center h-full text-gray-400 text-sm">
                  <div class="text-center">
                    <p>⚠️ Map temporarily unavailable</p>
                    <p class="text-xs mt-1">Retry in a moment</p>
                  </div>
                </div>
              `;
            }
          });
          
          containerRef.current.appendChild(widget);
          console.log('✅ Google Maps widget loaded successfully');
        } catch (error) {
          console.error('Failed to create Google Maps widget:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="flex items-center justify-center h-full text-gray-400 text-sm">
                <p>⚠️ Map loading failed</p>
              </div>
            `;
          }
        }
      }
    };

    script.onload = onScriptLoad;
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full text-gray-400 text-sm">
            <div class="text-center">
              <p>⚠️ Google Maps script blocked</p>
              <p class="text-xs mt-1">Check API key domain restrictions</p>
            </div>
          </div>
        `;
      }
    };
    
    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      onScriptLoad();
    } else {
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup: remove script if component unmounts and no other instances exist
      if (document.head.contains(script)) {
        const widgets = document.querySelectorAll('gmp-place-contextual');
        if (widgets.length <= 1) {
          document.head.removeChild(script);
        }
      }
    };
  }, [widgetToken, height]);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden my-3">
      <div className="bg-white/10 px-3 py-2 flex items-center gap-2 border-b border-white/10">
        <MapPin size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-white">Google Maps</span>
        <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
          <ExternalLink size={12} />
          Verified by Google
        </div>
      </div>
      <div ref={containerRef} style={{ height: `${height}px`, minHeight: '200px' }} />
    </div>
  );
};

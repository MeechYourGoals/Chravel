import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { getGoogleMapsApiKey } from '@/config/maps';

interface GoogleMapsWidgetProps {
  widgetToken: string;
  height?: number;
}

type ErrorState = 'configuration_error' | 'widget_error' | 'load_failed' | 'script_blocked' | null;

const ErrorDisplay = ({ type }: { type: ErrorState }) => {
  if (!type) return null;

  const errorMessages: Record<NonNullable<ErrorState>, { icon: string; title: string; subtitle?: string }> = {
    configuration_error: {
      icon: '🗺️',
      title: 'Google Maps configuration error',
      subtitle: 'API key not available'
    },
    widget_error: {
      icon: '⚠️',
      title: 'Map temporarily unavailable',
      subtitle: 'Retry in a moment'
    },
    load_failed: {
      icon: '⚠️',
      title: 'Map loading failed'
    },
    script_blocked: {
      icon: '⚠️',
      title: 'Google Maps script blocked',
      subtitle: 'Check API key domain restrictions'
    }
  };

  const { icon, title, subtitle } = errorMessages[type];

  return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      <div className="text-center">
        <p>{icon} {title}</p>
        {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export const GoogleMapsWidget = ({ widgetToken, height = 300 }: GoogleMapsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Reset state on mount/token change
    setErrorState(null);
    setIsLoaded(false);

    // Validate API key before attempting to load
    const apiKey = getGoogleMapsApiKey();
    
    if (!apiKey) {
      console.error('❌ Google Maps API key not available');
      setErrorState('configuration_error');
      return;
    }

    // Load Google Maps Extended Component Library
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=extended&loading=async`;
    script.async = true;
    
    const onScriptLoad = () => {
      if (containerRef.current && !containerRef.current.querySelector('gmp-place-contextual')) {
        try {
          const widget = document.createElement('gmp-place-contextual') as HTMLElement;
          widget.setAttribute('context-token', widgetToken);
          widget.style.width = '100%';
          widget.style.height = `${height}px`;
          
          // Add error handler for widget
          widget.addEventListener('error', (e: Event) => {
            console.error('Google Maps Widget error:', e);
            setErrorState('widget_error');
          });

          containerRef.current.appendChild(widget);
          setIsLoaded(true);
        } catch (error) {
          console.error('Failed to create Google Maps widget:', error);
          setErrorState('load_failed');
        }
      }
    };

    script.onload = onScriptLoad;
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      setErrorState('script_blocked');
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
      <div ref={containerRef} style={{ height: `${height}px`, minHeight: '200px' }}>
        {errorState && <ErrorDisplay type={errorState} />}
      </div>
    </div>
  );
};

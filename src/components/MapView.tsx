
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapPin, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Place {
  id: string;
  name: string;
  type: 'restaurant' | 'attraction' | 'hotel' | 'activity';
  position: [number, number];
  rating?: number;
  priceLevel?: number;
  description?: string;
  visitTime?: string;
  enrichedInfo?: string; // 🆕 AI-enriched description from grounding
  googleMapsUrl?: string; // 🆕 Google Maps URL
  verification?: 'verified_by_google' | 'unverified'; // 🆕 Verification status
}

interface MapViewProps {
  places: Place[];
  center?: [number, number];
  showRoute?: boolean;
}

export const MapView = ({ 
  places, 
  center = [48.8566, 2.3522], // Default to Paris
  showRoute = true 
}: MapViewProps) => {
  // Reserved for future place details panel
  const [_selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'restaurant': return '#ef4444';
      case 'attraction': return '#3b82f6';
      case 'hotel': return '#10b981';
      case 'activity': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const routePositions = places.map(place => place.position);

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-glass-orange/30 to-glass-yellow/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <MapPin size={24} className="text-glass-orange" />
        </div>
        <h2 className="text-xl font-semibold text-white">Trip Map</h2>
      </div>

      <div className="h-96 rounded-2xl overflow-hidden">
        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {places.map((place) => (
            <Marker
              key={place.id}
              position={place.position}
              eventHandlers={{
                click: () => setSelectedPlace(place)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900">{place.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{place.type}</p>
                  
                  {/* 🆕 Verification badge */}
                  {place.verification === 'verified_by_google' && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle size={12} className="text-green-600" />
                      <span className="text-[10px] text-green-600">Verified by Google Maps</span>
                    </div>
                  )}
                  
                  {place.rating && (
                    <p className="text-sm text-yellow-600 mt-1">★ {place.rating}</p>
                  )}
                  {place.visitTime && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock size={12} />
                      {place.visitTime}
                    </p>
                  )}
                  
                  {/* 🆕 Enriched info from grounding */}
                  {place.enrichedInfo && (
                    <p className="text-xs text-gray-700 mt-2 border-t pt-2">
                      {place.enrichedInfo.slice(0, 150)}...
                    </p>
                  )}
                  
                  {/* 🆕 Google Maps link */}
                  {place.googleMapsUrl && (
                    <a
                      href={place.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                    >
                      <ExternalLink size={10} />
                      View on Google Maps
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {showRoute && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#f59e0b',
                weight: 3,
                opacity: 0.8
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Place Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {['restaurant', 'attraction', 'hotel', 'activity'].map((type) => (
          <div key={type} className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getMarkerColor(type) }}
            />
            <span className="text-gray-300 text-sm capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

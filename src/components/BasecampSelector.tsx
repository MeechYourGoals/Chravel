import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Home, X } from 'lucide-react';
import { Button } from './ui/button';
import { BasecampLocation } from '../types/basecamp';
import { GoogleMapsService } from '../services/googleMapsService';
import { toast } from 'sonner';

interface BasecampSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  currentBasecamp?: BasecampLocation;
}

export const BasecampSelector = ({ isOpen, onClose, onBasecampSet, currentBasecamp }: BasecampSelectorProps) => {
  const [address, setAddress] = useState(currentBasecamp?.address || '');
  const [name, setName] = useState(currentBasecamp?.name || '');
  const [type, setType] = useState<'hotel' | 'short-term' | 'other'>(currentBasecamp?.type || 'hotel');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced address input with hybrid autocomplete strategy (Google Autocomplete + Text Search + OSM fallback)
  const handleAddressChange = async (value: string) => {
    setAddress(value);
    setSelectedSuggestionIndex(-1);
    setSelectedPlaceId(null);
    setSelectedCoords(null);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (value.length > 2) {
      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      
      // Phase C: Debounce autocomplete by 300ms
      debounceTimerRef.current = setTimeout(async () => {
        try {
          // Detect query type for smarter API selection
          const queryType = GoogleMapsService.detectQueryType(value);

          let foundSuggestions = false;
          
          // Phase B: Use New Google Places API directly (client-side) instead of proxy
          const { autocomplete, searchByText } = await import('@/services/googlePlacesNew');
          
          // Strategy 1: Try autocomplete first (fast, cheap) for non-venue queries
          if (queryType !== 'venue') {
            const sessionToken = `session-basecamp-${Date.now()}`;
            const predictions = await autocomplete(value, sessionToken, undefined);
            
            if (predictions && predictions.length > 0) {
              setSuggestions(predictions);
              foundSuggestions = true;
            }
          }

          // Strategy 2: If venue query OR autocomplete failed, try Text Search
          if (!foundSuggestions) {
            
            const searchOrigin = currentBasecamp?.coordinates 
              ? { lat: currentBasecamp.coordinates.lat, lng: currentBasecamp.coordinates.lng }
              : undefined;
            
            const textResults = await searchByText(value, searchOrigin);
            
            if (textResults && textResults.length > 0) {
              // Transform New API results to autocomplete format
              const textSuggestions = textResults.slice(0, 8).map((place: any) => ({
                place_id: place.id,
                description: place.formattedAddress || place.displayName?.text || '',
                name: place.displayName?.text || '',
                geometry: {
                  location: place.location
                },
                source: 'text-search-new',
                types: place.types || ['establishment'],
                structured_formatting: {
                  main_text: place.displayName?.text || '',
                  secondary_text: place.formattedAddress || ''
                }
              }));


              setSuggestions(textSuggestions);
              foundSuggestions = true;
            }
          }

          // No results found
          if (!foundSuggestions) {
            setSuggestions([]);
          }

        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[BasecampSelector] Autocomplete error:', error);
          }
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    setAddress(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Handle Text Search results (already have geometry)
    if (suggestion.source === 'text-search' && suggestion.geometry?.location) {
      setSelectedCoords({
        lat: suggestion.geometry.location.lat,
        lng: suggestion.geometry.location.lng
      });
      setSelectedPlaceId(suggestion.place_id); // Store for potential detail fetch
      if (suggestion.name && !name) {
        setName(suggestion.name);
      }
      return;
    }

    // Handle OSM suggestions
    if (suggestion.source === 'osm') {
      setSelectedCoords({ lat: suggestion.osm_lat, lng: suggestion.osm_lng });
      setSelectedPlaceId(null);
      return;
    }
    
    // Handle Google Autocomplete suggestions
    setSelectedPlaceId(suggestion.place_id);
    setSelectedCoords(null);
    
    try {
      const details = await GoogleMapsService.getPlaceDetails(suggestion.place_id);
      if (details?.result?.name && !name) {
        setName(details.result.name);
      }
      
      if (details?.result?.types && !type) {
        const placeTypes = details.result.types;
        if (placeTypes.includes('lodging') || placeTypes.includes('hotel')) {
          setType('hotel');
        } else if (placeTypes.includes('airport') || placeTypes.includes('point_of_interest')) {
          setType('other');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching place details:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      alert('Please enter a location.');
      return;
    }
    
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      let coordinates: { lat: number; lng: number } | null = null;
      let inferredName = name.trim();


      // Cascade 1: If we have coordinates from a selected suggestion (most reliable)
      if (selectedCoords) {
        coordinates = selectedCoords;
      }

      // Cascade 2: If we have a Google place_id from suggestion
      if (!coordinates && selectedPlaceId && !selectedPlaceId.startsWith('osm:')) {
        try {
          const placeDetails = await GoogleMapsService.getPlaceDetailsById(selectedPlaceId);
          if (placeDetails?.result?.geometry?.location) {
            coordinates = {
              lat: placeDetails.result.geometry.location.lat,
              lng: placeDetails.result.geometry.location.lng
            };
            if (!inferredName && placeDetails.result.name) {
              inferredName = placeDetails.result.name;
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Google Place Details failed:', error);
          }
        }
      }

      // 🆕 Cascade 3: Google Text Search (handles ALL natural language queries like Google Maps)
      // This is the key method that makes it work like Google Maps search
      // Per Google docs: https://developers.google.com/maps/documentation/places/web-service/text-search
      if (!coordinates) {
        try {
          const textSearchResult = await GoogleMapsService.searchPlacesByText(address, {
            // Location bias: If there's an existing basecamp, prioritize results near it
            ...(currentBasecamp?.coordinates && {
              location: `${currentBasecamp.coordinates.lat},${currentBasecamp.coordinates.lng}`
            })
          });

          if (textSearchResult?.results?.[0]?.geometry?.location) {
            const topResult = textSearchResult.results[0];
            coordinates = {
              lat: topResult.geometry.location.lat,
              lng: topResult.geometry.location.lng
            };
            if (!inferredName && topResult.name) {
              inferredName = topResult.name;
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Text Search failed:', error);
          }
        }
      }

      // Cascade 4: Try Google geocoding (for specific addresses)
      if (!coordinates) {
        try {
          coordinates = await GoogleMapsService.geocodeAddress(address);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Google Geocoding failed:', error);
          }
        }
      }
      
      // Allow setting basecamp even without coordinates (Google Maps will handle the query)
      // The embed URL builder can work with just an address string
      const basecamp: BasecampLocation = {
        address: address.trim(),
        coordinates: coordinates || undefined,
        name: inferredName || undefined,
        type
      };

      // Wait for basecamp to be saved before closing modal
      await Promise.resolve(onBasecampSet(basecamp));
      onClose();

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error setting basecamp:', error);
      }
      toast.error('Failed to set basecamp. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {currentBasecamp ? 'Update Basecamp' : 'Set Basecamp'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors border border-gray-700"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-white mb-2">
              Basecamp Address *
            </label>
            <div className="relative">
              <MapPin size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Save reference address (won't auto-center map)"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                autoComplete="off"
              />
              
              
              {/* Autocomplete Suggestions */}
              {(showSuggestions || isLoadingSuggestions) && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl mt-1 shadow-lg z-20 max-h-60 overflow-y-auto"
                >
                  {isLoadingSuggestions ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">
                      Loading suggestions...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => {
                      // Determine place type for visual indication
                      const types = suggestion.types || [];
                      const getPlaceTypeIcon = () => {
                        if (types.includes('lodging')) return { icon: '🏨', label: 'Hotel', color: 'bg-blue-100 text-blue-800' };
                        if (types.includes('tourist_attraction')) return { icon: '🎯', label: 'Attraction', color: 'bg-green-100 text-green-800' };
                        if (types.includes('stadium')) return { icon: '🏟️', label: 'Stadium', color: 'bg-purple-100 text-purple-800' };
                        if (types.includes('establishment')) return { icon: '📍', label: 'Place', color: 'bg-gray-100 text-gray-800' };
                        return null;
                      };
                      
                      const placeType = getPlaceTypeIcon();
                      
                      return (
                        <button
                          key={suggestion.place_id || index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors text-white text-sm flex items-center gap-3 ${
                            index === selectedSuggestionIndex ? 'bg-gray-700' : ''
                          }`}
                        >
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">
                                {suggestion.structured_formatting?.main_text || suggestion.description}
                              </span>
                              {placeType && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${placeType.color} flex-shrink-0`}>
                                  {placeType.icon} {placeType.label}
                                </span>
                              )}
                            </div>
                            {suggestion.structured_formatting?.secondary_text && (
                              <div className="text-xs text-gray-500 truncate">
                                {suggestion.structured_formatting.secondary_text}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Basecamp Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 'Grand Hotel Paris' or 'Downtown Airbnb'"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'hotel' | 'short-term' | 'other')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            >
              <option value="hotel">Hotel</option>
              <option value="short-term">Short-term rental</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-sm text-green-300">
              💡 <strong>Tip:</strong> Search works just like Google Maps - type landmarks ("Eiffel Tower"), venues ("SoFi Stadium Los Angeles"), addresses, or cities. Select from dropdown or press Enter.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-2 border-gray-700 hover:border-gray-600 font-semibold bg-gray-800 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 font-semibold shadow-lg shadow-green-500/25 border border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Setting...' : (currentBasecamp ? 'Update' : 'Set Basecamp')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
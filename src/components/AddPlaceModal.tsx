import React, { useState, useEffect } from 'react';
import { X, Link, Sparkles, CheckCircle, MapPin, Search, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { BasecampLocation, PlaceWithDistance } from '../types/basecamp';
import { usePlaceResolution } from '../hooks/usePlaceResolution';
import { detectInputType, normalizeUrl, formatPlaceQuery, extractPlaceComponents } from '../utils/smartInputDetector';

interface ResolvedPlace {
  name: string;
  formatted_address: string;
  address: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  price_level?: number;
  photos?: any[];
  types: string[];
  place_id: string;
  website?: string;
}

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceAdded?: (place: PlaceWithDistance) => void;
  basecamp?: BasecampLocation;
}

import { PlaceCategoryEnum, PlaceCategory } from '../types/basecamp';

const categoryDetails: { [key in PlaceCategory]: { icon: string; description: string } } = {
  'Appetite': { icon: '🍽️', description: 'Restaurants, bars, lounges, food trucks' },
  'Activity': { icon: '🎢', description: 'Hiking, jet skiing, beach, museums' },
  'Accommodation': { icon: '🏨', description: 'Hotels, rentals, hostels' },
  'Attraction': { icon: '🎯', description: 'Stadiums, music venues, famous landmarks' },
  'Other': { icon: '📍', description: 'Other points of interest' },
};

export const AddPlaceModal = ({ isOpen, onClose, onPlaceAdded, basecamp }: AddPlaceModalProps) => {
  const [smartInput, setSmartInput] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [calculateDistance, setCalculateDistance] = useState(!!basecamp);
  const [category, setCategory] = useState<string>('');
  const [useAiSorting, setUseAiSorting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<ResolvedPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<ResolvedPlace | null>(null);
  const [inputType, setInputType] = useState<'url' | 'place_name' | null>(null);
  
  const { resolvePlaceName, categorizePlaceType, isLoading: placeLoading } = usePlaceResolution();

  // Handle smart input changes and detection
  useEffect(() => {
    if (!smartInput.trim()) {
      setInputType(null);
      setSearchResults([]);
      setSelectedPlace(null);
      return;
    }

    const detection = detectInputType(smartInput);
    setInputType(detection.type);

    if (detection.type === 'place_name' && detection.isValid) {
      // Debounce place search
      const timeoutId = setTimeout(async () => {
        const query = formatPlaceQuery(smartInput);
        const result = await resolvePlaceName(query);
        
        if (result.success && result.place) {
          setSearchResults([result.place]);
          setSelectedPlace(result.place);
          
          // Auto-set place name if not already set - only set once to avoid loop
          if (!placeName && result.place.name !== placeName) {
            setPlaceName(result.place.name);
          }
          
          // Auto-categorize if enabled
          if (useAiSorting && result.place.types) {
            const autoCategory = categorizePlaceType(result.place.types);
            if (autoCategory !== category) {
              setCategory(autoCategory);
            }
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [smartInput, resolvePlaceName, categorizePlaceType, useAiSorting, category, placeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim() || !placeName.trim()) return;
    
    setIsLoading(true);
    try {
      let finalUrl = '';
      let finalCategory = category;
      
      // Determine final URL based on input type
      if (inputType === 'url') {
        finalUrl = normalizeUrl(smartInput);
      } else if (selectedPlace) {
        // Use Google Maps URL or website from selected place
        finalUrl = selectedPlace.website || `https://www.google.com/maps/place/?q=place_id:${selectedPlace.place_id}`;
      } else {
        // Fallback to Google search
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(smartInput)}`;
      }
      
      // Auto-categorize if not manually set
      if (!finalCategory) {
        if (selectedPlace && selectedPlace.types) {
          finalCategory = categorizePlaceType(selectedPlace.types);
        } else {
          finalCategory = 'attraction';
        }
      }

      const newPlace: PlaceWithDistance = {
        id: Date.now().toString(),
        name: placeName.trim(),
        url: finalUrl,
        category: finalCategory as any,
        calculatedAt: new Date().toISOString(),
        // Add place details if available
        ...(selectedPlace && {
          address: selectedPlace.formatted_address,
          rating: selectedPlace.rating,
          placeId: selectedPlace.place_id,
          website: selectedPlace.website,
          coordinates: selectedPlace.coordinates
        })
      };

      if (onPlaceAdded) {
        onPlaceAdded(newPlace);
      }
      
      // Show success state
      setShowSuccess(true);
      
      // Wait a moment then reset form and close modal
      setTimeout(() => {
        setSmartInput('');
        setPlaceName('');
        setCalculateDistance(!!basecamp);
        setCategory('');
        setUseAiSorting(true);
        setSearchResults([]);
        setSelectedPlace(null);
        setInputType(null);
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding place:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle size={48} className="text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Pin saved!</h3>
          <p className="text-slate-300">Added to your trip links and visible in Places &gt; Links tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Save Trip Pin</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Helper Text */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
            Enter a place name (e.g., "Starbucks Chicago IL") or URL to save it to your trip links.
          </div>

          {/* Smart Input Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Place or URL *
            </label>
            <div className="relative">
              {inputType === 'url' ? (
                <Globe size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              ) : (
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                placeholder="Target Chicago IL, https://target.com, or business name..."
                required
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {(placeLoading) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                </div>
              )}
            </div>
            
            {/* Input Type Indicator */}
            {inputType && (
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                {inputType === 'url' ? (
                  <>
                    <Globe size={12} />
                    Detected as URL
                  </>
                ) : (
                  <>
                    <MapPin size={12} />
                    Searching for places...
                  </>
                )}
              </div>
            )}
          </div>

          {/* Place Search Results */}
          {selectedPlace && inputType === 'place_name' && (
            <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-green-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm">{selectedPlace.name}</h4>
                  {selectedPlace.formatted_address && (
                    <p className="text-xs text-slate-400 mt-1">{selectedPlace.formatted_address}</p>
                  )}
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-yellow-400">★</span>
                      <span className="text-xs text-slate-300">{selectedPlace.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Place Name *
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Give this place a name..."
              required
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* AI Categorization Toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
            <input
              type="checkbox"
              id="ai-sorting"
              checked={useAiSorting}
              onChange={(e) => setUseAiSorting(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="ai-sorting" className="flex items-center gap-2 text-sm text-slate-300">
              <Sparkles size={16} className="text-blue-400" />
              Auto-categorize based on place type
            </label>
          </div>

          {/* Category Selection */}
          {!useAiSorting && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Category (optional)
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {PlaceCategoryEnum.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat === category ? '' : cat)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      category === cat
                        ? 'bg-blue-600/20 border-blue-600 text-white'
                        : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg">{categoryDetails[cat].icon}</span>
                    <div>
                      <div className="font-medium">{cat}</div>
                      <div className="text-xs text-slate-400">{categoryDetails[cat].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Distance Calculation Toggle */}
          {basecamp && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Calculate distance from Basecamp</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calculateDistance}
                    onChange={(e) => setCalculateDistance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <p className="text-xs text-green-300">
                See how far your options are from your base
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !smartInput.trim() || !placeName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Pin'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

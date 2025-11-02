
import React, { useState, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Button } from '../ui/button';
import { GoogleMapsService } from '../../services/googleMapsService';
import { useBasecamp } from '../../contexts/BasecampContext';

interface LocationSearchBarProps {
  onLocationSelect: (location: string) => void;
  currentLocation?: string;
  autoFromBasecamp?: boolean;
}

export const LocationSearchBar = ({ onLocationSelect, currentLocation, autoFromBasecamp = false }: LocationSearchBarProps) => {
  const [searchValue, setSearchValue] = useState(currentLocation || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { basecamp } = useBasecamp();

  useEffect(() => {
    if (autoFromBasecamp && basecamp && !currentLocation) {
      const city = extractCityFromAddress(basecamp.address);
      setSearchValue(city);
      onLocationSelect(city);
    }
  }, [autoFromBasecamp, basecamp, currentLocation, onLocationSelect]);

  const extractCityFromAddress = (address: string) => {
    const parts = address.split(',');
    return parts[parts.length - 2]?.trim() || address;
  };

  const handleSearch = async (value: string) => {
    setSearchValue(value);
    
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await GoogleMapsService.getPlaceAutocomplete(value);
      if (response.predictions) {
        setSuggestions(response.predictions.slice(0, 5));
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: string) => {
    setSearchValue(location);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  const handleClear = () => {
    setSearchValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect('');
  };

  return (
    <div className="relative w-full max-w-md mx-auto mb-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search city or location..."
          className="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(suggestion.description)}
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 border-b border-border/50 last:border-b-0"
            >
              <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </div>
                <div className="text-sm text-muted-foreground">
                  {suggestion.structured_formatting?.secondary_text}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Searching locations...</span>
          </div>
        </div>
      )}
    </div>
  );
};

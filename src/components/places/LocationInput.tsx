import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { GoogleMapsService } from '@/services/googleMapsService';

interface LocationData {
  address: string;
  coords?: { lat: number; lng: number };
}

interface QuickFillOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface LocationInputProps {
  label: string;
  value: string;
  onLocationSelect: (location: LocationData) => void;
  quickFillOptions?: QuickFillOption[];
  placeholder?: string;
  className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  value,
  onLocationSelect,
  quickFillOptions = [],
  placeholder = "Enter a location...",
  className = '',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete using Nominatim
  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await GoogleMapsService.autocompleteWithNominatim(q, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    debouncedSearch(newValue);
  };

  const handleSelect = (suggestion: any) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Use stored coordinates from Nominatim response
    onLocationSelect({
      address: suggestion.description,
      coords: suggestion._coords,
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect({ address: '' });
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`mb-3 ${className}`}>
      {/* Label and Quick Fill Options */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <label className="text-sm text-gray-300 font-medium">{label}</label>
        {quickFillOptions.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={option.onClick}
            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Input with Icon */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isSearching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MapPin size={16} />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-9 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors text-sm"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-start gap-2"
              >
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="line-clamp-2">{s.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

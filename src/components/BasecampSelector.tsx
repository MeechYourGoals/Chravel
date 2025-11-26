import React, { useState } from 'react';
import { MapPin, Home, X } from 'lucide-react';
import { Button } from './ui/button';
import { BasecampLocation } from '../types/basecamp';
import { toast } from 'sonner';
import { resolveQuery, generateSessionToken } from '@/services/googlePlacesNew';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast.error('Please enter an address.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Try to geocode the address to get coordinates
      const sessionToken = generateSessionToken();
      let coordinates: { lat: number; lng: number } | undefined;
      let formattedAddress = address.trim();
      let resolvedName = name.trim() || undefined;
      
      try {
        const geocoded = await resolveQuery(address.trim(), null, sessionToken);
        
        if (geocoded?.geometry?.location) {
          const loc = geocoded.geometry.location;
          // Handle both function and direct property access for lat/lng
          const latValue = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lngValue = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          
          if (typeof latValue === 'number' && typeof lngValue === 'number') {
            coordinates = { lat: latValue, lng: lngValue };
          }
          
          // Use formatted address from Google if available
          if (geocoded.formatted_address) {
            formattedAddress = geocoded.formatted_address;
          }
          
          // Use place name if no custom name provided
          if (!resolvedName && geocoded.name) {
            resolvedName = geocoded.name;
          }
        }
      } catch (geocodeError) {
        // Geocoding failed - that's okay, we'll save without coordinates
        console.warn('[BasecampSelector] Geocoding failed, saving address as-is:', geocodeError);
      }
      
      const basecamp: BasecampLocation = {
        address: formattedAddress,
        name: resolvedName,
        type,
        coordinates,
      };
      
      await Promise.resolve(onBasecampSet(basecamp));
      
      // Show appropriate success message
      if (coordinates) {
        toast.success('Basecamp saved with map location! 📍');
      } else {
        toast.info('Basecamp saved! (Location not mappable, but saved as reference)');
      }
      
      onClose();
    } catch (error) {
      toast.error('Failed to set basecamp. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter basecamp address"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
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
              <option value="short-term">Short-term Rental</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Basecamp'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

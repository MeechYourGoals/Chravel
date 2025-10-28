import React, { useState } from 'react';
import { Home, MapPin, Edit3, Clock, Navigation, Copy, Check, Share2 } from 'lucide-react';
import { BasecampSelector } from './BasecampSelector';
import { BasecampLocation } from '../types/basecamp';
import { useBasecamp } from '@/contexts/BasecampContext';
import { useToast } from '@/hooks/use-toast';

interface SetBasecampSquareProps {
  // Optional props for backward compatibility
  basecamp?: BasecampLocation;
  onBasecampSet?: (basecamp: BasecampLocation) => Promise<void> | void;
}

export const SetBasecampSquare = ({ basecamp: propBasecamp, onBasecampSet: propOnBasecampSet }: SetBasecampSquareProps) => {
  const { basecamp: contextBasecamp, setBasecamp: setContextBasecamp, isBasecampSet } = useBasecamp();
  const { toast } = useToast();
  
  // Use context basecamp if available, otherwise fall back to props
  const basecamp = contextBasecamp || propBasecamp;
  
  const handleBasecampSet = async (newBasecamp: BasecampLocation) => {
    // Always update context
    await setContextBasecamp(newBasecamp);
    // Also call prop callback if provided (for backward compatibility)
    if (propOnBasecampSet) {
      await Promise.resolve(propOnBasecampSet(newBasecamp));
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);

  const handleCopyAddress = async () => {
    if (!basecamp) return;
    try {
      await navigator.clipboard.writeText(basecamp.address);
      setIsCopying(true);
      toast({ title: 'Address copied to clipboard!' });
      setTimeout(() => setIsCopying(false), 2000);
    } catch (error) {
      toast({ title: 'Failed to copy address', variant: 'destructive' });
    }
  };

  const handleShareLocation = async () => {
    if (!basecamp) return;
    const text = `📍 ${basecamp.name || 'Our Basecamp'}\n${basecamp.address}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Trip Basecamp', text });
      } catch (error) {
        // User cancelled
      }
    } else {
      handleCopyAddress();
    }
  };

  const formatAddress = (address: string) => {
    const parts = address.split(',');
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[parts.length - 2]?.trim()}, ${parts[parts.length - 1]?.trim()}`;
    }
    return address;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl shadow-black/50 min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            basecamp 
              ? 'bg-gradient-to-r from-green-600 to-green-700' 
              : 'bg-gradient-to-r from-gray-600 to-gray-700'
          }`}>
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Set Basecamp</h3>
            <p className="text-gray-400 text-sm">
              {basecamp ? 'Basecamp configured' : 'Choose your home base'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Edit3 size={20} />
        </button>
      </div>

      {basecamp ? (
        /* Basecamp Details */
        <div className="flex-1 space-y-6">
          {/* Main Info Card */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Home size={16} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold">
                      {basecamp.name || 'Your Home Base'}
                    </h4>
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  </div>
                  <p className="text-green-300 text-sm leading-relaxed mb-2">
                    {formatAddress(basecamp.address)}
                  </p>
                  {showCoordinates && basecamp.coordinates && (
                    <p className="text-green-400/60 text-xs font-mono">
                      {basecamp.coordinates.lat.toFixed(6)}, {basecamp.coordinates.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className="text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                title="Copy address"
              >
                {isCopying ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <button
              onClick={() => setShowCoordinates(!showCoordinates)}
              className="text-xs text-green-400/60 hover:text-green-400 mt-2"
            >
              {showCoordinates ? 'Hide' : 'Show'} coordinates
            </button>
          </div>

          {/* Basecamp Features */}
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-blue-400" />
                <div>
                  <p className="text-white font-medium text-sm">Distance Calculations</p>
                  <p className="text-gray-400 text-xs">All places show distance from basecamp</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3">
                <Navigation size={16} className="text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">Route Planning</p>
                  <p className="text-gray-400 text-xs">Optimized routes from your base</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-orange-400" />
                <div>
                  <p className="text-white font-medium text-sm">Travel Time Estimates</p>
                  <p className="text-gray-400 text-xs">Plan your daily itinerary efficiently</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-all duration-200 border border-gray-700 hover:border-green-500/50 font-medium text-sm"
            >
              Update Basecamp Location
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyAddress}
                className="bg-gray-800/50 hover:bg-gray-800 text-gray-300 py-2 px-3 rounded-lg transition-colors border border-gray-700 text-xs flex items-center justify-center gap-2"
              >
                <Copy size={14} />
                Copy Address
              </button>
              <button
                onClick={handleShareLocation}
                className="bg-gray-800/50 hover:bg-gray-800 text-gray-300 py-2 px-3 rounded-lg transition-colors border border-gray-700 text-xs flex items-center justify-center gap-2"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  document.querySelector('.hero-map-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gray-800/50 hover:bg-gray-800 text-gray-300 py-2 px-3 rounded-lg transition-colors border border-gray-700 text-xs flex items-center justify-center gap-2"
              >
                <MapPin size={14} />
                View on Map
              </button>
              <button
                onClick={() => {
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(basecamp.address)}`;
                  window.open(mapsUrl, '_blank');
                }}
                className="bg-gray-800/50 hover:bg-gray-800 text-gray-300 py-2 px-3 rounded-lg transition-colors border border-gray-700 text-xs flex items-center justify-center gap-2"
              >
                <Navigation size={14} />
                Get Directions
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* No Basecamp Set */
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700 mb-6">
            <Home size={32} className="text-gray-400" />
          </div>
          
          <h4 className="text-xl font-bold text-white mb-3">Set Your Basecamp</h4>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
            Choose a central location for your trip. We'll calculate distances and travel times from this point to all your destinations.
          </p>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-xl shadow-green-500/25 font-semibold border border-green-500/50"
          >
            Choose Basecamp
          </button>
          
          <div className="mt-8 space-y-2 text-sm text-gray-500">
            <p>• Hotels, vacation rentals, or meeting spots work great</p>
            <p>• Used for distance calculations and route planning</p>
            <p>• Can be updated anytime during your trip</p>
          </div>
        </div>
      )}

        <BasecampSelector
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onBasecampSet={handleBasecampSet}
          currentBasecamp={basecamp}
        />
    </div>
  );
};
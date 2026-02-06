import React, { useState, useCallback } from 'react';
import { Route, Car, PersonStanding, Train, ArrowRightLeft, Loader2, Map } from 'lucide-react';
import { LocationInput } from './LocationInput';
import { GoogleMapsService } from '@/services/googleMapsService';
import { BasecampLocation } from '@/types/basecamp';
import { PersonalBasecamp } from '@/services/basecampService';
import { Button } from '@/components/ui/button';

interface LocationData {
  address: string;
  coords?: { lat: number; lng: number };
}

interface DistanceResult {
  distance: string;
  duration: string;
}

interface DistanceCalculatorProps {
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
  onShowRoute?: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => void;
}

type TravelMode = 'driving' | 'walking' | 'transit';

export const DistanceCalculator: React.FC<DistanceCalculatorProps> = ({
  tripBasecamp,
  personalBasecamp,
  onShowRoute,
}) => {
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
  const [toLocation, setToLocation] = useState<LocationData | null>(null);
  const [distanceResults, setDistanceResults] = useState<{
    driving?: DistanceResult;
    walking?: DistanceResult;
    transit?: DistanceResult;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TravelMode>('driving');
  const [error, setError] = useState<string | null>(null);

  // Quick-fill handlers
  const fillFromTripBasecamp = useCallback(() => {
    if (tripBasecamp) {
      setFromLocation({
        address: tripBasecamp.address,
        coords: tripBasecamp.coordinates,
      });
    }
  }, [tripBasecamp]);

  const fillToTripBasecamp = useCallback(() => {
    if (tripBasecamp) {
      setToLocation({
        address: tripBasecamp.address,
        coords: tripBasecamp.coordinates,
      });
    }
  }, [tripBasecamp]);

  const fillFromPersonalBasecamp = useCallback(() => {
    if (personalBasecamp?.latitude && personalBasecamp?.longitude) {
      setFromLocation({
        address: personalBasecamp.address || personalBasecamp.name || 'Personal Base Camp',
        coords: { lat: personalBasecamp.latitude, lng: personalBasecamp.longitude },
      });
    }
  }, [personalBasecamp]);

  const fillToPersonalBasecamp = useCallback(() => {
    if (personalBasecamp?.latitude && personalBasecamp?.longitude) {
      setToLocation({
        address: personalBasecamp.address || personalBasecamp.name || 'Personal Base Camp',
        coords: { lat: personalBasecamp.latitude, lng: personalBasecamp.longitude },
      });
    }
  }, [personalBasecamp]);

  // Swap locations
  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
    setDistanceResults(null);
  };

  // Parse distance result from API response
  const parseDistanceResult = (result: PromiseSettledResult<any>): DistanceResult | undefined => {
    if (result.status !== 'fulfilled') return undefined;
    
    const data = result.value;
    if (data?.status === 'OK' && data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance?.text || 'N/A',
        duration: element.duration?.text || 'N/A',
      };
    }
    return undefined;
  };

  // Calculate distance
  const calculateDistance = async () => {
    if (!fromLocation?.coords || !toLocation?.coords) {
      setError('Please enter both locations with valid coordinates');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setDistanceResults(null);

    try {
      const origin = `${fromLocation.coords.lat},${fromLocation.coords.lng}`;
      const dest = `${toLocation.coords.lat},${toLocation.coords.lng}`;

      // Fetch all three modes in parallel
      const [driving, walking, transit] = await Promise.allSettled([
        GoogleMapsService.getDistanceMatrix(origin, dest, 'DRIVING'),
        GoogleMapsService.getDistanceMatrix(origin, dest, 'WALKING'),
        GoogleMapsService.getDistanceMatrix(origin, dest, 'TRANSIT'),
      ]);

      const results = {
        driving: parseDistanceResult(driving),
        walking: parseDistanceResult(walking),
        transit: parseDistanceResult(transit),
      };

      // Check if we got at least one result
      if (!results.driving && !results.walking && !results.transit) {
        setError('Could not calculate distance. Please try different locations.');
      } else {
        setDistanceResults(results);
      }
    } catch (err) {
      console.error('Distance calculation error:', err);
      setError('Failed to calculate distance. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Build quick-fill options
  const fromQuickFillOptions = [
    tripBasecamp?.coordinates && { label: 'Trip Base Camp', onClick: fillFromTripBasecamp },
    personalBasecamp?.latitude && { label: 'Personal Base Camp', onClick: fillFromPersonalBasecamp },
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  const toQuickFillOptions = [
    tripBasecamp?.coordinates && { label: 'Trip Base Camp', onClick: fillToTripBasecamp },
    personalBasecamp?.latitude && { label: 'Personal Base Camp', onClick: fillToPersonalBasecamp },
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  const modeIcons: Record<TravelMode, React.ReactNode> = {
    driving: <Car size={16} />,
    walking: <PersonStanding size={16} />,
    transit: <Train size={16} />,
  };

  const canCalculate = fromLocation?.address && toLocation?.address;

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-white/10">
      {/* Header */}
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Route size={18} className="text-primary" />
        Distance Calculator
      </h3>

      {/* Location Inputs */}
      <div className="space-y-1">
        <LocationInput
          label="From"
          value={fromLocation?.address || ''}
          onLocationSelect={setFromLocation}
          quickFillOptions={fromQuickFillOptions}
          placeholder="Enter starting location..."
        />

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={swapLocations}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-gray-400 hover:text-white"
            title="Swap locations"
          >
            <ArrowRightLeft size={14} className="rotate-90" />
          </button>
        </div>

        <LocationInput
          label="To"
          value={toLocation?.address || ''}
          onLocationSelect={setToLocation}
          quickFillOptions={toQuickFillOptions}
          placeholder="Enter destination..."
        />
      </div>

      {/* Calculate Button */}
      <Button
        onClick={calculateDistance}
        disabled={!canCalculate || isCalculating}
        className="w-full mt-4"
        size="sm"
      >
        {isCalculating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Route size={16} />
            Calculate Distance
          </>
        )}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {distanceResults && (
        <div className="mt-4 space-y-3">
          {/* Mode Selector */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {(['driving', 'walking', 'transit'] as TravelMode[]).map(mode => {
              const result = distanceResults[mode];
              const isAvailable = !!result;
              
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => isAvailable && setSelectedMode(mode)}
                  disabled={!isAvailable}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    selectedMode === mode
                      ? 'bg-primary text-white shadow-lg'
                      : isAvailable
                        ? 'text-gray-300 hover:bg-white/10'
                        : 'text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {modeIcons[mode]}
                  <span className="capitalize">{mode}</span>
                </button>
              );
            })}
          </div>

          {/* Distance/Duration Display */}
          {distanceResults[selectedMode] && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {distanceResults[selectedMode]?.distance}
                    </div>
                    <div className="text-xs text-gray-400">Distance</div>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {distanceResults[selectedMode]?.duration}
                    </div>
                    <div className="text-xs text-gray-400">Travel Time</div>
                  </div>
                </div>

                {/* Show on Map Button */}
                {onShowRoute && fromLocation?.coords && toLocation?.coords && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowRoute(fromLocation.coords!, toLocation.coords!)}
                    className="ml-4"
                  >
                    <Map size={14} />
                    Show Route
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

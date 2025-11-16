import React, { useState, useEffect } from 'react';
import { MapPin, User, Lock, Plus, Edit, Trash2, Navigation } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { BasecampSelector } from '../BasecampSelector';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBasecamp } from '@/contexts/BasecampContext';
import { toast } from 'sonner';

export interface BasecampsPanelProps {
  tripId: string;
  tripBasecamp: BasecampLocation | null;
  onTripBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  onCenterMap: (coords: { lat: number; lng: number }, type: 'trip' | 'personal') => void;
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
  personalBasecamp?: PersonalBasecamp | null;
  onPersonalBasecampUpdate?: (basecamp: PersonalBasecamp | null) => void;
}

export const BasecampsPanel: React.FC<BasecampsPanelProps> = ({
  tripId,
  tripBasecamp,
  onTripBasecampSet,
  onCenterMap,
  activeContext,
  onContextChange,
  personalBasecamp: externalPersonalBasecamp,
  onPersonalBasecampUpdate
}) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { clearBasecamp } = useBasecamp();
  const [internalPersonalBasecamp, setInternalPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use external state if provided, otherwise use internal state
  const personalBasecamp = externalPersonalBasecamp !== undefined ? externalPersonalBasecamp : internalPersonalBasecamp;
  const setPersonalBasecamp = onPersonalBasecampUpdate || setInternalPersonalBasecamp;

  // Generate a consistent demo user ID for the session
  const getDemoUserId = () => {
    let demoId = sessionStorage.getItem('demo-user-id');
    if (!demoId) {
      demoId = `demo-user-${Date.now()}`;
      sessionStorage.setItem('demo-user-id', demoId);
    }
    return demoId;
  };

  const effectiveUserId = user?.id || getDemoUserId();

  // Load personal basecamp (only if not provided externally)
  useEffect(() => {
    // Skip loading if external state is being used
    if (externalPersonalBasecamp !== undefined) {
      setLoading(false);
      return;
    }

    const loadPersonalBasecamp = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(tripId, effectiveUserId);
          setInternalPersonalBasecamp(sessionBasecamp);
        } else if (user) {
          const dbBasecamp = await basecampService.getPersonalBasecamp(tripId, user.id);
          setInternalPersonalBasecamp(dbBasecamp);
        } else {
          setInternalPersonalBasecamp(null);
        }
      } catch (error) {
        console.error('Failed to load personal basecamp:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalBasecamp();
  }, [tripId, user, isDemoMode, effectiveUserId, externalPersonalBasecamp]);

  const handleTripBasecampSet = async (newBasecamp: BasecampLocation) => {
    await onTripBasecampSet(newBasecamp);
    setShowTripSelector(false);
  };

  const handleTripBasecampDelete = () => {
    if (!tripBasecamp) return;
    // Clear the trip basecamp using the context
    clearBasecamp();
  };

  const handlePersonalBasecampSet = async (location: BasecampLocation) => {
    try {
      
      // 🆕 Validate coordinates before proceeding
      if (!location.coordinates?.lat || !location.coordinates?.lng) {
        console.error('[BasecampsPanel] ❌ Invalid coordinates for personal basecamp:', location.coordinates);
        toast.error('Unable to set location - invalid coordinates');
        return;
      }
      
      // Validate coordinate ranges
      if (location.coordinates.lat < -90 || location.coordinates.lat > 90 || 
          location.coordinates.lng < -180 || location.coordinates.lng > 180) {
        console.error('[BasecampsPanel] ❌ Coordinates out of range:', location.coordinates);
        toast.error('Invalid location coordinates');
        return;
      }
      
      
      if (isDemoMode) {
        const sessionBasecamp = demoModeService.setSessionPersonalBasecamp({
          trip_id: tripId,
          user_id: effectiveUserId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates.lat,
          longitude: location.coordinates.lng
        });
        setPersonalBasecamp(sessionBasecamp);
        
        // 🆕 Center map FIRST, then switch context
        onCenterMap(location.coordinates, 'personal');
        onContextChange('personal');
      } else if (user) {
        const dbBasecamp = await basecampService.upsertPersonalBasecamp({
          trip_id: tripId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates.lat,
          longitude: location.coordinates.lng
        });
        setPersonalBasecamp(dbBasecamp);
        
        // 🆕 Center map FIRST, then switch context
        onCenterMap(location.coordinates, 'personal');
        onContextChange('personal');
      }
      setShowPersonalSelector(false);
    } catch (error) {
      console.error('[BasecampsPanel] ❌ Failed to set personal basecamp:', error);
      toast.error('Failed to set personal base camp');
    }
  };

  const handlePersonalBasecampDelete = async () => {
    if (!personalBasecamp) return;

    try {
      if (isDemoMode) {
        demoModeService.deleteSessionPersonalBasecamp(tripId, effectiveUserId);
        setPersonalBasecamp(null);
      } else if (user) {
        const success = await basecampService.deletePersonalBasecamp(personalBasecamp.id);
        if (success) {
          setPersonalBasecamp(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete personal basecamp:', error);
    }
  };

  const toBasecampLocation = (pb: PersonalBasecamp): BasecampLocation => ({
    address: pb.address || '',
    name: pb.name,
    type: 'other',
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined
  });

  const handleCenterOnTrip = () => {
    if (tripBasecamp?.coordinates) {
      onCenterMap(tripBasecamp.coordinates, 'trip');
    }
  };

  const handleCenterOnPersonal = () => {
    if (personalBasecamp?.latitude && personalBasecamp?.longitude) {
      onCenterMap({ lat: personalBasecamp.latitude, lng: personalBasecamp.longitude }, 'personal');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mobile-safe-scroll">
        {/* Trip Base Camp Card - Compact 75% Height */}
        <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden flex flex-col min-h-[100px] max-h-[120px]">
        <div className="p-3 flex flex-col flex-1 justify-center">
            {tripBasecamp ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MapPin size={16} className="text-sky-400" />
                  <h3 className="text-white font-semibold text-base">Trip Base Camp</h3>
                </div>

                {/* Clickable basecamp info section - Compact with hover animation */}
                <button
                  onClick={handleCenterOnTrip}
                  disabled={!tripBasecamp.coordinates}
                  className={`bg-gray-800/50 rounded-xl p-2 border mb-2 text-left transition-all duration-300 ease-out cursor-pointer group disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] hover:shadow-lg ${
                    activeContext === 'trip'
                      ? 'border-sky-500/40 ring-2 ring-sky-500/30 shadow-sky-500/10'
                      : 'border-gray-700 hover:bg-gray-800/70 hover:border-sky-500/20'
                  }`}
                  title="Click to center map on this basecamp"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-sky-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      {tripBasecamp.name && (
                        <p className="text-white font-medium text-xs mb-0.5">{tripBasecamp.name}</p>
                      )}
                      <p className="text-gray-400 text-xs break-words">{tripBasecamp.address}</p>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MapPin size={16} className="text-sky-400" />
                  <h3 className="text-white font-semibold text-base">Trip Base Camp</h3>
                </div>
                <p className="text-gray-400 text-xs text-center mb-2">
                  No basecamp set. Set one so the group can align meetups & recs.
                </p>
                <button
                  onClick={() => setShowTripSelector(true)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Plus size={12} />
                  Set Trip Base Camp
                </button>
              </>
            )}
          </div>
        </div>

      {/* Personal Base Camp Card - Compact 75% Height */}
      <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden flex flex-col min-h-[100px] max-h-[120px]">
        <div className="p-3 flex flex-col flex-1 justify-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-800 rounded mb-3"></div>
                <div className="h-16 bg-gray-800 rounded"></div>
              </div>
            ) : personalBasecamp ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User size={16} className="text-emerald-400" />
                  <h3 className="text-white font-semibold text-base">Personal Base Camp</h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={8} />
                    Private
                  </span>
                </div>
                {/* Clickable basecamp info section - Compact with hover animation */}
                <button
                  onClick={handleCenterOnPersonal}
                  disabled={!personalBasecamp?.latitude || !personalBasecamp?.longitude}
                  className={`bg-gray-800/50 rounded-xl p-2 border mb-2 text-left transition-all duration-300 ease-out cursor-pointer group disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] hover:shadow-lg ${
                    activeContext === 'personal'
                      ? 'border-emerald-500/40 ring-2 ring-emerald-500/30 shadow-emerald-500/10'
                      : 'border-gray-700 hover:bg-gray-800/70 hover:border-emerald-500/20'
                  }`}
                  title="Click to center map on this basecamp"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-emerald-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      {personalBasecamp.name && (
                        <p className="text-white font-medium text-xs mb-0.5">{personalBasecamp.name}</p>
                      )}
                      <p className="text-gray-400 text-xs break-words">{personalBasecamp.address}</p>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User size={16} className="text-emerald-400" />
                  <h3 className="text-white font-semibold text-base">Personal Base Camp</h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={8} />
                    Private
                  </span>
                </div>
                <p className="text-gray-400 text-xs text-center mb-2">
                  Add the location of your accommodations. Only you can see this.
                </p>
                <button
                  onClick={() => setShowPersonalSelector(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Plus size={12} />
                  Set Your Location
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Basecamp Selectors */}
      {showTripSelector && (
        <BasecampSelector
          isOpen={showTripSelector}
          onClose={() => setShowTripSelector(false)}
          onBasecampSet={handleTripBasecampSet}
          currentBasecamp={tripBasecamp || undefined}
        />
      )}
      {showPersonalSelector && (
        <BasecampSelector
          isOpen={showPersonalSelector}
          onClose={() => setShowPersonalSelector(false)}
          onBasecampSet={handlePersonalBasecampSet}
          currentBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : undefined}
        />
      )}
    </>
  );
};

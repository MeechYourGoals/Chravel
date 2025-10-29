import React, { useState, useEffect } from 'react';
import { MapPin, Home, Lock, Plus, Edit, Trash2, Navigation } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { BasecampSelector } from '../BasecampSelector';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';

export interface BasecampsPanelProps {
  tripId: string;
  tripBasecamp: BasecampLocation | null;
  onTripBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  onCenterMap: (coords: { lat: number; lng: number }, type: 'trip' | 'personal') => void;
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
}

export const BasecampsPanel: React.FC<BasecampsPanelProps> = ({
  tripId,
  tripBasecamp,
  onTripBasecampSet,
  onCenterMap,
  activeContext,
  onContextChange
}) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Load personal basecamp
  useEffect(() => {
    const loadPersonalBasecamp = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(tripId, effectiveUserId);
          setPersonalBasecamp(sessionBasecamp);
        } else if (user) {
          const dbBasecamp = await basecampService.getPersonalBasecamp(tripId, user.id);
          setPersonalBasecamp(dbBasecamp);
        } else {
          setPersonalBasecamp(null);
        }
      } catch (error) {
        console.error('Failed to load personal basecamp:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalBasecamp();
  }, [tripId, user, isDemoMode, effectiveUserId]);

  const handleTripBasecampSet = async (newBasecamp: BasecampLocation) => {
    await onTripBasecampSet(newBasecamp);
    setShowTripSelector(false);
  };

  const handlePersonalBasecampSet = async (location: BasecampLocation) => {
    try {
      if (isDemoMode) {
        const sessionBasecamp = demoModeService.setSessionPersonalBasecamp({
          trip_id: tripId,
          user_id: effectiveUserId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates?.lat,
          longitude: location.coordinates?.lng
        });
        setPersonalBasecamp(sessionBasecamp);
      } else if (user) {
        const dbBasecamp = await basecampService.upsertPersonalBasecamp({
          trip_id: tripId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates?.lat,
          longitude: location.coordinates?.lng
        });
        setPersonalBasecamp(dbBasecamp);
      }
      setShowPersonalSelector(false);
    } catch (error) {
      console.error('Failed to set personal basecamp:', error);
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Base Camp Card */}
        <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden">
          <div className="p-6">
            {tripBasecamp ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Home size={20} className="text-sky-400" />
                    <h3 className="text-white font-semibold text-lg">Trip Base Camp</h3>
                  </div>
                  <button
                    onClick={() => setShowTripSelector(true)}
                    className="p-2 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-sky-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {tripBasecamp.name && (
                        <p className="text-white font-medium text-sm mb-0.5">{tripBasecamp.name}</p>
                      )}
                      <p className="text-gray-400 text-sm break-words">{tripBasecamp.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onContextChange('trip')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      activeContext === 'trip'
                        ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Use for Searches
                  </button>
                  {tripBasecamp.coordinates && (
                    <button
                      onClick={handleCenterOnTrip}
                      className="p-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                      title="Center map"
                    >
                      <Navigation size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Home size={20} className="text-sky-400" />
                  <h3 className="text-white font-semibold text-lg">Trip Base Camp</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  No basecamp set. Set one so the group can align meetups & recs.
                </p>
                <button
                  onClick={() => setShowTripSelector(true)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-4 rounded-xl transition-colors font-medium text-sm"
                >
                  Set Trip Base Camp
                </button>
              </>
            )}
          </div>
        </div>

        {/* Personal Base Camp Card */}
        <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-800 rounded mb-4"></div>
                <div className="h-20 bg-gray-800 rounded"></div>
              </div>
            ) : personalBasecamp ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={20} className="text-emerald-400" />
                    <h3 className="text-white font-semibold text-lg">Your Accommodation</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePersonalBasecampDelete}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setShowPersonalSelector(true)}
                      className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={12} />
                    Private
                  </span>
                  {isDemoMode && (
                    <span className="text-xs text-gray-500">Demo Mode: saved locally</span>
                  )}
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-emerald-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {personalBasecamp.name && (
                        <p className="text-white font-medium text-sm mb-0.5">{personalBasecamp.name}</p>
                      )}
                      <p className="text-gray-400 text-sm break-words">{personalBasecamp.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onContextChange('personal')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      activeContext === 'personal'
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Use for Searches
                  </button>
                  {personalBasecamp.latitude && personalBasecamp.longitude && (
                    <button
                      onClick={handleCenterOnPersonal}
                      className="p-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                      title="Center map"
                    >
                      <Navigation size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={20} className="text-emerald-400" />
                  <h3 className="text-white font-semibold text-lg">Your Accommodation</h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={12} />
                    Private
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  Add where you're staying (hotel/Airbnb) to center searches around you. Only you can see
                  this.
                </p>
                {isDemoMode && (
                  <p className="text-xs text-gray-500 mb-3">Demo Mode: saved locally for this session</p>
                )}
                <button
                  onClick={() => setShowPersonalSelector(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
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

import React, { useState, useEffect } from 'react';
import { MapPin, User, Lock, Plus } from 'lucide-react';
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
    clearBasecamp();
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
      toast.success('Personal basecamp saved');
    } catch (error) {
      console.error('[BasecampsPanel] Failed to set personal basecamp:', error);
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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mobile-safe-scroll">
        {/* Trip Base Camp Card */}
        <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden flex flex-col min-h-[100px]">
          <div className="p-3 flex flex-col flex-1 justify-center">
            {tripBasecamp ? (
              <>
                <div className="relative flex items-center justify-center mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-sky-400 md:w-5 md:h-5" />
                    <h3 className="text-white font-semibold text-base md:text-lg">Trip Base Camp</h3>
                  </div>
                  <button
                    onClick={() => setShowTripSelector(true)}
                    className="absolute right-0 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm border border-sky-500/30"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-3 md:p-4 border border-gray-700 flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center text-center gap-1">
                    <MapPin size={16} className="text-sky-400 md:w-5 md:h-5" />
                    {tripBasecamp.name && (
                      <p className="text-white font-semibold text-sm md:text-base">{tripBasecamp.name}</p>
                    )}
                    <p className="text-gray-300 text-sm md:text-base break-words font-medium">{tripBasecamp.address}</p>
                  </div>
                </div>
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

        {/* Personal Base Camp Card */}
        <div className="rounded-2xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden flex flex-col min-h-[100px]">
          <div className="p-3 flex flex-col flex-1 justify-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-800 rounded mb-3"></div>
                <div className="h-16 bg-gray-800 rounded"></div>
              </div>
            ) : personalBasecamp ? (
              <>
                <div className="relative flex items-center justify-center mb-2">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-emerald-400 md:w-5 md:h-5" />
                    <h3 className="text-white font-semibold text-base md:text-lg">Personal Base Camp</h3>
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                      <Lock size={8} />
                      Private
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPersonalSelector(true)}
                    className="absolute right-0 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors text-xs md:text-sm border border-emerald-500/30"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-3 md:p-4 border border-gray-700 flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center text-center gap-1">
                    <MapPin size={16} className="text-emerald-400 md:w-5 md:h-5" />
                    {personalBasecamp.name && (
                      <p className="text-white font-semibold text-sm md:text-base">{personalBasecamp.name}</p>
                    )}
                    <p className="text-gray-300 text-sm md:text-base break-words font-medium">{personalBasecamp.address}</p>
                  </div>
                </div>
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

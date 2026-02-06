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
import { DistanceCalculator } from './DistanceCalculator';

export interface BasecampsPanelProps {
  tripId: string;
  tripBasecamp: BasecampLocation | null;
  onTripBasecampSet: (basecamp: BasecampLocation) => Promise<void> | void;
  /**
   * @deprecated Map centering is now disconnected from basecamp saving.
   * Basecamps are stored as text-only references without coordinates.
   * TODO: Remove in v2.0 after all consumers migrated
   */
  onCenterMap?: (coords: { lat: number; lng: number }, type: 'trip' | 'personal') => void;
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
  personalBasecamp?: PersonalBasecamp | null;
  onPersonalBasecampUpdate?: (basecamp: PersonalBasecamp | null) => void;
}

export const BasecampsPanel: React.FC<BasecampsPanelProps> = ({
  tripId,
  tripBasecamp,
  onTripBasecampSet,
  // onCenterMap is deprecated - map centering is disconnected from basecamp saving
  personalBasecamp: externalPersonalBasecamp,
  onPersonalBasecampUpdate,
}) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { clearBasecamp } = useBasecamp();
  const [internalPersonalBasecamp, setInternalPersonalBasecamp] = useState<PersonalBasecamp | null>(
    null,
  );
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use external state if provided, otherwise use internal state
  const personalBasecamp =
    externalPersonalBasecamp !== undefined ? externalPersonalBasecamp : internalPersonalBasecamp;
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
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(
            tripId,
            effectiveUserId,
          );
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
    // Note: Map centering is now disconnected from basecamp saving
    // Basecamps are simple text references without coordinates
  };

  const handleTripBasecampClear = async () => {
    if (!tripBasecamp) return;

    try {
      if (isDemoMode) {
        demoModeService.clearSessionTripBasecamp(tripId);
      }
      clearBasecamp();
      toast.success('Trip basecamp cleared');
    } catch (error) {
      console.error('Failed to clear trip basecamp:', error);
      toast.error('Failed to clear trip basecamp');
    }
  };

  const handlePersonalBasecampSet = async (location: BasecampLocation) => {
    try {
      let savedBasecamp: PersonalBasecamp | null = null;

      if (isDemoMode) {
        // Save without coordinates - basecamp is just a text reference now
        savedBasecamp = demoModeService.setSessionPersonalBasecamp({
          trip_id: tripId,
          user_id: effectiveUserId,
          name: location.name,
          address: location.address,
          // No coordinates - basecamp is text-only
          latitude: undefined,
          longitude: undefined,
        });
      } else if (user) {
        // Save without coordinates - basecamp is just a text reference now
        savedBasecamp = await basecampService.upsertPersonalBasecamp({
          trip_id: tripId,
          name: location.name,
          address: location.address,
          // No coordinates - basecamp is text-only
          latitude: undefined,
          longitude: undefined,
        });
      }

      // CRITICAL FIX: Only show success and update state if we actually saved
      if (savedBasecamp) {
        setPersonalBasecamp(savedBasecamp);
        setShowPersonalSelector(false);
        toast.success('Personal basecamp saved');
        console.log(
          '[BasecampsPanel] Personal basecamp saved successfully:',
          savedBasecamp.address,
        );
      } else {
        // Service returned null - save failed silently
        console.error(
          '[BasecampsPanel] Personal basecamp save returned null - database operation may have failed',
        );
        toast.error('Failed to save personal base camp. Please try again.');
      }
      // Note: Map centering is now disconnected from basecamp saving
      // Basecamps are simple text references without coordinates
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
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined,
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mobile-safe-scroll">
        {/* Trip Base Camp Card */}
        <div className="rounded-xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden">
          <div className="p-2.5">
            {tripBasecamp ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-sky-400 flex-shrink-0" />
                    <h3 className="text-white font-semibold text-sm md:text-base">
                      Trip Base Camp
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowTripSelector(true)}
                    className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 px-2 py-1 rounded-lg transition-colors text-xs border border-sky-500/30"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-sky-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {tripBasecamp.name && (
                        <p className="text-white font-semibold text-base md:text-lg truncate">
                          {tripBasecamp.name}
                        </p>
                      )}
                      <p className="text-gray-300 text-base md:text-lg break-words">
                        {tripBasecamp.address}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-sky-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold text-sm md:text-base">Trip Base Camp</h3>
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  No basecamp set. Set one so the group can align meetups & recs.
                </p>
                <button
                  onClick={() => setShowTripSelector(true)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Plus size={12} />
                  Set Trip Base Camp
                </button>
              </>
            )}
          </div>
        </div>

        {/* Personal Base Camp Card */}
        <div className="rounded-xl bg-gray-900/80 border border-white/10 shadow-lg overflow-hidden">
          <div className="p-2.5">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-5 bg-gray-800 rounded mb-2 w-1/2"></div>
                <div className="h-12 bg-gray-800 rounded"></div>
              </div>
            ) : personalBasecamp ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-400 flex-shrink-0" />
                    <h3 className="text-white font-semibold text-sm md:text-base">
                      Personal Base Camp
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                      <Lock size={8} />
                      Private
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPersonalSelector(true)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded-lg transition-colors text-xs border border-emerald-500/30"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-2.5 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {personalBasecamp.name && (
                        <p className="text-white font-semibold text-base md:text-lg truncate">
                          {personalBasecamp.name}
                        </p>
                      )}
                      <p className="text-gray-300 text-base md:text-lg break-words">
                        {personalBasecamp.address}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-emerald-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold text-sm md:text-base">
                    Personal Base Camp
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={8} />
                    Private
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  Add the location of your accommodations. Only you can see this.
                </p>
                <button
                  onClick={() => setShowPersonalSelector(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Plus size={12} />
                  Set Your Location
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Distance Calculator - Below basecamp cards */}
      <div className="mt-4">
        <DistanceCalculator
          tripBasecamp={tripBasecamp}
          personalBasecamp={personalBasecamp}
        />
      </div>
      {/* Basecamp Selectors */}
      {showTripSelector && (
        <BasecampSelector
          isOpen={showTripSelector}
          onClose={() => setShowTripSelector(false)}
          onBasecampSet={handleTripBasecampSet}
          onBasecampClear={handleTripBasecampClear}
          currentBasecamp={tripBasecamp || undefined}
        />
      )}
      {showPersonalSelector && (
        <BasecampSelector
          isOpen={showPersonalSelector}
          onClose={() => setShowPersonalSelector(false)}
          onBasecampSet={handlePersonalBasecampSet}
          onBasecampClear={handlePersonalBasecampDelete}
          currentBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : undefined}
        />
      )}
    </>
  );
};

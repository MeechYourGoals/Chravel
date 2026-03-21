import React, { useState, useEffect } from 'react';
import {
  MapPin,
  User,
  Lock,
  Plus,
  Building2,
  Home,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { BasecampSelector } from '../BasecampSelector';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBasecamp } from '@/contexts/BasecampContext';
import { useUpdateTripBasecamp, useClearTripBasecamp } from '@/hooks/useTripBasecamp';
import { personalBasecampKeys } from '@/hooks/usePersonalBasecamp';
import { toast } from 'sonner';
import { DirectionsEmbed } from './DirectionsEmbed';
import { useQueryClient } from '@tanstack/react-query';

const LOG_PREFIX = '[BasecampsPanel]';

/** Dev-only logger — stripped from production builds by the bundler's dead-code elimination. */
const devLog = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
const devWarn = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};
const devError = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

export interface BasecampsPanelProps {
  tripId: string;
  tripBasecamp: BasecampLocation | null;
  /** @deprecated Use is now handled internally. Kept for backward compat / parent notification. */
  onTripBasecampSet?: (basecamp: BasecampLocation) => Promise<void> | void;
  /** @deprecated Use is now handled internally. Kept for backward compat / parent notification. */
  onTripBasecampClear?: () => Promise<void> | void;
  personalBasecamp?: PersonalBasecamp | null;
  onPersonalBasecampUpdate?: (basecamp: PersonalBasecamp | null) => void;
}

export const BasecampsPanel: React.FC<BasecampsPanelProps> = ({
  tripId,
  tripBasecamp,
  onTripBasecampSet,
  onTripBasecampClear,
  personalBasecamp: externalPersonalBasecamp,
  onPersonalBasecampUpdate,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { clearBasecamp } = useBasecamp();

  // ─── Trip basecamp mutations (self-contained, like personal basecamp) ───
  const updateTripBasecampMutation = useUpdateTripBasecamp(tripId);
  const clearTripBasecampMutation = useClearTripBasecamp(tripId);

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
        devError('Failed to load personal basecamp:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalBasecamp();
  }, [tripId, user, isDemoMode, effectiveUserId, externalPersonalBasecamp]);

  /**
   * Trip basecamp SET handler — self-contained, mirrors personal basecamp pattern.
   *
   * Primary path: useUpdateTripBasecamp mutation (TanStack Query).
   * Fallback path: basecampService.setTripBasecamp() directly (bypasses query layer).
   *
   * After a successful save the optional parent callback is invoked for notification
   * purposes (e.g., debouncing realtime toasts) but failures in that callback are
   * isolated and never block the save.
   */
  const handleTripBasecampSet = async (newBasecamp: BasecampLocation) => {
    devLog(LOG_PREFIX, 'handleTripBasecampSet called:', {
      tripId,
      address: newBasecamp.address,
      name: newBasecamp.name,
    });

    try {
      // Primary path: TanStack Query mutation with optimistic updates
      await updateTripBasecampMutation.mutateAsync({
        name: newBasecamp.name,
        address: newBasecamp.address,
        latitude: newBasecamp.coordinates?.lat,
        longitude: newBasecamp.coordinates?.lng,
      });

      devLog(LOG_PREFIX, 'Trip basecamp saved via mutation');
      setShowTripSelector(false);

      // Notify parent (non-blocking) for backward compat / realtime debounce
      if (onTripBasecampSet) {
        try {
          await Promise.resolve(onTripBasecampSet(newBasecamp));
        } catch (notifyError) {
          // Parent notification is best-effort — never block the save
          devWarn(
            LOG_PREFIX,
            'Parent onTripBasecampSet notification failed (non-critical):',
            notifyError,
          );
        }
      }
    } catch (mutationError) {
      devError(LOG_PREFIX, 'Mutation save failed, trying direct service fallback:', mutationError);

      // Fallback: call service directly (mirrors personal basecamp pattern)
      try {
        const result = await basecampService.setTripBasecamp(tripId, {
          name: newBasecamp.name,
          address: newBasecamp.address,
          latitude: newBasecamp.coordinates?.lat,
          longitude: newBasecamp.coordinates?.lng,
        });

        if (result.success) {
          devLog(LOG_PREFIX, 'Trip basecamp saved via direct service fallback');
          setShowTripSelector(false);
          toast.success('Trip basecamp saved');
        } else {
          devError(LOG_PREFIX, 'Direct service fallback also failed:', result.error);
          toast.error(result.error || 'Failed to save trip basecamp. Please try again.');
        }
      } catch (fallbackError) {
        devError(LOG_PREFIX, 'Both mutation and direct fallback failed:', fallbackError);
        toast.error('Failed to save trip basecamp. Please try again.');
      }
    }
  };

  /**
   * Trip basecamp CLEAR handler — self-contained, mirrors personal basecamp delete.
   */
  const handleTripBasecampClear = async () => {
    if (!tripBasecamp) return;

    devLog(LOG_PREFIX, 'handleTripBasecampClear called:', { tripId });

    try {
      if (isDemoMode) {
        demoModeService.clearSessionTripBasecamp(tripId);
        clearBasecamp();
        toast.success('Trip basecamp cleared');
        return;
      }

      // Primary path: TanStack Query mutation
      try {
        await clearTripBasecampMutation.mutateAsync();
        clearBasecamp();
        devLog(LOG_PREFIX, 'Trip basecamp cleared via mutation');

        // Notify parent (non-blocking)
        if (onTripBasecampClear) {
          try {
            await Promise.resolve(onTripBasecampClear());
          } catch {
            // Parent notification is best-effort
          }
        }
        return;
      } catch (mutationError) {
        devError(
          LOG_PREFIX,
          'Clear mutation failed, trying direct service fallback:',
          mutationError,
        );
      }

      // Fallback: call service directly
      const result = await basecampService.setTripBasecamp(tripId, {
        name: '',
        address: '',
      });

      if (result.success) {
        clearBasecamp();
        toast.success('Trip basecamp cleared');
        devLog(LOG_PREFIX, 'Trip basecamp cleared via direct service fallback');
      } else {
        devError(LOG_PREFIX, 'Direct clear fallback failed:', result.error);
        toast.error('Failed to clear trip basecamp');
      }
    } catch (error) {
      devError(LOG_PREFIX, 'Failed to clear trip basecamp:', error);
      toast.error('Failed to clear trip basecamp');
    }
  };

  const handlePersonalBasecampSet = async (location: BasecampLocation) => {
    try {
      let savedBasecamp: PersonalBasecamp | null = null;

      if (isDemoMode) {
        savedBasecamp = demoModeService.setSessionPersonalBasecamp({
          trip_id: tripId,
          user_id: effectiveUserId,
          name: location.name,
          address: location.address,
          latitude: undefined,
          longitude: undefined,
          type: location.type,
          confirmation_number: location.confirmationNumber,
        });
      } else if (user) {
        savedBasecamp = await basecampService.upsertPersonalBasecamp({
          trip_id: tripId,
          name: location.name,
          address: location.address,
          latitude: undefined,
          longitude: undefined,
          type: location.type,
          confirmation_number: location.confirmationNumber,
        });
      }

      if (savedBasecamp) {
        setPersonalBasecamp(savedBasecamp);
        queryClient.setQueryData(
          personalBasecampKeys.tripUser(tripId, effectiveUserId),
          savedBasecamp,
        );
        setShowPersonalSelector(false);
        toast.success('Personal basecamp saved');
        devLog('[BasecampsPanel] Personal basecamp saved successfully:', savedBasecamp.address);
      } else {
        devError(
          '[BasecampsPanel] Personal basecamp save returned null - database operation may have failed',
        );
        toast.error('Failed to save personal base camp. Please try again.');
      }
    } catch (error) {
      devError('[BasecampsPanel] Failed to set personal basecamp:', error);
      toast.error('Failed to set personal base camp');
    }
  };

  const handlePersonalBasecampDelete = async () => {
    if (!personalBasecamp) return;

    try {
      if (isDemoMode) {
        demoModeService.deleteSessionPersonalBasecamp(tripId, effectiveUserId);
        setPersonalBasecamp(null);
        queryClient.setQueryData(personalBasecampKeys.tripUser(tripId, effectiveUserId), null);
      } else if (user) {
        const success = await basecampService.deletePersonalBasecamp(personalBasecamp.id);
        if (success) {
          setPersonalBasecamp(null);
          queryClient.setQueryData(personalBasecampKeys.tripUser(tripId, effectiveUserId), null);
        }
      }
    } catch (error) {
      devError('Failed to delete personal basecamp:', error);
      toast.error('Failed to delete personal base camp. Please try again.');
    }
  };

  const toBasecampLocation = (pb: PersonalBasecamp): BasecampLocation => ({
    address: pb.address || '',
    name: pb.name,
    type: pb.type || 'hotel',
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined,
    confirmationNumber: pb.confirmation_number || undefined,
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-4 ">
        {/* Trip Base Camp Card */}
        <div className="rounded-xl bg-glass-slate-card border border-glass-slate-border shadow-enterprise-lg overflow-hidden">
          <div className="p-2.5">
            {tripBasecamp ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gold-primary flex-shrink-0" />
                    <h3 className="text-white font-semibold text-sm md:text-base">
                      Trip Base Camp
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowTripSelector(true)}
                    aria-label="Edit trip base camp"
                    className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-2 rounded-lg transition-colors text-sm border border-white/10 min-h-[44px] flex items-center"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-glass-slate-bg/50 rounded-lg p-2.5 border border-glass-slate-border/50">
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
                  <MapPin size={16} className="text-gold-primary flex-shrink-0" />
                  <h3 className="text-white font-semibold text-sm md:text-base">Trip Base Camp</h3>
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  No basecamp set. Set one so the group can align meetups & recs.
                </p>
                <button
                  onClick={() => setShowTripSelector(true)}
                  aria-label="Set trip base camp"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium min-h-[44px]"
                >
                  <Plus size={12} />
                  Set Trip Base Camp
                </button>
              </>
            )}
          </div>
        </div>

        {/* Personal Base Camp Card */}
        <div className="rounded-xl bg-glass-slate-card border border-glass-slate-border shadow-enterprise-lg overflow-hidden">
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
                    aria-label="Edit personal base camp"
                    className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-2 rounded-lg transition-colors text-sm border border-white/10 min-h-[44px] flex items-center"
                  >
                    Edit
                  </button>
                </div>

                <div className="bg-glass-slate-bg/50 rounded-lg p-2.5 border border-glass-slate-border/50">
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
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-400">
                        {personalBasecamp.type === 'hotel' ? (
                          <>
                            <Building2 size={10} /> Hotel
                          </>
                        ) : personalBasecamp.type === 'short-term' ? (
                          <>
                            <Home size={10} /> Short-term Rental
                          </>
                        ) : (
                          <>
                            <HelpCircle size={10} /> Other
                          </>
                        )}
                      </span>
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
                  aria-label="Set your personal base camp location"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium min-h-[44px]"
                >
                  <Plus size={12} />
                  Set Your Location
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Directions Embed - Below basecamp cards */}
      <div className="mt-2 lg:mt-4">
        <DirectionsEmbed tripBasecamp={tripBasecamp} personalBasecamp={personalBasecamp} />
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
          isPersonal
        />
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { MapPin, Lock, Plus, Edit, Trash2 } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { BaseCampPill } from './BaseCampPill';
import { StaticMapEmbed } from './StaticMapEmbed';
import { BasecampSelector } from '../BasecampSelector';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';

export interface PersonalBaseCampCardProps {
  tripId: string;
  tripBasecampCity?: string;
}

export const PersonalBaseCampCard: React.FC<PersonalBaseCampCardProps> = ({
  tripId,
  tripBasecampCity
}) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [showSelector, setShowSelector] = useState(false);
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
          // Demo mode: load from session store
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(tripId, effectiveUserId);
          setPersonalBasecamp(sessionBasecamp);
        } else if (user) {
          // Authenticated: load from database
          const dbBasecamp = await basecampService.getPersonalBasecamp(tripId, user.id);
          setPersonalBasecamp(dbBasecamp);
        } else {
          // Not authenticated and not demo: no basecamp
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

  const handleBasecampSet = async (location: BasecampLocation) => {
    try {
      if (isDemoMode) {
        // Demo mode: save to session store
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
        // Authenticated: save to database
        const dbBasecamp = await basecampService.upsertPersonalBasecamp({
          trip_id: tripId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates?.lat,
          longitude: location.coordinates?.lng
        });
        setPersonalBasecamp(dbBasecamp);
      }
      setShowSelector(false);
    } catch (error) {
      console.error('Failed to set personal basecamp:', error);
    }
  };

  const handleDelete = async () => {
    if (!personalBasecamp) return;

    try {
      if (isDemoMode) {
        // Demo mode: delete from session store
        demoModeService.deleteSessionPersonalBasecamp(tripId, effectiveUserId);
        setPersonalBasecamp(null);
      } else if (user) {
        // Authenticated: delete from database
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
    coordinates: pb.latitude && pb.longitude
      ? { lat: pb.latitude, lng: pb.longitude }
      : undefined
  });

  if (loading) {
    return (
      <div className="rounded-2xl shadow-lg bg-gray-900/80 border border-white/10 overflow-hidden animate-pulse">
        <div className="h-64 bg-gray-800"></div>
        <div className="p-4">
          <div className="h-20 bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl shadow-lg bg-gray-900/80 border border-white/10 overflow-hidden">
        {/* Map Section */}
        <div className="relative h-64 rounded-t-2xl overflow-hidden">
          {personalBasecamp ? (
            <>
              <StaticMapEmbed
                address={personalBasecamp.address || ''}
                coordinates={
                  personalBasecamp.latitude && personalBasecamp.longitude
                    ? { lat: personalBasecamp.latitude, lng: personalBasecamp.longitude }
                    : undefined
                }
                className="w-full h-full"
              />
              <BaseCampPill
                label="Personal Base Camp"
                icon="lock"
                tone="personal"
              />
            </>
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center px-4">
                <MapPin size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 text-sm">No personal base camp set</p>
                <p className="text-gray-500 text-xs mt-1">
                  {tripBasecampCity ? `Defaulting to ${tripBasecampCity}` : 'Set your accommodation location'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4">
          {personalBasecamp ? (
            <>
              <div className="mb-3 rounded-xl px-4 py-2 text-sm bg-emerald-900/30 text-emerald-200 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>
                    All searches use your <strong>Personal Base Camp</strong> as your starting point
                  </span>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                    <h3 className="text-white font-semibold text-lg">Your Accommodation</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setShowSelector(true)}
                      className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                    <Lock size={12} />
                    Private
                  </span>
                  {isDemoMode && (
                    <span className="text-xs text-gray-500">Demo Mode: saved locally for this session</span>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-emerald-400 mt-1 flex-shrink-0" />
                  <div>
                    {personalBasecamp.name && (
                      <p className="text-white font-medium text-sm mb-0.5">{personalBasecamp.name}</p>
                    )}
                    <p className="text-gray-400 text-sm break-words">{personalBasecamp.address}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                <h3 className="text-white font-semibold text-lg">Your Accommodation</h3>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-emerald-900/40 text-emerald-200 border border-emerald-500/30">
                  <Lock size={12} />
                  Private
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Add where you're staying (hotel/Airbnb) to center searches around you. Only you can see this.
              </p>
              {isDemoMode && (
                <p className="text-xs text-gray-500 mb-3">Demo Mode: saved locally for this session</p>
              )}
              <button
                onClick={() => setShowSelector(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Set Your Location
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Basecamp Selector Modal */}
      {showSelector && (
        <BasecampSelector
          isOpen={showSelector}
          onClose={() => setShowSelector(false)}
          onBasecampSet={handleBasecampSet}
          currentBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : undefined}
        />
      )}
    </>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './mobile/PullToRefreshIndicator';
import { BasecampsPanel } from './places/BasecampsPanel';
import { LinksPanel } from './places/LinksPanel';
import { BasecampLocation, PlaceWithDistance } from '../types/basecamp';
import { useTripVariant } from '../contexts/TripVariantContext';
import { usePlacesLinkSync } from '../hooks/usePlacesLinkSync';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useTripBasecamp, tripBasecampKeys } from '@/hooks/useTripBasecamp';
import { personalBasecampKeys, usePersonalBasecamp } from '@/hooks/usePersonalBasecamp';
import { supabase } from '@/integrations/supabase/client';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { toast } from 'sonner';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { fetchTripPlaces } from '@/services/tripPlacesService';

interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

type TabView = 'basecamps' | 'links';

export const PlacesSection = ({
  tripId = '1',
  tripName: _tripName = 'Your Trip',
}: PlacesSectionProps) => {
  // Reserved for context-aware title
  const { variant: _variant } = useTripVariant();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  // Use TanStack Query for trip basecamp (canonical source of truth)
  const { data: tripBasecamp, isLoading: _isBasecampLoading } = useTripBasecamp(tripId);

  // ⚡ PERFORMANCE: Use TanStack Query for personal basecamp (loads in parallel with trip basecamp)
  const { data: personalBasecampData } = usePersonalBasecamp(tripId);

  // State
  const [activeTab, setActiveTab] = useState<TabView>('basecamps');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [linkedPlaceIds] = useState<Set<string>>(new Set());
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);

  // Generate demo user ID
  const getDemoUserId = () => {
    let demoId = sessionStorage.getItem('demo-user-id');
    if (!demoId) {
      demoId = `demo-user-${Date.now()}`;
      sessionStorage.setItem('demo-user-id', demoId);
    }
    return demoId;
  };

  const effectiveUserId = user?.id || getDemoUserId();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
    await queryClient.invalidateQueries({
      queryKey: personalBasecampKeys.tripUser(tripId, effectiveUserId),
    });
    await queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) });
  }, [queryClient, tripId, effectiveUserId]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const { createLinkFromPlace, removeLinkByPlaceId } = usePlacesLinkSync();

  const { data: fetchedPlaces = [] } = useQuery({
    queryKey: tripKeys.places(tripId, isDemoMode),
    queryFn: () => fetchTripPlaces(tripId, isDemoMode),
    staleTime: QUERY_CACHE_CONFIG.places.staleTime,
    gcTime: QUERY_CACHE_CONFIG.places.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.places.refetchOnWindowFocus,
    enabled: !!tripId,
  });

  useEffect(() => {
    setPlaces(fetchedPlaces);
  }, [fetchedPlaces]);

  // ⚡ PERFORMANCE: Sync personal basecamp from TanStack Query to local state
  // This replaces the sequential useEffect fetch with parallel query loading
  useEffect(() => {
    if (personalBasecampData !== undefined) {
      setPersonalBasecamp(personalBasecampData);
    }
  }, [personalBasecampData]);

  // Track local updates to prevent toast spam
  const lastLocalUpdateRef = useRef<{ timestamp: number; address: string } | null>(null);
  const UPDATE_DEBOUNCE_MS = 2000;

  // Realtime sync for trip basecamp updates - invalidate TanStack Query cache
  useEffect(() => {
    if (isDemoMode || !tripId) return;

    const channel = supabase
      .channel(`trip_basecamp_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        async _payload => {
          const now = Date.now();
          const isLocalUpdate =
            lastLocalUpdateRef.current &&
            now - lastLocalUpdateRef.current.timestamp < UPDATE_DEBOUNCE_MS;

          if (!isLocalUpdate) {
            console.log('[PlacesSection] Remote basecamp update detected, invalidating cache');
            queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });

            const updatedBasecamp = await basecampService.getTripBasecamp(tripId);
            if (updatedBasecamp) {
              toast.success('Trip Base Camp updated by another member!', {
                description: updatedBasecamp.name || updatedBasecamp.address,
              });
            }
          } else {
            console.log('[PlacesSection] Local basecamp update detected, skipping notification');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient]);

  /**
   * Notification-only callback for trip basecamp set.
   * The actual save is now handled self-contained inside BasecampsPanel.
   * This callback is used to debounce realtime notifications so the user
   * doesn't see "updated by another member" toasts for their own saves.
   */
  const handleBasecampSetNotification = (newBasecamp: BasecampLocation) => {
    lastLocalUpdateRef.current = {
      timestamp: Date.now(),
      address: newBasecamp.address,
    };

    if (import.meta.env.DEV) {
      console.log('[PlacesSection] Trip basecamp set notification received:', newBasecamp.address);
    }
  };

  /**
   * Notification-only callback for trip basecamp clear.
   * The actual clear is now handled self-contained inside BasecampsPanel.
   */
  const handleBasecampClearNotification = () => {
    lastLocalUpdateRef.current = {
      timestamp: Date.now(),
      address: '',
    };
  };

  const handlePersonalBasecampUpdate = (basecamp: PersonalBasecamp | null) => {
    setPersonalBasecamp(basecamp);
  };

  return (
    <div className="relative mb-12 mobile-safe-scroll">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* ROW 1: Header with LEFT-aligned title and CENTERED tabs */}
      <div className="mb-6 flex flex-row items-center justify-between w-full px-0 relative">
        <h2 className="flex-none text-3xl font-bold text-white">Places</h2>

        {/* Centered Tab Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1 flex gap-1">
            {(['basecamps', 'links'] as TabView[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'basecamps' ? 'Base Camps' : 'Explore'}
              </button>
            ))}
          </div>
        </div>

        {/* Empty spacer for balance */}
        <div className="flex-none w-[100px]"></div>
      </div>

      {/* Tab Content — ⚡ display:none keeps both sub-tabs mounted for instant switching */}
      <div className="w-full px-0 mb-2 md:mb-6">
        <div style={{ display: activeTab === 'basecamps' ? 'block' : 'none' }}>
          <BasecampsPanel
            tripId={tripId}
            tripBasecamp={tripBasecamp || null}
            onTripBasecampSet={handleBasecampSetNotification}
            onTripBasecampClear={handleBasecampClearNotification}
            personalBasecamp={personalBasecamp}
            onPersonalBasecampUpdate={handlePersonalBasecampUpdate}
          />
        </div>

        <div style={{ display: activeTab === 'links' ? 'block' : 'none' }}>
          <LinksPanel
            tripId={tripId}
            places={places}
            basecamp={tripBasecamp || null}
            personalBasecamp={personalBasecamp}
            onPlaceAdded={place => {
              setPlaces(prev => [...prev, place]);
            }}
            onPlaceRemoved={placeId => {
              setPlaces(prev => prev.filter(p => p.id !== placeId));
              removeLinkByPlaceId(tripId, placeId);
            }}
            onAddToLinks={async place => {
              await createLinkFromPlace(place, 'You', tripId, effectiveUserId);
              return true;
            }}
            linkedPlaceIds={linkedPlaceIds}
            onEventAdded={_eventData => {
              // Event added to calendar (reserved for future use)
            }}
          />
        </div>
      </div>
    </div>
  );
};

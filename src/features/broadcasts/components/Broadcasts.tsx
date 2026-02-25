import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BroadcastComposer } from './BroadcastComposer';
import { BroadcastList } from './BroadcastList';
import { BroadcastFilters } from './BroadcastFilters';
import { Radio, Clock } from 'lucide-react';
import { beyonceCowboyCarterTour } from '@/data/pro-trips/beyonceCowboyCarterTour';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useParams } from 'react-router-dom';
import { detectTripTier } from '@/utils/tripTierDetector';
import { useBroadcastFilters } from '../hooks/useBroadcastFilters';
import { broadcastService } from '@/services/broadcastService';
import type { Broadcast } from '@/services/broadcastService';
import { tripKeys } from '@/lib/queryKeys';

const participants = beyonceCowboyCarterTour.participants;

interface BroadcastData {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent' | 'emergency';
  recipients: string;
  responses: {
    coming: number;
    wait: number;
    cant: number;
  };
  userResponse?: 'coming' | 'wait' | 'cant';
}

function mapPriorityToCategory(
  priority: string | null,
): 'chill' | 'logistics' | 'urgent' | 'emergency' {
  switch (priority) {
    case 'urgent':
      return 'urgent';
    case 'reminder':
      return 'logistics';
    case 'fyi':
    default:
      return 'chill';
  }
}

function mapBroadcastToDisplay(b: Broadcast): BroadcastData {
  const metadata = (b.metadata as Record<string, unknown>) || {};
  return {
    id: b.id,
    sender: 'Organizer',
    message: b.message,
    timestamp: new Date(b.created_at),
    location: (metadata.location as string) || undefined,
    category: mapPriorityToCategory(b.priority),
    recipients: (metadata.recipients as string) || 'everyone',
    responses: { coming: 0, wait: 0, cant: 0 },
  };
}

export const Broadcasts = () => {
  const { tripId, eventId, proTripId } = useParams();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const [userResponses, setUserResponses] = useState<Record<string, 'coming' | 'wait' | 'cant'>>(
    {},
  );

  const currentTripId = tripId || eventId || proTripId || 'default-trip';
  const tripTier = detectTripTier(currentTripId);

  const { priority, setPriority, applyFilters, hasActiveFilters, clearFilters } =
    useBroadcastFilters();

  const [demoBroadcasts, setDemoBroadcasts] = useState<BroadcastData[]>([
    {
      id: 'mock-1',
      sender: 'Sarah Chen',
      message: 'Just booked my flight, landing at 3:30 on Friday',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      category: 'logistics' as const,
      recipients: 'everyone',
      responses: { coming: 5, wait: 0, cant: 1 },
    },
  ]);

  const { data: dbBroadcasts = [], isLoading } = useQuery({
    queryKey: tripKeys.broadcasts(currentTripId),
    queryFn: () => broadcastService.getTripBroadcasts(currentTripId),
    enabled: !!currentTripId && !isDemoMode,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (isDemoMode || !currentTripId) return;
    const unsub = broadcastService.subscribeToBroadcasts(currentTripId, newBroadcast => {
      queryClient.setQueryData<Broadcast[]>(tripKeys.broadcasts(currentTripId), (prev = []) => [
        newBroadcast,
        ...prev,
      ]);
    });
    return () => {
      unsub();
    };
  }, [currentTripId, isDemoMode, queryClient]);

  const broadcasts: BroadcastData[] = isDemoMode
    ? demoBroadcasts
    : dbBroadcasts.map(mapBroadcastToDisplay);

  const handleNewBroadcast = (newBroadcast: {
    message: string;
    location?: string;
    category: 'chill' | 'logistics' | 'urgent';
    recipients: string;
  }) => {
    if (isDemoMode) {
      const broadcast: BroadcastData = {
        id: Date.now().toString(),
        sender: 'You',
        message: newBroadcast.message,
        timestamp: new Date(),
        location: newBroadcast.location,
        category: newBroadcast.category,
        recipients: newBroadcast.recipients,
        responses: { coming: 0, wait: 0, cant: 0 },
      };
      setDemoBroadcasts(prev => [broadcast, ...prev]);
    } else {
      queryClient.invalidateQueries({ queryKey: tripKeys.broadcasts(currentTripId) });
    }
  };

  const handleResponse = (broadcastId: string, response: 'coming' | 'wait' | 'cant') => {
    const prevResponse = userResponses[broadcastId];
    setUserResponses(prev => ({ ...prev, [broadcastId]: response }));
  };

  const recentBroadcasts = broadcasts.filter(broadcast => {
    const hoursDiff = (Date.now() - new Date(broadcast.timestamp).getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  });

  const filteredBroadcasts = applyFilters(recentBroadcasts);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Radio size={24} className="text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Broadcasts</h2>
          <p className="text-slate-400 text-sm">Quick updates and alerts for the group</p>
        </div>
      </div>

      <BroadcastComposer
        participants={participants}
        tripTier={tripTier}
        tripId={currentTripId}
        onSend={handleNewBroadcast}
      />

      <BroadcastFilters
        priority={priority}
        onPriorityChange={setPriority}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {!isDemoMode && isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <BroadcastList
          broadcasts={filteredBroadcasts}
          userResponses={userResponses}
          onRespond={handleResponse}
        />
      )}

      {recentBroadcasts.length > 0 && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
            <Clock size={12} />
            Showing broadcasts from the last 48 hours
          </div>
        </div>
      )}
    </div>
  );
};

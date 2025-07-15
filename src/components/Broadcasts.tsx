
import React, { useState, useEffect } from 'react';
import { Broadcast } from './Broadcast';
import { BroadcastComposer } from './BroadcastComposer';
import { Radio, Clock } from 'lucide-react';
import { beyonceCowboyCarterTour } from '../data/pro-trips/beyonceCowboyCarterTour';
import { demoModeService } from '@/services/demoModeService';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useParams } from 'react-router-dom';
import { getMockAvatar } from '@/utils/mockAvatars';
import { detectTripTier } from '@/utils/tripTierDetector';

const participants = beyonceCowboyCarterTour.participants;

interface BroadcastData {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent';
  recipients: string;
  responses: {
    coming: number;
    wait: number;
    cant: number;
  };
  userResponse?: 'coming' | 'wait' | 'cant';
}

const mockBroadcasts: BroadcastData[] = [
  {
    id: '1',
    sender: 'Emma',
    message: 'Heading to the pool in 10 minutes! Join us if you want 🏊‍♀️',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    location: 'Hotel Pool',
    recipients: 'everyone',
    category: 'chill',
    responses: { coming: 3, wait: 1, cant: 0 }
  },
  {
    id: '2',
    sender: 'Jake',
    message: 'Dinner reservation confirmed for 7:45 PM at Le Petit Bistro. Don\'t be late!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    location: 'Le Petit Bistro',
    recipients: 'everyone',
    category: 'logistics',
    responses: { coming: 5, wait: 0, cant: 1 }
  },
  {
    id: '3',
    sender: 'Sarah',
    message: 'Last shuttle back to hotel leaves at 1:30 AM - don\'t miss it!!',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    recipients: 'everyone',
    category: 'urgent',
    responses: { coming: 6, wait: 0, cant: 0 }
  }
];

export const Broadcasts = () => {
  const { tripId, eventId, proTripId } = useParams();
  const { isDemoMode } = useDemoMode();
  const [broadcasts, setBroadcasts] = useState<BroadcastData[]>(mockBroadcasts);
  const [userResponses, setUserResponses] = useState<Record<string, 'coming' | 'wait' | 'cant'>>({});
  const [mockBroadcastsLoaded, setMockBroadcastsLoaded] = useState(false);

  const currentTripId = tripId || eventId || proTripId || 'default-trip';
  const tripTier = detectTripTier(currentTripId);

  // Load mock broadcasts in demo mode
  useEffect(() => {
    const loadMockBroadcasts = async () => {
      if (isDemoMode && !mockBroadcastsLoaded) {
        const tripType = demoModeService.getTripType({ 
          title: currentTripId,
          category: currentTripId.includes('pro-') ? 'pro' : 'consumer'
        });
        
        const mockBroadcasts = await demoModeService.getMockBroadcasts(tripType);
        
        if (mockBroadcasts.length > 0) {
          const demoBroadcasts: BroadcastData[] = mockBroadcasts.map((mock, index) => ({
            id: mock.id,
            sender: mock.sender_name,
            message: mock.content,
            timestamp: new Date(Date.now() - (index + 1) * 60 * 60 * 1000), // 1 hour intervals
            location: mock.location || undefined,
            category: mock.tag,
            recipients: 'everyone',
            responses: { 
              coming: Math.floor(Math.random() * 8) + 2, 
              wait: Math.floor(Math.random() * 3), 
              cant: Math.floor(Math.random() * 2) 
            }
          }));
          
          setBroadcasts([...demoBroadcasts, ...broadcasts]);
        }
        
        setMockBroadcastsLoaded(true);
      }
    };

    loadMockBroadcasts();
  }, [isDemoMode, mockBroadcastsLoaded, currentTripId, broadcasts]);

  const handleNewBroadcast = (newBroadcast: {
    message: string;
    location?: string;
    category: 'chill' | 'logistics' | 'urgent';
    recipients: string;
  }) => {
    const broadcast: BroadcastData = {
      id: Date.now().toString(),
      sender: 'You',
      message: newBroadcast.message,
      timestamp: new Date(),
      location: newBroadcast.location,
      category: newBroadcast.category,
      recipients: newBroadcast.recipients,
      responses: { coming: 0, wait: 0, cant: 0 }
    };

    setBroadcasts([broadcast, ...broadcasts]);
  };

  const handleResponse = (broadcastId: string, response: 'coming' | 'wait' | 'cant') => {
    const prevResponse = userResponses[broadcastId];
    
    setBroadcasts(broadcasts.map(broadcast => {
      if (broadcast.id === broadcastId) {
        const newResponses = { ...broadcast.responses };
        
        // Remove previous response
        if (prevResponse) {
          newResponses[prevResponse] = Math.max(0, newResponses[prevResponse] - 1);
        }
        
        // Add new response
        newResponses[response] = newResponses[response] + 1;
        
        return {
          ...broadcast,
          responses: newResponses
        };
      }
      return broadcast;
    }));

    setUserResponses({
      ...userResponses,
      [broadcastId]: response
    });
  };

  // Filter broadcasts from last 48 hours
  const recentBroadcasts = broadcasts.filter(broadcast => {
    const hoursDiff = (Date.now() - broadcast.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Radio size={24} className="text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Broadcasts</h2>
          <p className="text-slate-400 text-sm">
            Quick updates and alerts for the group
          </p>
        </div>
      </div>

      {/* Broadcast Composer */}
      <BroadcastComposer participants={participants} tripTier={tripTier} onSend={handleNewBroadcast} />

      {/* Active Broadcasts */}
      <div className="space-y-4">
        {recentBroadcasts.length > 0 ? (
          recentBroadcasts.map((broadcast) => (
            <Broadcast
              key={broadcast.id}
              {...broadcast}
              userResponse={userResponses[broadcast.id]}
              onRespond={handleResponse}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Radio size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No Recent Broadcasts</h3>
            <p className="text-slate-500 text-sm">
              Share quick updates and alerts with your group
            </p>
          </div>
        )}
      </div>

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

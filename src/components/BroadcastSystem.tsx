import React from 'react';
import { Radio } from 'lucide-react';
import { BroadcastComposer } from './BroadcastComposer';
import { BroadcastList } from './broadcast/BroadcastList';
import { BroadcastFilters } from './broadcast/BroadcastFilters';
import { useBroadcastFilters } from '../hooks/useBroadcastFilters';

interface BroadcastSystemProps {
  tourId: string;
  tripId?: string;
  tripTier?: 'consumer' | 'pro' | 'event';
}

export const BroadcastSystem = ({ 
  tourId: _tourId, 
  tripId = '1', 
  tripTier = 'pro'
}: BroadcastSystemProps) => {
  const {
    priority,
    setPriority,
    hasActiveFilters,
    clearFilters,
    applyFilters
  } = useBroadcastFilters();

  // Mock broadcast data - Replace with real data from API
  const mockBroadcasts = [
    {
      id: '1',
      sender: 'Tour Manager',
      message: 'Sound check moved to 5 PM today. All crew meet at stage.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      location: 'Madison Square Garden',
      category: 'urgent' as const,
      recipients: 'everyone',
      responses: { coming: 12, wait: 3, cant: 1 }
    },
    {
      id: '2',
      sender: 'Production Lead',
      message: 'Reminder: Load-in starts at 2 PM tomorrow.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      category: 'logistics' as const,
      recipients: 'role:crew',
      responses: { coming: 8, wait: 0, cant: 2 }
    }
  ];

  const filteredBroadcasts = applyFilters(mockBroadcasts);
  const [userResponses, setUserResponses] = React.useState<Record<string, 'coming' | 'wait' | 'cant'>>({});

  const handleRespond = (broadcastId: string, response: 'coming' | 'wait' | 'cant') => {
    setUserResponses(prev => ({ ...prev, [broadcastId]: response }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Radio className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Broadcast System</h2>
          <p className="text-sm text-slate-400">Send messages to all trips or specific groups</p>
        </div>
      </div>

      {/* Composer */}
      <BroadcastComposer
        tripId={tripId}
        tripTier={tripTier}
        participants={[]}
      />

      {/* Filters */}
      <BroadcastFilters
        priority={priority}
        onPriorityChange={setPriority}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Recent Broadcasts */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Broadcasts</h3>
        <BroadcastList
          broadcasts={filteredBroadcasts}
          userResponses={userResponses}
          onRespond={handleRespond}
        />
      </div>
    </div>
  );
};

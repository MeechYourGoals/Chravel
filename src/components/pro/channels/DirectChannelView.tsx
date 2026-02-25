import React, { useState, useEffect } from 'react';
import { MessageSquare, Hash, Lock } from 'lucide-react';
import { TripChannel } from '../../../types/roleChannels';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { ChannelChatView } from './ChannelChatView';

interface DirectChannelViewProps {
  tripId: string;
  userRole: string;
}

const DEMO_TRIP_IDS = [
  'lakers-road-trip',
  'beyonce-cowboy-carter-tour',
  'eli-lilly-c-suite-retreat-2026',
];

export const DirectChannelView = ({ tripId, userRole }: DirectChannelViewProps) => {
  const [channels, setChannels] = useState<TripChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TripChannel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_TRIP_IDS.includes(tripId)) {
      const { channels: demoChannels } = getDemoChannelsForTrip(tripId);
      setChannels(demoChannels);
      setLoading(false);
    }
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading channels...</div>
      </div>
    );
  }

  if (selectedChannel) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <ChannelChatView channel={selectedChannel} onBack={() => setSelectedChannel(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Demo Mode:</strong> Click on any channel below to see how role-based channels work
        </p>
      </div>

      <div className="grid gap-3">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannel(channel)}
            className="w-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-purple-400" />
                <div>
                  <h3 className="font-medium text-white flex items-center gap-2">
                    #{channel.channelName.toLowerCase().replace(/\s+/g, '-')}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">{channel.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {channel.memberCount} members
                </span>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-gray-700 rounded-lg p-4 mt-6">
        <p className="text-sm font-medium text-white mb-2">How it works:</p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Role channels are private - only visible to members with that role</li>
          <li>• Perfect for focused discussions (e.g., security, medical, production)</li>
          <li>• Messages stay within the channel for privacy</li>
        </ul>
      </div>
    </div>
  );
};

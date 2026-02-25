import React, { useState, useEffect } from 'react';
import { MessageSquare, Lock, Hash, Users } from 'lucide-react';
import { TripChannel } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { getDemoChannelsForTrip } from '../../../data/demoChannelData';
import { ChannelChatView } from './ChannelChatView';

interface InlineChannelListProps {
  tripId: string;
  userRole: string;
}

const DEMO_TRIP_IDS = [
  'lakers-road-trip',
  'beyonce-cowboy-carter-tour',
  'eli-lilly-c-suite-retreat-2026',
  '13',
  '14',
  '15',
  '16',
];

export const InlineChannelList = ({ tripId, userRole }: InlineChannelListProps) => {
  const [channels, setChannels] = useState<TripChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TripChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);

  useEffect(() => {
    loadChannels();
  }, [tripId]);

  const loadChannels = async () => {
    setLoading(true);

    if (isDemoTrip) {
      const { channels } = getDemoChannelsForTrip(tripId);
      setChannels(channels);
    } else {
      const accessibleChannels = await channelService.getAccessibleChannels(tripId);
      setChannels(accessibleChannels);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <MessageSquare size={24} className="mx-auto mb-2 animate-pulse" />
        <p className="text-sm">Loading channels...</p>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <MessageSquare size={32} className="mx-auto mb-2 text-gray-500" />
        <p className="text-gray-400 text-sm">No channels available for your role</p>
      </div>
    );
  }

  // If channel selected, show full-screen chat on mobile, inline on desktop
  if (selectedChannel) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        <div className="h-[600px]">
          <ChannelChatView
            channel={selectedChannel}
            availableChannels={channels}
            onBack={() => setSelectedChannel(null)}
            onChannelChange={newChannel => setSelectedChannel(newChannel)}
          />
        </div>
      </div>
    );
  }

  // Channel list view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {channels.map(channel => (
        <button
          key={channel.id}
          onClick={() => setSelectedChannel(channel)}
          className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 text-left transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
              {channel.isPrivate ? (
                <Lock size={18} className="text-purple-400" />
              ) : (
                <Hash size={18} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                  #{channel.channelSlug}
                </h4>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 truncate mb-2">{channel.requiredRoleName}</p>
              {channel.description && (
                <p className="text-xs text-gray-500 truncate">{channel.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{channel.memberCount || 0} members</span>
                </div>
                {channel.lastMessage && (
                  <span className="truncate">
                    Last: {channel.lastMessage.content.substring(0, 30)}...
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

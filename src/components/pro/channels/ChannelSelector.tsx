import React from 'react';
import { Lock, Hash } from 'lucide-react';
import { TripChannel } from '../../../types/roleChannels';

interface ChannelSelectorProps {
  channels: TripChannel[];
  selectedChannel: TripChannel | null;
  onSelectChannel: (channel: TripChannel) => void;
}

export const ChannelSelector = ({
  channels,
  selectedChannel,
  onSelectChannel
}: ChannelSelectorProps) => {
  if (channels.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p className="text-sm">No channels available</p>
        <p className="text-xs mt-1">Ask an admin to create role channels</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            selectedChannel?.id === channel.id
              ? 'bg-red-600/20 text-red-400 border border-red-600/30'
              : 'hover:bg-white/5 text-gray-300'
          }`}
        >
          {channel.isPrivate ? (
            <Lock size={16} className="flex-shrink-0 text-purple-400" />
          ) : (
            <Hash size={16} className="flex-shrink-0 text-gray-500" />
          )}
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm truncate">
              {channel.channelName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {channel.requiredRoleName}
            </div>
          </div>
          {channel.unreadCount && channel.unreadCount > 0 && (
            <div className="flex-shrink-0 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs text-white font-semibold">
              {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

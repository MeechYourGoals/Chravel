import React from 'react';
import { ChevronDown, Hash, Lock } from 'lucide-react';
import { TripChannel } from '../../../types/roleChannels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';

interface ChannelHeaderDropdownProps {
  currentChannel: TripChannel;
  availableChannels: TripChannel[];
  onChannelChange: (channel: TripChannel | null) => void;
}

export const ChannelHeaderDropdown = ({
  currentChannel,
  availableChannels,
  onChannelChange,
}: ChannelHeaderDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1 h-auto hover:bg-white/10"
        >
          <div className="flex items-center gap-2">
            {currentChannel.isPrivate ? (
              <Lock size={16} className="text-purple-400" />
            ) : (
              <Hash size={16} className="text-gray-400" />
            )}
            <span className="font-semibold text-white">{currentChannel.channelSlug}</span>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 bg-gray-800 border-gray-700">
        <DropdownMenuLabel className="text-gray-400 text-xs">Switch Channel</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />

        {availableChannels.map(channel => (
          <DropdownMenuItem
            key={channel.id}
            onClick={() => onChannelChange(channel)}
            className={`flex items-center gap-2 py-2 px-3 cursor-pointer ${
              channel.id === currentChannel.id
                ? 'bg-purple-600/20 text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            {channel.isPrivate ? (
              <Lock size={14} className="text-purple-400" />
            ) : (
              <Hash size={14} className="text-gray-400" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">#{channel.channelSlug}</div>
              <div className="text-xs text-gray-500 truncate">{channel.requiredRoleName}</div>
            </div>
            {channel.unreadCount && channel.unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {channel.unreadCount}
              </span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          onClick={() => onChannelChange(null)}
          className="text-gray-300 hover:bg-white/10 cursor-pointer"
        >
          <Hash size={14} className="mr-2 text-gray-400" />
          Main Trip Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

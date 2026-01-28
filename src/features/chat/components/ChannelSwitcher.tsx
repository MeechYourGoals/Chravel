import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Hash, Lock, Users, MessageSquare } from 'lucide-react';
import { RoleChannel } from '@/services/roleChannelService';

interface ChannelSwitcherProps {
  activeChannel: 'main' | string; // 'main' or channel ID
  roleChannels: RoleChannel[];
  onChannelChange: (channelId: 'main' | string) => void;
  className?: string;
}

export const ChannelSwitcher = ({
  activeChannel,
  roleChannels,
  onChannelChange,
  className
}: ChannelSwitcherProps) => {
  return (
    <Select value={activeChannel} onValueChange={onChannelChange}>
      <SelectTrigger className={`w-full max-w-[420px] mx-auto bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 transition-colors duration-200 md:max-w-[420px] sm:max-w-[380px] ${className}`}>
        <SelectValue>
          {activeChannel === 'main' ? (
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-gray-400" />
              <span className="text-sm truncate">Main Trip Chat</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-purple-400" />
              <span className="text-sm truncate">
                #{roleChannels.find(ch => ch.id === activeChannel)?.roleName.toLowerCase().replace(/\s+/g, '-')}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-w-[420px] bg-gray-800 border-gray-700 md:max-w-[420px] sm:max-w-[380px]">
        {/* Main Chat */}
        <SelectItem value="main" className="text-white hover:bg-gray-700">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-gray-400" />
            <span className="text-sm">Main Trip Chat</span>
            <Users size={12} className="text-gray-500 ml-auto" />
          </div>
        </SelectItem>

        {/* Role Channels */}
        {roleChannels.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">
              ROLE CHANNELS
            </div>
            {roleChannels.map(channel => (
              <SelectItem key={channel.id} value={channel.id} className="text-white hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-purple-400" />
                  <span className="text-sm truncate">#{channel.roleName.toLowerCase().replace(/\s+/g, '-')}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    Private
                  </span>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};


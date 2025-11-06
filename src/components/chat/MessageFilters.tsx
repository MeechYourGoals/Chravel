import React from 'react';
import { MessageCircle, Megaphone, CreditCard, Hash, Lock, ChevronDown } from 'lucide-react';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { TripChannel } from '@/types/roleChannels';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MessageFiltersProps {
  activeFilter: 'all' | 'broadcast' | 'payments' | 'channels';
  onFilterChange: (filter: 'all' | 'broadcast' | 'payments' | 'channels') => void;
  hidePayments?: boolean;
  isPro?: boolean;
  hasChannels?: boolean;
  channelCount?: number;
  availableChannels?: TripChannel[];
  activeChannel?: TripChannel | null;
  onChannelSelect?: (channel: TripChannel | null) => void;
}

export const MessageFilters = ({ 
  activeFilter, 
  onFilterChange, 
  hidePayments = false,
  isPro = false,
  hasChannels = false,
  channelCount = 0,
  availableChannels = [],
  activeChannel = null,
  onChannelSelect
}: MessageFiltersProps) => {
  const isMobilePortrait = useMobilePortrait();

  const handleChannelButtonClick = () => {
    if (!hasChannels) return;
    if (availableChannels.length === 1 && onChannelSelect) {
      // Single channel - select it directly
      onChannelSelect(availableChannels[0]);
      onFilterChange('channels');
    } else if (availableChannels.length === 0) {
      // No channels - do nothing
      return;
    }
    // Multiple channels - dropdown will handle it
  };

  const handleChannelSelect = (channel: TripChannel | null) => {
    if (onChannelSelect) {
      onChannelSelect(channel);
      if (channel) {
        onFilterChange('channels');
      } else {
        onFilterChange('all');
      }
    }
  };

  // Mobile Portrait: Compressed tab bar (40px height)
  if (isMobilePortrait) {
    return (
      <div className="flex justify-center gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white' 
              : 'border border-gray-600 text-gray-400 active:text-white active:border-gray-500'
          }`}
        >
          <MessageCircle size={14} />
          All Messages
        </button>
        <button
          onClick={() => onFilterChange('broadcast')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'broadcast' 
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
              : 'border border-red-600 text-red-400 active:text-white active:bg-red-600/10'
          }`}
        >
          <Megaphone size={14} />
          Broadcasts
        </button>
        {!hidePayments && (
          <button
            onClick={() => onFilterChange('payments')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === 'payments' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                : 'border border-green-600 text-green-400 active:text-white active:bg-green-600/10'
            }`}
          >
            <CreditCard size={14} />
            Payments
          </button>
        )}
        {isPro && availableChannels.length <= 1 && (
          <button
            onClick={handleChannelButtonClick}
            disabled={!hasChannels}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === 'channels'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                : hasChannels
                ? 'border border-purple-600 text-purple-400 active:text-white active:bg-purple-600/10'
                : 'border border-gray-600 text-gray-600 cursor-not-allowed'
            }`}
            title={!hasChannels ? 'No role channels available. Contact your admin to be added.' : ''}
          >
            {hasChannels ? <Hash size={14} /> : <Lock size={14} />}
            {activeChannel ? `#${activeChannel.channelSlug}` : 'Channels'}
          </button>
        )}
        {isPro && availableChannels.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === 'channels'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                    : 'border border-purple-600 text-purple-400 active:text-white active:bg-purple-600/10'
                }`}
              >
                <Hash size={14} />
                {activeChannel ? `#${activeChannel.channelSlug}` : 'Channels'}
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 z-50 bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={() => handleChannelSelect(null)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Main Trip Chat
              </DropdownMenuItem>
              {availableChannels.map((channel) => (
                <DropdownMenuItem key={channel.id} onClick={() => handleChannelSelect(channel)}>
                  <Lock className="w-4 h-4 mr-2 text-purple-400" />
                  #{channel.channelSlug} ({channel.memberCount || 0})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Desktop/Tablet Landscape: Original styling unchanged
  return (
    <div className="flex justify-center gap-4">
      <button
        onClick={() => onFilterChange('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeFilter === 'all'
            ? 'bg-blue-600 text-white' 
            : 'border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
        }`}
      >
        <MessageCircle size={16} />
        All Messages
      </button>
      <button
        onClick={() => onFilterChange('broadcast')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          activeFilter === 'broadcast' 
            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
            : 'border border-red-600 text-red-400 hover:text-white hover:bg-red-600/10'
        }`}
      >
        <Megaphone size={16} />
        Broadcasts
      </button>
      {!hidePayments && (
        <button
          onClick={() => onFilterChange('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'payments' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
              : 'border border-green-600 text-green-400 hover:text-white hover:bg-green-600/10'
          }`}
        >
          <CreditCard size={16} />
          Payments
        </button>
      )}
      {isPro && availableChannels.length <= 1 && (
        <button
          onClick={handleChannelButtonClick}
          disabled={!hasChannels}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'channels'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
              : hasChannels
              ? 'border border-purple-600 text-purple-400 hover:text-white hover:bg-purple-600/10'
              : 'border border-gray-600 text-gray-600 cursor-not-allowed'
          }`}
          title={!hasChannels ? 'No role channels available. Contact your admin to be added.' : ''}
        >
          {hasChannels ? <Hash size={16} /> : <Lock size={16} />}
          {activeChannel ? `#${activeChannel.channelSlug}` : 'Channels'}
        </button>
      )}
      {isPro && availableChannels.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === 'channels'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                  : 'border border-purple-600 text-purple-400 hover:text-white hover:bg-purple-600/10'
              }`}
            >
              <Hash size={16} />
              {activeChannel ? `#${activeChannel.channelSlug}` : 'Channels'}
              <ChevronDown size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 z-50 bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={() => handleChannelSelect(null)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Main Trip Chat
            </DropdownMenuItem>
            {availableChannels.map((channel) => (
              <DropdownMenuItem key={channel.id} onClick={() => handleChannelSelect(channel)}>
                <Lock className="w-4 h-4 mr-2 text-purple-400" />
                #{channel.channelSlug} ({channel.memberCount || 0})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { MessageCircle, Megaphone, Hash, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TripChannel } from '@/types/roleChannels';

/** Centralized segment color map — single source of truth for all chat tab styling */
const SEGMENT_COLORS = {
  all: {
    active: 'bg-[#007AFF] text-white shadow-md',
    inactive: 'text-white/70 hover:text-white hover:bg-white/5',
    badge: 'bg-gold-primary text-black',
  },
  broadcasts: {
    active: 'bg-[#B91C1C] text-white shadow-md',
    inactive: 'text-[#EF4444] hover:text-white hover:bg-[#B91C1C]',
    badge: 'bg-[#B91C1C] text-white',
  },
  channels: {
    active: 'bg-[#059669] text-white shadow-md',
    inactive: 'text-[#34D399] hover:text-white hover:bg-[#059669]',
  },
  search: {
    inactive: 'text-white/70 hover:text-white hover:bg-white/5',
  },
} as const;

interface MessageTypeBarProps {
  activeFilter: 'all' | 'broadcasts' | 'channels';
  onFilterChange: (filter: 'all' | 'broadcasts' | 'channels') => void;
  hasChannels?: boolean;
  isPro?: boolean;
  broadcastCount?: number;
  unreadCount?: number;
  // Channel-specific props
  availableChannels?: TripChannel[];
  activeChannel?: TripChannel | null;
  onChannelSelect?: (channel: TripChannel | null) => void;
  // Search props
  onSearchClick?: () => void;
}

export const MessageTypeBar = ({
  activeFilter,
  onFilterChange,
  hasChannels = false,
  isPro = false,
  broadcastCount = 0,
  unreadCount = 0,
  availableChannels = [],
  activeChannel,
  onChannelSelect,
  onSearchClick,
}: MessageTypeBarProps) => {
  const pillBarRef = useRef<HTMLDivElement>(null);
  const [channelPopoverOpen, setChannelPopoverOpen] = useState(false);

  // Auto-open channels popover when switching to channels filter
  useEffect(() => {
    if (activeFilter === 'channels' && hasChannels && availableChannels.length > 0) {
      setChannelPopoverOpen(true);
    } else {
      setChannelPopoverOpen(false);
    }
  }, [activeFilter, hasChannels, availableChannels.length]);

  const handleChannelSelect = (channel: TripChannel) => {
    onChannelSelect?.(channel);
    setChannelPopoverOpen(false);
  };

  return (
    <div className="sticky top-0 z-10 backdrop-blur-lg px-2 py-1 rounded-t-2xl overflow-hidden">
      {/* Centered Segmented Control Container */}
      <div className="flex items-center justify-center">
        <div
          ref={pillBarRef}
          className="inline-flex items-center bg-neutral-900/70 backdrop-blur-md border border-white/10 rounded-xl p-0.5 shadow-lg max-w-full sm:max-w-[450px] md:max-w-[520px] lg:max-w-[600px]"
        >
          {/* Messages Segment */}
          <button
            onClick={() => onFilterChange('all')}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-xl',
              'text-sm font-medium transition-all duration-200',
              activeFilter === 'all' ? SEGMENT_COLORS.all.active : SEGMENT_COLORS.all.inactive,
            )}
            aria-pressed={activeFilter === 'all'}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
            {unreadCount > 0 && activeFilter !== 'all' && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gold-primary text-black font-semibold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Broadcasts Segment */}
          <button
            onClick={() => onFilterChange('broadcasts')}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-xl',
              'text-sm font-medium transition-all duration-200',
              activeFilter === 'broadcasts'
                ? SEGMENT_COLORS.broadcasts.active
                : SEGMENT_COLORS.broadcasts.inactive,
            )}
            aria-pressed={activeFilter === 'broadcasts'}
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcasts</span>
            {broadcastCount > 0 && activeFilter !== 'broadcasts' && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold',
                  SEGMENT_COLORS.broadcasts.badge,
                )}
              >
                {broadcastCount}
              </span>
            )}
          </button>

          {/* Channels Segment (Pro/Events only) - Always show but disable if no channels */}
          {isPro && (
            <Popover open={channelPopoverOpen} onOpenChange={setChannelPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => {
                    if (hasChannels) {
                      onFilterChange('channels');
                    }
                  }}
                  disabled={!hasChannels}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2 rounded-xl',
                    'text-sm font-medium transition-all duration-200',
                    !hasChannels && 'opacity-40 cursor-not-allowed',
                    activeFilter === 'channels' && hasChannels
                      ? SEGMENT_COLORS.channels.active
                      : SEGMENT_COLORS.channels.inactive,
                    !hasChannels && 'hover:bg-transparent',
                  )}
                  aria-pressed={activeFilter === 'channels'}
                  title={!hasChannels ? 'No role-based channels for this trip' : undefined}
                >
                  <Hash className="w-4 h-4" />
                  <span>
                    {activeChannel
                      ? activeChannel.channelName.toLowerCase().replace(/\s+/g, '-')
                      : 'Channels'}
                  </span>
                  {activeChannel && hasChannels && <ChevronDown className="w-3 h-3 opacity-70" />}
                </button>
              </PopoverTrigger>

              {/* Floating Channel Selector Dropdown */}
              {hasChannels && availableChannels.length > 0 && (
                <PopoverContent
                  side="bottom"
                  align="center"
                  className="channel-dropdown rounded-xl backdrop-blur-md bg-neutral-900 border border-white/10 shadow-lg p-2 mt-1 z-50 w-auto"
                  sideOffset={4}
                >
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    {/* All Messages option */}
                    <button
                      onClick={() => {
                        onChannelSelect?.(null);
                        onFilterChange('all');
                        setChannelPopoverOpen(false);
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                        !activeChannel
                          ? 'bg-gold-primary text-black shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/10',
                      )}
                    >
                      <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">All Messages</span>
                    </button>

                    <div className="h-px bg-white/10 my-1" />

                    {availableChannels
                      .sort((a, b) => a.channelName.localeCompare(b.channelName))
                      .map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => handleChannelSelect(channel)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                            activeChannel?.id === channel.id
                              ? SEGMENT_COLORS.channels.active
                              : 'text-white/70 hover:text-white hover:bg-white/10',
                          )}
                        >
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {channel.channelName.toLowerCase().replace(/\s+/g, '-')}
                          </span>
                          <span className="text-xs text-white/50 flex-shrink-0">
                            {channel.memberCount || 0}
                          </span>
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          )}

          {/* Search Pill */}
          <button
            onClick={onSearchClick}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-xl',
              'text-sm font-medium transition-all duration-200',
              SEGMENT_COLORS.search.inactive,
            )}
            title="Search messages and broadcasts"
          >
            <Search className="w-4 h-4" />
            {/* Hide label on very small screens to save space if needed, but keeping consistent for now */}
            <span className="hidden sm:inline">Search</span>
            <span className="sm:hidden">
              <Search className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

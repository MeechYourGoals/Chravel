import React from 'react';
import { MessageCircle, Megaphone, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatFilterTabsProps {
  activeFilter: 'all' | 'broadcasts' | 'channels';
  onFilterChange: (filter: 'all' | 'broadcasts' | 'channels') => void;
  hasChannels?: boolean;
  isPro?: boolean;
  broadcastCount?: number;
  unreadCount?: number;
}

export const ChatFilterTabs = ({
  activeFilter,
  onFilterChange,
  hasChannels = false,
  isPro = false,
  broadcastCount = 0,
  unreadCount = 0,
}: ChatFilterTabsProps) => {
  return (
    <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-lg px-4 py-3 rounded-t-2xl">
      {/* Centered Segmented Control Container */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center bg-neutral-900/70 backdrop-blur-md border border-white/10 rounded-lg p-0.5 shadow-lg">
          
          {/* All Messages Segment */}
          <button
            onClick={() => onFilterChange('all')}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeFilter === 'all'
                ? "bg-blue-600 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
            aria-pressed={activeFilter === 'all'}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>All Messages</span>
            {unreadCount > 0 && activeFilter !== 'all' && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white font-semibold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Broadcasts Segment */}
          <button
            onClick={() => onFilterChange('broadcasts')}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeFilter === 'broadcasts'
                ? "bg-orange-500 text-white shadow-md"
                : "text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10"
            )}
            aria-pressed={activeFilter === 'broadcasts'}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Broadcasts</span>
            {broadcastCount > 0 && activeFilter !== 'broadcasts' && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white font-semibold">
                {broadcastCount}
              </span>
            )}
          </button>

          {/* Channels Segment (Pro/Events only) */}
          {hasChannels && isPro && (
            <button
              onClick={() => onFilterChange('channels')}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeFilter === 'channels'
                  ? "bg-purple-500 text-white shadow-md"
                  : "text-purple-400/70 hover:text-purple-400 hover:bg-purple-500/10"
              )}
              aria-pressed={activeFilter === 'channels'}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Channels</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
    <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-lg border-b border-white/10 px-4 py-2">
      <div className="flex items-center gap-2">
        {/* All Messages */}
        <button
          onClick={() => onFilterChange('all')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            activeFilter === 'all'
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-transparent border border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5"
          )}
          aria-pressed={activeFilter === 'all'}
        >
          <MessageCircle className="w-4 h-4" />
          <span>All Messages</span>
          {unreadCount > 0 && activeFilter !== 'all' && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Broadcasts */}
        <button
          onClick={() => onFilterChange('broadcasts')}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            activeFilter === 'broadcasts'
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/60 shadow-lg"
              : "bg-transparent border border-orange-500/30 text-orange-400/70 hover:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/10"
          )}
          aria-pressed={activeFilter === 'broadcasts'}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcasts</span>
          {broadcastCount > 0 && activeFilter !== 'broadcasts' && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">
              {broadcastCount}
            </span>
          )}
        </button>

        {/* Channels (Pro/Events only) */}
        {hasChannels && isPro && (
          <button
            onClick={() => onFilterChange('channels')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              activeFilter === 'channels'
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/60 shadow-lg"
                : "bg-transparent border border-purple-500/30 text-purple-400/70 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/10"
            )}
            aria-pressed={activeFilter === 'channels'}
          >
            <Hash className="w-4 h-4" />
            <span>Channels</span>
          </button>
        )}
      </div>
    </div>
  );
};

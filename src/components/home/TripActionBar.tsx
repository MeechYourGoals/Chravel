import React from 'react';
import { Settings, Plus, Search } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { cn } from '@/lib/utils';

interface TripActionBarProps {
  onSettings: () => void;
  onCreateTrip: () => void;
  onSearch: () => void;
  className?: string;
}

export const TripActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch,
  className 
}: TripActionBarProps) => {
  console.log('🎯 TripActionBar RENDERING', { className });
  
  return (
    <div className={cn("", className)}>
      <div className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg">
        <div className="grid grid-cols-4 gap-0.5 items-center">
          {/* Settings - aligns above My Trips */}
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="mx-auto flex items-center justify-center rounded-xl p-3 text-white hover:bg-white/5 transition-colors"
          >
            <Settings size={18} />
          </button>

          {/* Notifications - aligns above Pro */}
          <div className="flex justify-center">
            <NotificationBell />
          </div>

          {/* New Trip - aligns above Events */}
          <button
            onClick={onCreateTrip}
            aria-label="Create New Trip"
            className="mx-auto flex items-center justify-center rounded-xl bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] hover:from-[hsl(45,95%,55%)] hover:to-[hsl(45,90%,62%)] text-black px-3 py-3 font-semibold shadow-lg shadow-primary/30 transition-all duration-300"
          >
            <Plus size={18} />
          </button>

          {/* Search - aligns above Recs */}
          <button
            onClick={onSearch}
            aria-label="Search"
            className="mx-auto flex items-center justify-center rounded-xl bg-background/40 border border-border/30 px-3 py-3 text-white hover:bg-background/60 hover:border-border/50 transition-colors"
          >
            <Search size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

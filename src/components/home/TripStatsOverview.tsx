import React from 'react';
import { Lock } from 'lucide-react';
import { StatsData } from '../../utils/tripStatsCalculator';
import { useSubscription } from '@/hooks/useSubscription';

interface TripStatsOverviewProps {
  stats: StatsData;
  viewMode: string;
  activeFilter?: string;
  onFilterClick: (filter: string) => void;
}

export const TripStatsOverview = ({ stats, viewMode, activeFilter, onFilterClick }: TripStatsOverviewProps) => {
  const { isPro } = useSubscription();

  const getLabel = () => {
    switch (viewMode) {
      case 'myTrips': return 'Trips';
      case 'tripsPro': return 'Pro Trips';
      case 'events': return 'Events';
      default: return 'Items';
    }
  };

  const label = getLabel();

  const getStatButtonClass = (filterType: string) => {
    const baseClass = "inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 px-3 py-2 rounded-full hover:bg-secondary/50";
    return activeFilter === filterType 
      ? `${baseClass} bg-secondary/80` 
      : baseClass;
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-full px-3 py-1.5 mb-4">
      <div className="flex items-center justify-evenly gap-1 flex-wrap">
        <button 
          onClick={() => onFilterClick('total')}
          className={getStatButtonClass('total')}
        >
          <span className="text-base font-bold text-foreground">{stats.total}</span>
          <span className="text-sm text-muted-foreground">Total</span>
        </button>
        
        <button 
          onClick={() => onFilterClick('upcoming')}
          className={getStatButtonClass('upcoming')}
        >
          <span className="text-base font-bold text-accent">{stats.upcoming}</span>
          <span className="text-sm text-muted-foreground">Upcoming</span>
        </button>
        
        <button 
          onClick={() => onFilterClick('completed')}
          className={getStatButtonClass('completed')}
        >
          <span className="text-base font-bold text-green-500">{stats.completed}</span>
          <span className="text-sm text-muted-foreground">Completed</span>
        </button>
        
        <button 
          onClick={() => onFilterClick('inProgress')}
          className={getStatButtonClass('inProgress')}
        >
          <span className="text-base font-bold text-blue-500 relative">
            {stats.inProgress}
            {stats.inProgress > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            )}
          </span>
          <span className="text-sm text-muted-foreground">Active</span>
        </button>

        {/* Archived Tab */}
        <button 
          onClick={() => onFilterClick('archived')}
          className={getStatButtonClass('archived')}
        >
          <span className="text-base font-bold text-amber-500 flex items-center gap-1">
            {stats.archived}
            {!isPro && stats.archived > 0 && (
              <Lock size={12} className="text-amber-400" />
            )}
          </span>
          <span className="text-sm text-muted-foreground">Archived</span>
        </button>
      </div>
    </div>
  );
};

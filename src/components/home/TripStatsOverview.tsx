
import React from 'react';
import { StatsData } from '../../utils/tripStatsCalculator';

interface TripStatsOverviewProps {
  stats: StatsData;
  viewMode: string;
  activeFilter?: string;
  onFilterClick: (filter: string) => void;
}

export const TripStatsOverview = ({ stats, viewMode, activeFilter, onFilterClick }: TripStatsOverviewProps) => {
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
    const baseClass = "text-center cursor-pointer transition-all duration-200 py-2 px-2 rounded-lg hover:bg-secondary/50";
    return activeFilter === filterType 
      ? `${baseClass} bg-secondary/80` 
      : baseClass;
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-3 mb-4">
      <div className="grid grid-cols-4 gap-4">
        <button 
          onClick={() => onFilterClick('total')}
          className={getStatButtonClass('total')}
        >
          <div className="text-2xl font-bold text-foreground mb-1">{stats.total}</div>
          <div className="text-muted-foreground text-sm">Total {label}</div>
          {activeFilter === 'total' && <div className="w-full h-0.5 bg-foreground/40 mt-1 rounded"></div>}
        </button>
        
        <button 
          onClick={() => onFilterClick('upcoming')}
          className={getStatButtonClass('upcoming')}
        >
          <div className="text-2xl font-bold text-accent mb-1">{stats.upcoming}</div>
          <div className="text-muted-foreground text-sm">Upcoming</div>
          {activeFilter === 'upcoming' && <div className="w-full h-0.5 bg-accent mt-1 rounded"></div>}
        </button>
        
        <button 
          onClick={() => onFilterClick('completed')}
          className={getStatButtonClass('completed')}
        >
          <div className="text-2xl font-bold text-green-500 mb-1">{stats.completed}</div>
          <div className="text-muted-foreground text-sm">Completed</div>
          {activeFilter === 'completed' && <div className="w-full h-0.5 bg-green-500 mt-1 rounded"></div>}
        </button>
        
        <button 
          onClick={() => onFilterClick('inProgress')}
          className={getStatButtonClass('inProgress')}
        >
          <div className="text-2xl font-bold text-blue-500 mb-1 relative">
            {stats.inProgress}
            {stats.inProgress > 0 && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="text-muted-foreground text-sm">In Progress</div>
          {activeFilter === 'inProgress' && <div className="w-full h-0.5 bg-blue-500 mt-1 rounded"></div>}
        </button>
      </div>
    </div>
  );
};

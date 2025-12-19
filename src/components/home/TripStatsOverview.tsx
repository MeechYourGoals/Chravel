import React from 'react';
import { StatsData } from '../../utils/tripStatsCalculator';

interface TripStatsOverviewProps {
  stats: StatsData;
  viewMode: string;
  activeFilter?: string;
  onFilterClick: (filter: string) => void;
}

export const TripStatsOverview = ({ stats, viewMode, activeFilter, onFilterClick }: TripStatsOverviewProps) => {
  const getStatButtonClass = (filterType: string) => {
    const baseClass = "inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-200 px-2 sm:px-3 py-1 sm:py-2 rounded-full hover:bg-secondary/50";
    return activeFilter === filterType 
      ? `${baseClass} bg-secondary/80` 
      : baseClass;
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl px-2 sm:px-3 py-2 sm:py-3 mb-2 sm:mb-4">
      {/* Row 1: Total, Upcoming, Completed */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          onClick={() => onFilterClick('total')}
          className={getStatButtonClass('total')}
        >
          <span className="text-sm sm:text-base font-bold text-foreground">{stats.total}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
        </button>

        <button
          onClick={() => onFilterClick('upcoming')}
          className={getStatButtonClass('upcoming')}
        >
          <span className="text-sm sm:text-base font-bold text-accent">{stats.upcoming}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">Upcoming</span>
        </button>

        <button
          onClick={() => onFilterClick('completed')}
          className={getStatButtonClass('completed')}
        >
          <span className="text-sm sm:text-base font-bold text-green-500">{stats.completed}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">Completed</span>
        </button>
      </div>

      {/* Row 2: Active and Requests - staggered between top row items */}
      <div className="flex items-center justify-center gap-8 sm:gap-16 mt-1">
        <button
          onClick={() => onFilterClick('inProgress')}
          className={getStatButtonClass('inProgress')}
        >
          <span className="text-sm sm:text-base font-bold text-blue-500 relative">
            {stats.inProgress}
            {stats.inProgress > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            )}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">Active</span>
        </button>

        <button
          onClick={() => onFilterClick('requests')}
          className={getStatButtonClass('requests')}
        >
          <span className="text-sm sm:text-base font-bold text-yellow-500 flex items-center gap-1">
            {stats.requests}
            {stats.requests > 0 && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            )}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">Requests</span>
        </button>
      </div>
    </div>
  );
};

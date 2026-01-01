import React from 'react';
import { StatsData } from '../../utils/tripStatsCalculator';

interface TripStatsOverviewProps {
  stats: StatsData;
  viewMode: string;
  activeFilter?: string;
  onFilterClick: (filter: string) => void;
}

export const TripStatsOverview = ({ stats, activeFilter, onFilterClick }: TripStatsOverviewProps) => {
  const getStatButtonClass = (filterType: string) => {
    const baseClass = "inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-200 px-2 sm:px-3 py-1 sm:py-2 rounded-full hover:bg-secondary/50";
    return activeFilter === filterType 
      ? `${baseClass} bg-secondary/80` 
      : baseClass;
  };

  const renderStatButton = (
    filterType: string, 
    value: number, 
    label: string, 
    colorClass: string, 
    showPulse?: boolean
  ) => (
    <button
      key={filterType}
      onClick={() => onFilterClick(filterType)}
      className={getStatButtonClass(filterType)}
    >
      <span className={`text-sm sm:text-base font-bold ${colorClass} ${showPulse ? 'relative' : ''}`}>
        {value}
        {showPulse && value > 0 && (
          <span className={`absolute -top-1 -right-2 w-2 h-2 rounded-full animate-pulse ${colorClass.includes('blue') ? 'bg-blue-500' : 'bg-yellow-500'}`} />
        )}
      </span>
      <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
    </button>
  );

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl px-2 sm:px-3 py-2 sm:py-3 mb-2 sm:mb-4">
      
      {/* MOBILE PORTRAIT ONLY: 2-row stacked layout */}
      <div className="flex flex-col tablet:hidden landscape:hidden">
        {/* Row 1: Total, Upcoming, Completed */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {renderStatButton('total', stats.total, 'Total', 'text-foreground')}
          {renderStatButton('upcoming', stats.upcoming, 'Upcoming', 'text-accent')}
          {renderStatButton('completed', stats.completed, 'Completed', 'text-green-500')}
        </div>
        {/* Row 2: Active, Requests */}
        <div className="flex items-center justify-center gap-8 mt-1">
          {renderStatButton('inProgress', stats.inProgress, 'Active', 'text-blue-500', true)}
          {renderStatButton('requests', stats.requests, 'Requests', 'text-yellow-500', true)}
        </div>
      </div>

      {/* TABLET/DESKTOP/LANDSCAPE: Single row layout */}
      <div className="hidden tablet:flex landscape:flex items-center justify-center gap-4 lg:gap-6">
        {renderStatButton('total', stats.total, 'Total', 'text-foreground')}
        {renderStatButton('upcoming', stats.upcoming, 'Upcoming', 'text-accent')}
        {renderStatButton('completed', stats.completed, 'Completed', 'text-green-500')}
        {renderStatButton('inProgress', stats.inProgress, 'Active', 'text-blue-500', true)}
        {renderStatButton('requests', stats.requests, 'Requests', 'text-yellow-500', true)}
      </div>

    </div>
  );
};

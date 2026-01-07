import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { StatsData } from '../../utils/tripStatsCalculator';
import * as Haptics from '../../native/haptics';

interface TripStatsOverviewProps {
  stats: StatsData;
  viewMode: string;
  activeFilter?: string;
  onFilterClick: (filter: string) => void;
}

export const TripStatsOverview = ({ stats, activeFilter, onFilterClick }: TripStatsOverviewProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandToggle = async () => {
    setIsExpanded(prev => !prev);
    await Haptics.light();
  };

  const getStatButtonClass = (filterType: string) => {
    const baseClass = "inline-flex items-center gap-1 cursor-pointer transition-all duration-200 px-2 py-1.5 rounded-full hover:bg-secondary/50";
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
      onClick={(e) => {
        e.stopPropagation();
        onFilterClick(filterType);
      }}
      className={getStatButtonClass(filterType)}
    >
      <span className={`text-sm font-bold ${colorClass} ${showPulse ? 'relative' : ''}`}>
        {value}
        {showPulse && value > 0 && (
          <span className={`absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full animate-pulse ${colorClass.includes('blue') ? 'bg-blue-500' : 'bg-yellow-500'}`} />
        )}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl px-3 py-2 mb-2 sm:mb-4 min-h-[48px] tablet:min-h-0">
      
      {/* MOBILE PORTRAIT ONLY: Collapsible single-line → expandable */}
      <div className="flex flex-col tablet:hidden landscape:hidden">
        
        {/* Collapsed row (always visible) - tap to expand */}
        <div 
          onClick={handleExpandToggle}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-1">
            {renderStatButton('total', stats.total, 'Total', 'text-foreground')}
            {renderStatButton('upcoming', stats.upcoming, 'Upcoming', 'text-accent')}
            {renderStatButton('inProgress', stats.inProgress, 'Active', 'text-blue-500', true)}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
        
        {/* Expandable row (hidden by default) */}
        <div 
          className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded ? 'max-h-12 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex items-center justify-center gap-6">
            {renderStatButton('completed', stats.completed, 'Completed', 'text-green-500')}
            {renderStatButton('requests', stats.requests, 'Requests', 'text-yellow-500', true)}
          </div>
        </div>
        
      </div>

      {/* TABLET/DESKTOP/LANDSCAPE: Single row layout (unchanged) */}
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

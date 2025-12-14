import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download, Grid3x3 } from 'lucide-react';
import { ViewMode } from '@/hooks/useCalendarManagement';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onToggleView: () => void;
  onAddEvent?: () => void;
  onExport?: () => void;
}

export const CalendarHeader = ({ viewMode, onToggleView, onAddEvent, onExport }: CalendarHeaderProps) => {
  const getViewButtonLabel = () => {
    switch (viewMode) {
      case 'grid':
        return 'Itinerary';
      case 'itinerary':
        return 'Day View';
      case 'calendar':
      default:
        return 'Month Grid';
    }
  };

  const getViewButtonIcon = () => {
    switch (viewMode) {
      case 'grid':
        return <List className="h-4 w-4" />;
      case 'itinerary':
        return <CalendarIcon className="h-4 w-4" />;
      case 'calendar':
      default:
        return <Grid3x3 className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-8 gap-2 mb-6 items-center">
      {/* Left: Group Calendar Title - spans first 5 columns */}
      <h2 className="col-span-5 text-2xl font-bold text-foreground">Group Calendar</h2>

      {/* Export button - column 6 (under Places) */}
      <Button 
        variant="outline" 
        onClick={onExport} 
        size="sm"
        className="col-span-1 w-full flex items-center justify-center gap-1.5"
        disabled={!onExport}
      >
        <Download className="h-4 w-4" />
        <span className="hidden lg:inline">Export</span>
      </Button>

      {/* View toggle button - column 7 (under Polls) */}
      <Button 
        variant="outline" 
        onClick={onToggleView} 
        size="sm"
        className="col-span-1 w-full flex items-center justify-center gap-1.5"
      >
        {getViewButtonIcon()}
        <span className="hidden lg:inline">{getViewButtonLabel()}</span>
      </Button>

      {/* Add Event button - column 8 (under Tasks) */}
      <Button 
        variant="outline" 
        onClick={onAddEvent} 
        size="sm"
        className="col-span-1 w-full flex items-center justify-center gap-1.5"
        disabled={!onAddEvent}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">Add Event</span>
      </Button>
    </div>
  );
};

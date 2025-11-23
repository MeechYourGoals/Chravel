import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download, Grid3x3 } from 'lucide-react';
import { ViewMode } from '@/hooks/useCalendarManagement';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onToggleView: () => void;
  onAddEvent: () => void;
  onExport?: () => void;
}

export const CalendarHeader = ({ viewMode, onToggleView, onAddEvent, onExport }: CalendarHeaderProps) => {
  const getViewButtonContent = () => {
    switch (viewMode) {
      case 'grid':
        return (
          <>
            <List className="mr-2 h-4 w-4" />
            Itinerary View
          </>
        );
      case 'itinerary':
        return (
          <>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Day View
          </>
        );
      case 'calendar':
      default:
        return (
          <>
            <Grid3x3 className="mr-2 h-4 w-4" />
            Month Grid
          </>
        );
    }
  };

  return (
    <>
      {/* Centered Heading */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Group Calendar</h2>
      </div>

      {/* Right-Aligned Controls */}
      <div className="flex items-center justify-end mb-6 gap-2">
        {onExport && (
          <Button variant="outline" onClick={onExport} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}

        <Button variant="outline" onClick={onToggleView} size="sm">
          {getViewButtonContent()}
        </Button>

        <Button onClick={onAddEvent} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>
    </>
  );
};

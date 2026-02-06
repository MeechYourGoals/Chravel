import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download, Upload, Grid3x3 } from 'lucide-react';
import { ViewMode } from '../hooks/useCalendarManagement';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onToggleView: () => void;
  onAddEvent?: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export const CalendarHeader = ({
  viewMode,
  onToggleView,
  onAddEvent,
  onExport,
  onImport,
}: CalendarHeaderProps) => {
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
    <div className="w-full flex justify-center mb-6">
      <div className="w-full max-w-7xl px-2">
        <div className="grid grid-cols-8 gap-2 items-center">
          {/* Left: Group Calendar Title - spans Chat, Calendar, Concierge, Media (first 4 columns) */}
          <div className="col-span-4 flex items-center">
            <h2 className="text-2xl font-bold text-foreground">Group Calendar</h2>
          </div>

          {/* Import button - aligned under Payments (column 5) */}
          <Button
            variant="outline"
            onClick={onImport}
            className="col-span-1 w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
            disabled={!onImport}
          >
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">Import</span>
          </Button>

          {/* Export button - aligned under Places (column 6) */}
          <Button
            variant="outline"
            onClick={onExport}
            className="col-span-1 w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
            disabled={!onExport}
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">Export</span>
          </Button>

          {/* View toggle button - aligned under Polls (column 7) */}
          <Button
            variant="outline"
            onClick={onToggleView}
            className="col-span-1 w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
          >
            {getViewButtonIcon()}
            <span className="hidden lg:inline whitespace-nowrap">{getViewButtonLabel()}</span>
          </Button>

          {/* Add Event button - aligned under Tasks (column 8) */}
          <Button
            variant="outline"
            onClick={onAddEvent}
            className="col-span-1 w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
            disabled={!onAddEvent}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">Add Event</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

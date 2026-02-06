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
    <div className="mb-6">
      <div className="grid grid-cols-8 gap-2 items-center">
        {/* Title occupying cols 1-4 (under Chat, Calendar, Concierge, Media) */}
        <div className="col-span-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Group Calendar</h2>
        </div>

        {/* Import button - col 5 (under Payments) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
          disabled={!onImport}
        >
          <Upload className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Import</span>
        </Button>

        {/* Export button - col 6 (under Places) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
          disabled={!onExport}
        >
          <Download className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Export</span>
        </Button>

        {/* View toggle button - col 7 (under Polls) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleView}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
        >
          {getViewButtonIcon()}
          <span className="hidden lg:inline whitespace-nowrap">{getViewButtonLabel()}</span>
        </Button>

        {/* Add Event button - col 8 (under Tasks) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddEvent}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm"
          disabled={!onAddEvent}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Add Event</span>
        </Button>
      </div>
    </div>
  );
};

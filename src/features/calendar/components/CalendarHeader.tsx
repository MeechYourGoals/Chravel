import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download, Upload, Grid3x3 } from 'lucide-react';
import { ViewMode } from '../hooks/useCalendarManagement';
import {
  PARITY_ACTION_BUTTON_CLASS,
  TRIP_PARITY_COL_START,
  TRIP_PARITY_ROW_CLASS,
} from '@/lib/tabParity';

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
      <div className={TRIP_PARITY_ROW_CLASS}>
        {/* Title occupying cols 1-4 (under Chat, Calendar, Concierge, Media) */}
        <div className="sm:col-span-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Group Calendar</h2>
        </div>

        {/* Import button - col 5 (under Payments) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className={`${TRIP_PARITY_COL_START.payments} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
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
          className={`${TRIP_PARITY_COL_START.places} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
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
          className={`${TRIP_PARITY_COL_START.polls} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
        >
          {getViewButtonIcon()}
          <span className="hidden lg:inline whitespace-nowrap">{getViewButtonLabel()}</span>
        </Button>

        {/* Add Event button - col 8 (under Tasks) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddEvent}
          className={`${TRIP_PARITY_COL_START.tasks} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
          disabled={!onAddEvent}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Add Event</span>
        </Button>
      </div>
    </div>
  );
};

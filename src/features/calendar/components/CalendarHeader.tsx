import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download, Upload, Grid3x3 } from 'lucide-react';
import { ViewMode } from '../hooks/useCalendarManagement';
import { useTripVariant } from '@/contexts/TripVariantContext';
import {
  PARITY_ACTION_BUTTON_CLASS,
  TRIP_PARITY_COL_START,
  TRIP_PARITY_ROW_CLASS,
  PRO_PARITY_ROW_CLASS,
  PRO_PARITY_COL_START,
  EVENT_PARITY_ROW_CLASS,
  EVENT_PARITY_COL_START,
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
  const { variant } = useTripVariant();

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

  // Select grid tokens based on variant
  const rowClass =
    variant === 'pro' ? PRO_PARITY_ROW_CLASS
    : variant === 'events' ? EVENT_PARITY_ROW_CLASS
    : TRIP_PARITY_ROW_CLASS;

  const titleSpan =
    variant === 'pro' ? 'md:col-span-5'
    : variant === 'events' ? 'md:col-span-3 sm:col-span-3'
    : 'sm:col-span-4';

  // Map buttons to the correct columns per variant
  const colImport =
    variant === 'pro' ? PRO_PARITY_COL_START.places
    : variant === 'events' ? EVENT_PARITY_COL_START.media
    : TRIP_PARITY_COL_START.payments;

  const colExport =
    variant === 'pro' ? PRO_PARITY_COL_START.polls
    : variant === 'events' ? EVENT_PARITY_COL_START.lineup
    : TRIP_PARITY_COL_START.places;

  const colViewToggle =
    variant === 'pro' ? PRO_PARITY_COL_START.tasks
    : variant === 'events' ? EVENT_PARITY_COL_START.polls
    : TRIP_PARITY_COL_START.polls;

  const colAddEvent =
    variant === 'pro' ? PRO_PARITY_COL_START.team
    : variant === 'events' ? EVENT_PARITY_COL_START.tasks
    : TRIP_PARITY_COL_START.tasks;

  return (
    <div className="mb-6">
      <div className={rowClass}>
        {/* Title */}
        <div className={titleSpan}>
          <h2 className="text-2xl font-bold text-foreground text-center">Group Calendar</h2>
        </div>

        {/* Import button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className={`${colImport} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
          disabled={!onImport}
        >
          <Upload className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Import</span>
        </Button>

        {/* Export button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className={`${colExport} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
          disabled={!onExport}
        >
          <Download className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Export</span>
        </Button>

        {/* View toggle button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleView}
          className={`${colViewToggle} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
        >
          {getViewButtonIcon()}
          <span className="hidden lg:inline whitespace-nowrap">{getViewButtonLabel()}</span>
        </Button>

        {/* Add Event button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddEvent}
          className={`${colAddEvent} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5`}
          disabled={!onAddEvent}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Add Event</span>
        </Button>
      </div>
    </div>
  );
};

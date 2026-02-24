import React from 'react';
import { Plus, Calendar as CalendarIcon, List, Download, Grid3x3 } from 'lucide-react';
import { ViewMode } from '../hooks/useCalendarManagement';
import { useTripVariant } from '@/contexts/TripVariantContext';
import { ActionPill } from '@/components/ui/ActionPill';
import {
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
    variant === 'pro'
      ? PRO_PARITY_ROW_CLASS
      : variant === 'events'
        ? EVENT_PARITY_ROW_CLASS
        : TRIP_PARITY_ROW_CLASS;

  const titleSpan =
    variant === 'pro' ? 'md:col-span-5' : variant === 'events' ? 'md:col-span-4' : 'sm:col-span-4';

  // Map buttons to the correct columns per variant
  const colImport =
    variant === 'pro'
      ? PRO_PARITY_COL_START.places
      : variant === 'events'
        ? EVENT_PARITY_COL_START.lineup
        : TRIP_PARITY_COL_START.payments;

  const colExport =
    variant === 'pro'
      ? PRO_PARITY_COL_START.polls
      : variant === 'events'
        ? EVENT_PARITY_COL_START.media
        : TRIP_PARITY_COL_START.places;

  const colViewToggle =
    variant === 'pro'
      ? PRO_PARITY_COL_START.tasks
      : variant === 'events'
        ? EVENT_PARITY_COL_START.polls
        : TRIP_PARITY_COL_START.polls;

  const colAddEvent =
    variant === 'pro'
      ? PRO_PARITY_COL_START.team
      : variant === 'events'
        ? EVENT_PARITY_COL_START.tasks
        : TRIP_PARITY_COL_START.tasks;

  return (
    <div className="mb-6">
      <div className={rowClass}>
        {/* Title */}
        <div className={titleSpan}>
          <h2 className="text-2xl font-bold text-foreground text-center">Group Calendar</h2>
        </div>

        {/* Import button — AI-assisted action */}
        <ActionPill
          variant="aiOutline"
          onClick={onImport}
          className={`${colImport} w-full`}
          disabled={!onImport}
        >
          <span className="hidden lg:inline whitespace-nowrap">Import</span>
        </ActionPill>

        {/* Export button — manual action */}
        <ActionPill
          variant="manualOutline"
          leftIcon={<Download />}
          onClick={onExport}
          className={`${colExport} w-full`}
          disabled={!onExport}
        >
          <span className="hidden lg:inline whitespace-nowrap">Export</span>
        </ActionPill>

        {/* View toggle button — manual action */}
        <ActionPill
          variant="manualOutline"
          leftIcon={getViewButtonIcon()}
          onClick={onToggleView}
          className={`${colViewToggle} w-full`}
        >
          <span className="hidden lg:inline whitespace-nowrap">{getViewButtonLabel()}</span>
        </ActionPill>

        {/* Add Event button — manual action */}
        <ActionPill
          variant="manualOutline"
          leftIcon={<Plus />}
          onClick={onAddEvent}
          className={`${colAddEvent} w-full`}
          disabled={!onAddEvent}
        >
          <span className="hidden lg:inline whitespace-nowrap">Add Event</span>
        </ActionPill>
      </div>
    </div>
  );
};

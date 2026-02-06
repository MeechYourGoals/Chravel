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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-center">
      {/* Match the main calendar layout: title aligns above left panel, actions align above right panel. */}
      <h2 className="text-2xl font-bold text-foreground">Group Calendar</h2>

      <div className="grid grid-cols-4 gap-2 md:justify-self-end w-full">
        <Button
          variant="outline"
          onClick={onImport}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5"
          disabled={!onImport}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden lg:inline">Import</span>
        </Button>

        <Button
          variant="outline"
          onClick={onExport}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5"
          disabled={!onExport}
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">Export</span>
        </Button>

        <Button
          variant="outline"
          onClick={onToggleView}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5"
        >
          {getViewButtonIcon()}
          <span className="hidden lg:inline">{getViewButtonLabel()}</span>
        </Button>

        <Button
          variant="outline"
          onClick={onAddEvent}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5"
          disabled={!onAddEvent}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden lg:inline">Add Event</span>
        </Button>
      </div>
    </div>
  );
};

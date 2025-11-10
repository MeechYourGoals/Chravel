import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, List, Download } from 'lucide-react';
import { ViewMode } from '@/hooks/useCalendarManagement';

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onToggleView: () => void;
  onAddEvent: () => void;
  onExport?: () => void;
}

export const CalendarHeader = ({ viewMode, onToggleView, onAddEvent, onExport }: CalendarHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-foreground">Group Calendar</h2>
      
      <div className="flex gap-2">
        {onExport && (
          <Button variant="outline" onClick={onExport} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
        
        <Button variant="outline" onClick={onToggleView}>
          {viewMode === 'calendar' ? (
            <>
              <List className="mr-2 h-4 w-4" />
              Itinerary View
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendar View
            </>
          )}
        </Button>
        
        <Button onClick={onAddEvent}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>
    </div>
  );
};

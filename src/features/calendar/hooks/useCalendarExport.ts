import { useCallback } from 'react';
import { calendarExporter } from '@/utils/calendarExport';
import { openOrDownloadBlob } from '@/utils/download';
import { toast } from 'sonner';
import type { TripEvent } from '@/services/calendarService';

export interface ExportEvent {
  id: string;
  title: string;
  date: Date;
  location?: string;
  description?: string;
}

/**
 * Shared hook for calendar export to ICS.
 * Used by both GroupCalendar (desktop) and MobileGroupCalendar.
 */
export function useCalendarExport(tripId: string) {
  const exportToICS = useCallback(
    async (events: ExportEvent[]) => {
      const exportEvents = events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date instanceof Date ? e.date : new Date(e.date),
        location: e.location || '',
        description: e.description || '',
      }));
      const icsContent = calendarExporter.exportToICS(exportEvents, `Trip_${tripId}`);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const filename = `Trip_${tripId}_calendar.ics`;
      try {
        await openOrDownloadBlob(blob, filename, { mimeType: 'text/calendar' });
        toast.success('Calendar exported');
      } catch (error) {
        console.error('Export failed:', error);
        toast.error('Failed to export calendar');
      }
    },
    [tripId],
  );

  const exportTripEvents = useCallback(
    (tripEvents: TripEvent[]) => {
      const exportEvents: ExportEvent[] = tripEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: new Date(e.start_time),
        location: e.location || undefined,
        description: e.description || undefined,
      }));
      return exportToICS(exportEvents);
    },
    [exportToICS],
  );

  return { exportToICS, exportTripEvents };
}

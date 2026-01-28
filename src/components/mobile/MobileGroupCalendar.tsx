import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  X,
  Pencil,
  Trash2,
  Download,
  Upload,
  Grid3x3,
} from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { CalendarSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { CreateEventModal } from './CreateEventModal';
import { ICSImportModal } from '@/features/calendar/components/ICSImportModal';
import { useCalendarEvents } from '@/features/calendar/hooks/useCalendarEvents';
import { toast } from 'sonner';
import { calendarExporter } from '../../utils/calendarExport';
import { openOrDownloadBlob } from '../../utils/download';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  location?: string;
  participants: number;
  color: string;
}

type CalendarViewMode = 'list' | 'grid';

interface MobileGroupCalendarProps {
  tripId: string;
  onExport?: () => void;
  onImport?: () => void;
  onToggleView?: () => void;
  viewMode?: CalendarViewMode;
}

// Color gradients for events
const EVENT_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-green-500 to-green-600',
  'from-yellow-500 to-yellow-600',
  'from-indigo-500 to-indigo-600',
  'from-red-500 to-red-600',
  'from-teal-500 to-teal-600',
];

export const MobileGroupCalendar = ({
  tripId,
  onExport,
  onImport,
  onToggleView,
  viewMode: externalViewMode,
}: MobileGroupCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  // Internal view mode state when no external handler provided
  const [internalViewMode, setInternalViewMode] = useState<CalendarViewMode>('list');

  // Use external view mode if provided, otherwise use internal state
  const currentViewMode = externalViewMode ?? internalViewMode;

  const handleToggleView = async () => {
    await hapticService.light();
    if (onToggleView) {
      onToggleView();
    } else {
      // Toggle internal view mode if no external handler
      setInternalViewMode(prev => (prev === 'list' ? 'grid' : 'list'));
    }
  };

  const handleImport = async () => {
    await hapticService.medium();
    if (onImport) {
      onImport();
    } else {
      setIsImportModalOpen(true);
    }
  };

  const handleImportComplete = async () => {
    await refreshEvents();
  };

  // Use the calendar events hook to fetch real events
  const {
    events: tripEvents,
    loading,
    refreshEvents,
    deleteEvent,
    updateEvent,
  } = useCalendarEvents(tripId);

  // Convert TripEvent[] to CalendarEvent[] format for UI
  const events = useMemo(() => {
    const calendarEvents = tripEvents.map((event, index) => {
      const calendarEvent = {
        id: event.id,
        title: event.title,
        date: new Date(event.start_time),
        time: new Date(event.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        location: event.location || undefined,
        participants: 0, // TODO: Get actual participant count
        color: EVENT_COLORS[index % EVENT_COLORS.length],
        // Keep original event data for editing
        originalEvent: event,
      };
      return calendarEvent;
    });
    return calendarEvents;
  }, [tripEvents]);

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await refreshEvents();
    },
  });

  const handleAddEvent = async () => {
    await hapticService.medium();
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = start.getDay(); // 0 = Sunday
    const totalDays = end.getDate();

    const days: Date[] = [];

    // Add padding days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }

    // Add all days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    // Add padding days for next month to complete grid (6 weeks max)
    while (days.length < 42) {
      const lastDate = days[days.length - 1];
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      days.push(nextDate);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handlePreviousMonth = async () => {
    await hapticService.light();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = async () => {
    await hapticService.light();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = async (date: Date) => {
    await hapticService.light();
    setSelectedDate(date);
  };

  const eventsForSelectedDate = events.filter(event => isSameDay(event.date, selectedDate));

  // Handle event click to show details
  const handleEventClick = useCallback(async (event: CalendarEvent & { originalEvent?: any }) => {
    await hapticService.medium();
    setSelectedEvent(event);
  }, []);

  // Handle event deletion
  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!eventId) return;

      setIsDeleting(true);
      try {
        await hapticService.medium();
        const success = await deleteEvent(eventId);
        if (success) {
          toast.success('Event deleted');
          setSelectedEvent(null);
          await refreshEvents();
        } else {
          toast.error('Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteEvent, refreshEvents],
  );

  // Handle event edit
  const handleEditEvent = useCallback(
    async (event: CalendarEvent & { originalEvent?: any }) => {
      await hapticService.medium();
      setSelectedEvent(null);
      // Use originalEvent if available, otherwise construct from CalendarEvent
      const eventToEdit = event.originalEvent || {
        id: event.id,
        title: event.title,
        start_time: event.date.toISOString(),
        location: event.location,
        trip_id: tripId,
      };
      setEditingEvent(eventToEdit);
      setIsModalOpen(true);
    },
    [tripId],
  );

  // Close event detail drawer
  const handleCloseEventDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black relative">
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {loading ? (
        <div className="px-4 py-4">
          <CalendarSkeleton />
        </div>
      ) : (
        <>
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <h3 className="text-lg font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>

          {/* DAY VIEW (list mode): Events at TOP, compact calendar at BOTTOM */}
          {currentViewMode === 'list' && (
            <>
              {/* Day Header + Events List - NOW AT TOP */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  <button
                    onClick={handleAddEvent}
                    className="p-2 bg-blue-600 rounded-lg active:scale-95 transition-transform"
                  >
                    <Plus size={18} className="text-white" />
                  </button>
                </div>

                <div className="space-y-3">
                  {eventsForSelectedDate.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock size={40} className="text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No events scheduled</p>
                      <button
                        onClick={handleAddEvent}
                        className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                      >
                        Add an event
                      </button>
                    </div>
                  ) : (
                    eventsForSelectedDate.map(event => (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full bg-white/10 rounded-xl p-4 active:scale-98 transition-transform relative"
                      >
                        <div
                          className={`w-1 h-full absolute left-0 top-0 rounded-l-xl bg-gradient-to-b ${event.color}`}
                        />
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-semibold text-left">{event.title}</h4>
                          <span className="text-sm text-gray-400">{event.time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                            <MapPin size={14} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Users size={14} />
                          <span>{event.participants} attending</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons - Middle section */}
              <div className="flex justify-center gap-2 px-4 py-2 border-y border-white/10 bg-black/50">
                <button
                  onClick={handleImport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-gray-300 transition-colors active:scale-95"
                >
                  <Upload size={14} />
                  <span>Import</span>
                </button>
                <button
                  onClick={async () => {
                    await hapticService.light();
                    if (onExport) {
                      onExport();
                    } else {
                      const exportEvents = events.map(e => ({
                        id: e.id,
                        title: e.title,
                        date: e.date instanceof Date ? e.date : new Date(e.date),
                        location: e.location || '',
                        description: e.originalEvent?.description || '',
                      }));
                      const icsContent = calendarExporter.exportToICS(
                        exportEvents,
                        `Trip_${tripId}`,
                      );
                      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                      const filename = `Trip_${tripId}_calendar.ics`;
                      try {
                        await openOrDownloadBlob(blob, filename, { mimeType: 'text/calendar' });
                        toast.success('Calendar exported');
                      } catch (error) {
                        console.error('Export failed:', error);
                        toast.error('Failed to export calendar');
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-gray-300 transition-colors active:scale-95"
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
                <button
                  onClick={handleToggleView}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-gray-300 transition-colors active:scale-95"
                >
                  <Grid3x3 size={14} />
                  <span>Month Grid</span>
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-gray-300 transition-colors active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>

              {/* Compact Mini Calendar - NOW AT BOTTOM */}
              <div className="px-4 py-2 border-t border-white/10 bg-black/30">
                {/* Compact Month Navigation */}
                <div className="flex items-center justify-between py-1.5 mb-1">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-1.5 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
                  >
                    <ChevronLeft size={16} className="text-gray-400" />
                  </button>
                  <span className="text-sm font-medium text-gray-300">
                    {format(currentMonth, 'MMM yyyy')}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white/10 rounded-lg active:scale-95 transition-all"
                  >
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* Compact Weekday Headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {weekDays.map(day => (
                    <div
                      key={`compact-${day}`}
                      className="text-center text-[10px] font-medium text-gray-500 py-0.5"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Compact Calendar Days - 5 rows max */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.slice(0, 35).map((date, index) => {
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const hasEvents = events.some(e => isSameDay(e.date, date));

                    return (
                      <button
                        key={`compact-day-${index}`}
                        onClick={() => handleDateSelect(date)}
                        className={`
                          h-7 rounded flex items-center justify-center text-xs relative
                          transition-all duration-150 active:scale-95
                          ${isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}
                          ${
                            isSelected
                              ? 'bg-blue-500 text-white font-medium'
                              : isToday
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'hover:bg-white/10'
                          }
                        `}
                      >
                        {format(date, 'd')}
                        {hasEvents && !isSelected && (
                          <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* MONTH GRID VIEW: Full calendar grid with inline events */}
          {currentViewMode === 'grid' && (
            <>
              {/* Action Buttons for Month Grid */}
              <div className="flex justify-center gap-2 px-4 py-3 border-b border-white/10">
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-300 transition-colors active:scale-95"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </button>
                <button
                  onClick={async () => {
                    await hapticService.light();
                    if (onExport) {
                      onExport();
                    } else {
                      const exportEvents = events.map(e => ({
                        id: e.id,
                        title: e.title,
                        date: e.date instanceof Date ? e.date : new Date(e.date),
                        location: e.location || '',
                        description: e.originalEvent?.description || '',
                      }));
                      const icsContent = calendarExporter.exportToICS(
                        exportEvents,
                        `Trip_${tripId}`,
                      );
                      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                      const filename = `Trip_${tripId}_calendar.ics`;
                      try {
                        await openOrDownloadBlob(blob, filename, { mimeType: 'text/calendar' });
                        toast.success('Calendar exported');
                      } catch (error) {
                        console.error('Export failed:', error);
                        toast.error('Failed to export calendar');
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-300 transition-colors active:scale-95"
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
                <button
                  onClick={handleToggleView}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-300 transition-colors active:scale-95"
                >
                  <Grid3x3 size={16} />
                  <span>Day View</span>
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-gray-300 transition-colors active:scale-95"
                >
                  <Plus size={16} />
                  <span>Add Event</span>
                </button>
              </div>

              {/* Full Month Grid with Events */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-7 gap-1">
                  {/* Weekday Headers */}
                  {weekDays.map(day => (
                    <div
                      key={`grid-${day}`}
                      className="text-center text-xs font-medium text-gray-500 py-2 border-b border-white/10"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days with Events */}
                  {calendarDays.map((date, index) => {
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const isToday = isSameDay(date, new Date());
                    const dayEvents = events.filter(e => isSameDay(e.date, date));

                    return (
                      <div
                        key={`grid-day-${index}`}
                        className={`
                          min-h-[80px] p-1 border-b border-r border-white/5 
                          ${isCurrentMonth ? 'bg-black' : 'bg-black/50'}
                        `}
                      >
                        <div
                          className={`
                          text-xs font-medium mb-1 px-1
                          ${isToday ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-gray-600'}
                        `}
                        >
                          {format(date, 'd')}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(event => (
                            <button
                              key={event.id}
                              onClick={() => handleEventClick(event)}
                              className={`w-full text-left truncate text-[10px] px-1 py-0.5 rounded bg-gradient-to-r ${event.color} text-white`}
                            >
                              {event.title}
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-400 px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        selectedDate={selectedDate}
        tripId={tripId}
        editEvent={editingEvent}
        onEventCreated={async () => {
          // Refresh events after creation to get the latest data
          await refreshEvents();
        }}
        onEventUpdated={async () => {
          // Refresh events after update to get the latest data
          await refreshEvents();
        }}
      />

      {/* ICS Import Modal */}
      <ICSImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tripId={tripId}
        existingEvents={tripEvents}
        onImportComplete={handleImportComplete}
      />

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseEventDetail}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-md bg-gray-900 border-t border-white/10 rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-1">{selectedEvent.title}</h2>
                <p className="text-sm text-gray-400">
                  {format(selectedEvent.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={handleCloseEventDetail}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Event Details */}
            <div className="px-6 pb-6 space-y-4">
              {/* Time */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Time</p>
                  <p className="text-white font-medium">{selectedEvent.time}</p>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white font-medium">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {/* Participants */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Attending</p>
                  <p className="text-white font-medium">{selectedEvent.participants} people</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-8 flex gap-3">
              <button
                onClick={() =>
                  handleEditEvent(selectedEvent as CalendarEvent & { originalEvent?: any })
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl transition-colors"
              >
                <Pencil size={18} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

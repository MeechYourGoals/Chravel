import React, { useState, useCallback } from 'react';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ItineraryView } from './ItineraryView';
import { useCalendarManagement } from '@/features/calendar/hooks/useCalendarManagement';
import { useQueryClient } from '@tanstack/react-query';
import { tripKeys } from '@/lib/queryKeys';
import { CalendarHeader } from '@/features/calendar/components/CalendarHeader';
import { CalendarGrid } from '@/features/calendar/components/CalendarGrid';
import { AddEventModal } from '@/features/calendar/components/AddEventModal';
import { EventList } from '@/features/calendar/components/EventList';
import { CalendarImportModal } from '@/features/calendar/components/CalendarImportModal';
import { useCalendarExport } from '@/features/calendar/hooks/useCalendarExport';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBackgroundImport } from '@/features/calendar/hooks/useBackgroundImport';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { hasPaidAccess } from '@/utils/paidAccess';
import type { CalendarEvent } from '@/types/calendar';
import { CalendarErrorState } from '@/features/calendar/components/CalendarErrorState';

interface GroupCalendarProps {
  tripId: string;
}

export const GroupCalendar = React.memo(({ tripId }: GroupCalendarProps) => {
  const queryClient = useQueryClient();
  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    tripEvents,
    showAddEvent,
    setShowAddEvent,
    editingEvent,
    setEditingEvent,
    viewMode,
    toggleViewMode,
    newEvent,
    updateEventField,
    getEventsForDate,
    handleAddEvent,
    updateEvent,
    deleteEvent,
    resetForm,
    isLoading,
    isFetching,
    isSaving,
    isError,
    error,
    refreshEvents,
  } = useCalendarManagement(tripId);
  const { toast } = useToast();
  const { canPerformAction, isLoading: permissionsLoading } = useRolePermissions(tripId);
  const { tier, subscription, isSuperAdmin } = useConsumerSubscription();
  // Demo mode available for future conditional rendering
  const { isDemoMode: _isDemoMode } = useDemoMode();
  const canUseSmartImport = hasPaidAccess({ tier, status: subscription?.status, isSuperAdmin });

  // Background URL import
  const {
    pendingResult: backgroundPendingResult,
    startImport: startBackgroundImport,
    clearResult: clearBackgroundResult,
  } = useBackgroundImport();

  // Shared ICS export
  const { exportTripEvents } = useCalendarExport(tripId);

  // ICS Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  // Callback for background import: opens the modal with results when the toast action is clicked
  const handleBackgroundImportComplete = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleStartBackgroundImport = useCallback(
    (url: string) => {
      startBackgroundImport(url, handleBackgroundImportComplete);
    },
    [startBackgroundImport, handleBackgroundImportComplete],
  );

  const handleImport = useCallback(() => {
    // Allow action optimistically while permissions are still loading
    if (!permissionsLoading && !canPerformAction('calendar', 'can_edit_events')) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to import events',
        variant: 'destructive',
      });
      return;
    }

    if (!canUseSmartImport) {
      toast({
        title: 'Upgrade required',
        description:
          'Smart Import is available on paid plans (Explorer+ / Trip Pass / Pro / Enterprise).',
        variant: 'destructive',
      });
      return;
    }
    setShowImportModal(true);
  }, [canPerformAction, canUseSmartImport, permissionsLoading, toast]);

  const handleImportComplete = useCallback(async () => {
    // Wait for queries to settle before attempting a refetch
    await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId) });
    await queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
    await refreshEvents();
  }, [queryClient, refreshEvents, tripId]);

  const handleEdit = (event: CalendarEvent) => {
    // Check permissions (will return true in Demo Mode)
    if (!canPerformAction('calendar', 'can_edit_events')) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to edit events',
        variant: 'destructive',
      });
      return;
    }
    setEditingEvent(event);
    setShowAddEvent(true);
    // Populate form with event data
    updateEventField('title', event.title);
    updateEventField('time', event.time);
    updateEventField('location', event.location || '');
    updateEventField('description', event.description || '');
    updateEventField('category', event.event_category || 'other');
    updateEventField('include_in_itinerary', event.include_in_itinerary ?? true);
  };

  const handleFormSubmit = async () => {
    if (editingEvent) {
      // Update existing event - updateEvent handles success/error toasts and state cleanup
      const success = await updateEvent(editingEvent.id, newEvent);
      // Only reset form on success - updateEvent already handles setEditingEvent and setShowAddEvent
      if (success) {
        resetForm();
      }
      // On failure, modal stays open so user can retry
    } else {
      // Create new event
      await handleAddEvent();
    }
  };

  const handleFormCancel = () => {
    setEditingEvent(null);
    resetForm();
  };

  const handleExport = async () => {
    try {
      await exportTripEvents(tripEvents);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to export calendar:', error);
      }
      toast({
        title: 'Export failed',
        description: 'Unable to export calendar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const datesWithEvents = events.map(event => event.date);

  if (!tripId) {
    return (
      <div className="p-6">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 text-center text-muted-foreground">
          Trip calendar is unavailable without a valid trip.
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="p-6">
        <CalendarHeader
          viewMode={viewMode}
          onToggleView={toggleViewMode}
          onAddEvent={() => setShowAddEvent(!showAddEvent)}
          onExport={handleExport}
          onImport={handleImport}
        />

        {isError ? (
          <CalendarErrorState
            error={error instanceof Error ? error : error ? new Error(String(error)) : undefined}
            onRetry={refreshEvents}
            isRetrying={isFetching}
          />
        ) : isLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading calendar">
            {/* Calendar skeleton */}
            <div className="bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                <div className="h-6 w-36 rounded bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
              </div>
              <div className="grid grid-cols-7 border-b border-border">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="p-2 flex justify-center">
                    <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-border"
                  >
                    <div className="h-4 w-4 rounded bg-muted animate-pulse mb-2" />
                    {i % 5 === 0 && <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CalendarIcon className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No events scheduled</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Your trip calendar is empty. Add events to start building your itinerary.
            </p>
          </div>
        ) : (
          <CalendarGrid
            events={events}
            selectedDate={selectedDate || new Date()}
            onSelectDate={setSelectedDate}
            onAddEvent={date => {
              setSelectedDate(date);
              setShowAddEvent(true);
            }}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}

        {/* Event Modal */}
        <AddEventModal
          open={showAddEvent}
          onClose={() => {
            setShowAddEvent(false);
            setEditingEvent(null);
            resetForm();
          }}
          newEvent={newEvent}
          onUpdateField={updateEventField}
          onSubmit={handleFormSubmit}
          isSubmitting={isSaving}
          isEditing={!!editingEvent}
          selectedDate={selectedDate}
        />

        {/* ICS Import Modal */}
        <CalendarImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tripId={tripId}
          existingEvents={tripEvents}
          onImportComplete={handleImportComplete}
          pendingResult={backgroundPendingResult}
          onClearPendingResult={clearBackgroundResult}
          onStartBackgroundImport={handleStartBackgroundImport}
        />
      </div>
    );
  }

  if (viewMode === 'itinerary') {
    return (
      <div className="p-6">
        <CalendarHeader
          viewMode={viewMode}
          onToggleView={toggleViewMode}
          onAddEvent={() => setShowAddEvent(!showAddEvent)}
          onExport={handleExport}
          onImport={handleImport}
        />
        {isError ? (
          <CalendarErrorState
            error={error instanceof Error ? error : error ? new Error(String(error)) : undefined}
            onRetry={refreshEvents}
            isRetrying={isFetching}
          />
        ) : (
          <ItineraryView events={events} tripName="Trip Itinerary" />
        )}

        {/* ICS Import Modal */}
        <CalendarImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tripId={tripId}
          existingEvents={tripEvents}
          onImportComplete={handleImportComplete}
          pendingResult={backgroundPendingResult}
          onClearPendingResult={clearBackgroundResult}
          onStartBackgroundImport={handleStartBackgroundImport}
        />
      </div>
    );
  }

  return (
    <div className="px-0 py-6">
      <CalendarHeader
        viewMode={viewMode}
        onToggleView={toggleViewMode}
        onAddEvent={() => setShowAddEvent(!showAddEvent)}
        onExport={handleExport}
        onImport={handleImport}
      />

      {isError ? (
        <CalendarErrorState
          error={error instanceof Error ? error : error ? new Error(String(error)) : undefined}
          onRetry={refreshEvents}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-[420px]"
          aria-busy="true"
          aria-label="Loading calendar"
        >
          {/* Calendar skeleton */}
          <div className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-4 flex flex-col gap-3 h-full shadow-enterprise-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-5 rounded bg-white/10 animate-pulse" />
              <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
              <div className="h-5 w-5 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          {/* Event list skeleton */}
          <div className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-4 flex flex-col h-full shadow-enterprise-lg">
            <div className="h-5 w-48 rounded bg-white/10 animate-pulse mb-4" />
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-[420px]">
          <div className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-2 flex items-center h-full shadow-enterprise-lg">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              modifiers={{
                hasEvents: datesWithEvents,
              }}
              modifiersStyles={{
                hasEvents: {
                  backgroundColor: 'rgba(196, 151, 70, 0.3)',
                  color: '#feeaa5',
                  fontWeight: 'bold',
                },
              }}
            />
          </div>

          <div className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-4 flex flex-col h-full shadow-enterprise-lg">
            <h3 className="text-white font-medium mb-3">
              {selectedDate
                ? `Events for ${format(selectedDate, 'EEEE, MMM d')}`
                : 'Select a date to view events'}
            </h3>

            <div className="flex-1 overflow-y-auto">
              {selectedDateEvents.length > 0 ? (
                <EventList
                  events={selectedDateEvents}
                  onEdit={handleEdit}
                  onDelete={deleteEvent}
                  emptyMessage=""
                  isDeleting={isSaving}
                />
              ) : (
                <p className="text-gray-400 text-sm mt-6 text-center">
                  {selectedDate
                    ? 'No events scheduled for this day.'
                    : 'Select a date to view events.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      <AddEventModal
        open={showAddEvent}
        onClose={handleFormCancel}
        newEvent={newEvent}
        onUpdateField={updateEventField}
        onSubmit={handleFormSubmit}
        isSubmitting={isSaving}
        isEditing={!!editingEvent}
        selectedDate={selectedDate}
      />

      {/* ICS Import Modal */}
      <CalendarImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tripId={tripId}
        existingEvents={tripEvents}
        onImportComplete={handleImportComplete}
        pendingResult={backgroundPendingResult}
        onClearPendingResult={clearBackgroundResult}
        onStartBackgroundImport={handleStartBackgroundImport}
      />
    </div>
  );
});

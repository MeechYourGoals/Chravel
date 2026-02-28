import React, { useState, useCallback } from 'react';
import { Calendar } from './ui/calendar';
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
import { exportTripEventsToICal } from '@/services/calendarSync';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBackgroundImport } from '@/features/calendar/hooks/useBackgroundImport';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { hasPaidAccess } from '@/utils/paidAccess';
import type { CalendarEvent } from '@/types/calendar';
import { CalendarErrorState } from '@/features/calendar/components/CalendarErrorState';
import { CalendarEmptyState } from '@/features/calendar/components/CalendarEmptyState';

interface GroupCalendarProps {
  tripId: string;
}

export const GroupCalendar = ({ tripId }: GroupCalendarProps) => {
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
  } = useBackgroundImport(tripId);

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
    // Invalidate cache before refetch to ensure we pull the latest events
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
      await exportTripEventsToICal(tripId, 'Trip Calendar');
      toast({
        title: 'Calendar exported',
        description: 'Your calendar has been downloaded as an .ics file.',
      });
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
          />
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
        />
      ) : isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-[420px]">
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-2 flex items-center h-full">
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
                  backgroundColor: 'hsl(var(--primary) / 0.3)',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                },
              }}
            />
          </div>

          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 flex flex-col h-full">
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
};

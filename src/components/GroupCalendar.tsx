import React, { useState, useCallback } from 'react';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { ItineraryView } from './ItineraryView';
import { useCalendarManagement } from '@/features/calendar/hooks/useCalendarManagement';
import { CalendarHeader } from '@/features/calendar/components/CalendarHeader';
import { CalendarGrid } from '@/features/calendar/components/CalendarGrid';
import { AddEventModal } from '@/features/calendar/components/AddEventModal';
import { EventList } from '@/features/calendar/components/EventList';
import { ICSImportModal } from '@/features/calendar/components/ICSImportModal';
import { exportTripEventsToICal } from '@/services/calendarSync';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useDemoMode } from '@/hooks/useDemoMode';

interface GroupCalendarProps {
  tripId: string;
}

export const GroupCalendar = ({ tripId }: GroupCalendarProps) => {
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
    refreshEvents,
  } = useCalendarManagement(tripId);
  const { toast } = useToast();
  const { canPerformAction } = useRolePermissions(tripId);
  // Demo mode available for future conditional rendering
  const { isDemoMode: _isDemoMode } = useDemoMode();

  // ICS Import modal state
  const [showImportModal, setShowImportModal] = useState(false);

  const handleImport = useCallback(() => {
    // Check permissions (will return true in Demo Mode)
    if (!canPerformAction('calendar', 'can_edit_events')) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to import events',
        variant: 'destructive',
      });
      return;
    }
    setShowImportModal(true);
  }, [canPerformAction, toast]);

  const handleImportComplete = useCallback(async () => {
    // Refresh events after import
    await refreshEvents();
  }, [refreshEvents]);

  const handleEdit = (event: any) => {
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

        {isLoading ? (
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
        <ICSImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tripId={tripId}
          existingEvents={tripEvents}
          onImportComplete={handleImportComplete}
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
        <ItineraryView events={events} tripName="Trip Itinerary" />

        {/* ICS Import Modal */}
        <ICSImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tripId={tripId}
          existingEvents={tripEvents}
          onImportComplete={handleImportComplete}
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

      {isLoading ? (
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
      <ICSImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tripId={tripId}
        existingEvents={tripEvents}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

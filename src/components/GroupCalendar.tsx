import React from 'react';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { ItineraryView } from './ItineraryView';
import { useCalendarManagement } from '@/hooks/useCalendarManagement';
import { CalendarHeader } from './calendar/CalendarHeader';
import { AddEventModal } from './calendar/AddEventModal';
import { EventList } from './calendar/EventList';

interface GroupCalendarProps {
  tripId: string;
}

export const GroupCalendar = ({ tripId }: GroupCalendarProps) => {
  const {
    selectedDate,
    setSelectedDate,
    events,
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
    isSaving
  } = useCalendarManagement(tripId);

  const handleEdit = (event: any) => {
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
      // Update existing event
      await updateEvent(editingEvent.id, newEvent);
      setEditingEvent(null);
      resetForm();
    } else {
      // Create new event
      await handleAddEvent();
    }
  };

  const handleFormCancel = () => {
    setEditingEvent(null);
    resetForm();
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

  if (viewMode === 'itinerary') {
    return (
      <div className="p-6">
        <CalendarHeader
          viewMode={viewMode}
          onToggleView={toggleViewMode}
          onAddEvent={() => setShowAddEvent(!showAddEvent)}
        />
        <ItineraryView events={events} tripName="Trip Itinerary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <CalendarHeader
        viewMode={viewMode}
        onToggleView={toggleViewMode}
        onAddEvent={() => setShowAddEvent(!showAddEvent)}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[420px]">
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-2 flex items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              modifiers={{
                hasEvents: datesWithEvents
              }}
              modifiersStyles={{
                hasEvents: {
                  backgroundColor: 'hsl(var(--primary) / 0.3)',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold'
                }
              }}
            />
          </div>

          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 flex flex-col">
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
    </div>
  );
};

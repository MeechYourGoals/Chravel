import React, { useState } from 'react';
import { Calendar } from './ui/calendar';
import { TripMember, CategoryAssignment } from '../pages/ItineraryAssignmentPage';
import { CategoryEventForms } from './CategoryEventForms';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';
import { CalendarEvent } from '../types/calendar';
import { mapCategoryToEventType } from '@/utils/categoryMapper';
import { CategoryFilters } from './calendar/CategoryFilters';
import { QuickAddButtons } from './calendar/QuickAddButtons';
import { CategoryEventList } from './calendar/CategoryEventList';
import { toast } from 'sonner';

interface CollaborativeItineraryCalendarProps {
  tripMembers: TripMember[];
  assignments: CategoryAssignment[];
  tripId: string;
}

export const CollaborativeItineraryCalendar = ({ tripMembers, assignments, tripId }: CollaborativeItineraryCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  const { createEventFromCalendar, getCalendarEvents } = useCalendarEvents(tripId);
  const {
    categories,
    filterCategory,
    setFilterCategory,
    selectedCategory,
    setSelectedCategory,
    selectCategory,
    getCategoryInfo,
    filterEventsByCategory
  } = useCategoryManagement(assignments, tripMembers);
  
  const calendarEvents = getCalendarEvents();

  const getEventsForDate = (date: Date) => {
    const dateEvents = calendarEvents.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
    return filterEventsByCategory(dateEvents);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const handleAddEvent = async (eventData: any) => {
    if (!selectedDate || !selectedCategory) return;

    const calendarEvent: CalendarEvent = {
      id: '',
      title: eventData.title,
      date: selectedDate,
      time: eventData.time,
      location: eventData.location,
      description: eventData.description,
      createdBy: '',
      include_in_itinerary: true,
      event_category: mapCategoryToEventType(selectedCategory || 'other'),
      source_type: 'manual',
      source_data: {}
    };

    try {
      const newEvent = await createEventFromCalendar(calendarEvent);
      if (newEvent) {
        toast.success('Event added successfully!');
        setShowAddEvent(false);
        selectCategory(null);
      } else {
        toast.error('Failed to add event. Please try again.');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event. Please try again.');
    }
  };

  const datesWithEvents = calendarEvents.map(event => event.date);

  return (
    <div className="space-y-6">
      <CategoryFilters
        categories={categories}
        selectedFilter={filterCategory}
        onFilterChange={setFilterCategory}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 flex justify-center items-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="max-w-sm"
            modifiers={{
              hasEvents: datesWithEvents
            }}
            modifiersStyles={{
              hasEvents: {
                backgroundColor: 'rgb(59 130 246 / 0.3)',
                color: 'white',
                fontWeight: 'bold'
              }
            }}
          />
        </div>

        {/* Events and Add Event - Single Card */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 flex flex-col h-full">
          <QuickAddButtons
            categories={categories}
            onSelectCategory={(categoryId) => {
              selectCategory(categoryId);
              setShowAddEvent(true);
            }}
          />

          <div className="flex-1 mt-4">
            <CategoryEventList
              events={selectedDateEvents}
              selectedDate={selectedDate}
              assignments={assignments}
              getCategoryInfo={getCategoryInfo}
            />
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEvent && selectedCategory && (
        <CategoryEventForms
          category={categories.find(c => c.id === selectedCategory)!}
          isOpen={showAddEvent}
          onClose={() => {
            setShowAddEvent(false);
            setSelectedCategory(null);
          }}
          onSubmit={handleAddEvent}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

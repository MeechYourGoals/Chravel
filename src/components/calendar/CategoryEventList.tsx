import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { CategoryEventItem } from './CategoryEventItem';
import { format } from 'date-fns';
import { CategoryAssignment } from '@/pages/ItineraryAssignmentPage';

interface CategoryEventListProps {
  events: CalendarEvent[];
  selectedDate: Date | undefined;
  assignments: CategoryAssignment[];
  getCategoryInfo: (categoryId: string) => { id: string; name: string; icon: string; color: string } | undefined;
}

export const CategoryEventList = ({ events, selectedDate, assignments, getCategoryInfo }: CategoryEventListProps) => {
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {selectedDate 
          ? `Events for ${format(selectedDate, 'EEEE, MMM d')}`
          : 'Select a date to view events'
        }
      </h3>
      
      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <CategoryEventItem
              key={event.id}
              event={event}
              categoryInfo={getCategoryInfo(event.event_category)}
              assignment={assignments.find(a => a.categoryId === event.event_category)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-muted-foreground text-sm">
            {selectedDate 
              ? 'No events scheduled for this day'
              : 'Select a date to view events'
            }
          </div>
        </div>
      )}
    </div>
  );
};

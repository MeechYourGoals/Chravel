import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Clock, MapPin, User } from 'lucide-react';
import { CategoryAssignment } from '@/pages/ItineraryAssignmentPage';

interface CategoryEventItemProps {
  event: CalendarEvent;
  categoryInfo?: { id: string; name: string; icon: string; color: string };
  assignment?: CategoryAssignment;
}

export const CategoryEventItem = ({ event, categoryInfo, assignment }: CategoryEventItemProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryInfo?.icon}</span>
            <h4 className="font-medium text-foreground">{event.title}</h4>
            <span className={`text-xs px-2 py-1 rounded ${categoryInfo?.color} text-white`}>
              {categoryInfo?.name}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {event.time}
            </div>
            
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Added by {event.creatorName || 'Unknown'}
            </div>
          </div>
          
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

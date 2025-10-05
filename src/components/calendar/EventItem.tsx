import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Trash2 } from 'lucide-react';

interface EventItemProps {
  event: CalendarEvent;
  onDelete: (eventId: string) => void;
}

export const EventItem = ({ event, onDelete }: EventItemProps) => {
  const categoryEmojis: Record<string, string> = {
    dining: '🍽️',
    lodging: '🏨',
    activity: '🎯',
    transportation: '🚗',
    entertainment: '🎭',
    other: '📌'
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryEmojis[event.event_category] || '📌'}</span>
            <h4 className="font-medium text-foreground">{event.title}</h4>
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{event.time}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(event.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

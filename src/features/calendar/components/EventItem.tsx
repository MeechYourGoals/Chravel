import React, { useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import {
  Clock,
  MapPin,
  Trash2,
  Pencil,
  Sun,
  CalendarDays,
  Repeat,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bell,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type RSVPStatus = 'going' | 'not_going' | 'maybe' | null;

interface EventItemProps {
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  isDeleting?: boolean;
  onRSVP?: (eventId: string, status: RSVPStatus) => void;
  currentRSVP?: RSVPStatus;
}

export const EventItem = ({
  event,
  onEdit,
  onDelete,
  isDeleting = false,
  onRSVP,
  currentRSVP,
}: EventItemProps) => {
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(currentRSVP || null);

  const categoryEmojis: Record<string, string> = {
    dining: '🍽️',
    lodging: '🏨',
    activity: '🎯',
    transportation: '🚗',
    entertainment: '🎭',
    other: '📌',
  };

  const handleRSVP = (status: RSVPStatus) => {
    const newStatus = rsvpStatus === status ? null : status;
    setRsvpStatus(newStatus);
    onRSVP?.(event.id, newStatus);
  };

  const sourceData = event.source_data as Record<string, unknown> | undefined;
  const hasReminder = sourceData?.reminder_minutes != null;
  const reminderMinutes = hasReminder ? (sourceData?.reminder_minutes as number) : null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryEmojis[event.event_category] || '📌'}</span>
            <h4 className="font-medium text-foreground">{event.title}</h4>
            {event.recurrence_rule && (
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recurring event" />
            )}
            {hasReminder && (
              <Bell
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-label={
                  reminderMinutes != null && reminderMinutes >= 60
                    ? `Reminder: ${Math.floor(reminderMinutes / 60)}h before`
                    : `Reminder: ${reminderMinutes}m before`
                }
              />
            )}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {event.is_all_day ? (
              <div className="flex items-center gap-2">
                {event.end_date && event.end_date.toDateString() !== event.date.toDateString() ? (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {format(event.date, 'MMM d')} - {format(event.end_date, 'MMM d')}
                    </span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>All day</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {event.time}
                  {event.end_time && ` - ${format(event.end_time, 'HH:mm')}`}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}

            {/* Availability badge */}
            {event.availability_status && event.availability_status !== 'busy' && (
              <span
                className={cn(
                  'inline-block text-xs px-2 py-0.5 rounded-full',
                  event.availability_status === 'free' && 'bg-green-500/20 text-green-400',
                  event.availability_status === 'tentative' && 'bg-yellow-500/20 text-yellow-400',
                )}
              >
                {event.availability_status}
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
          )}

          {/* RSVP buttons */}
          {onRSVP && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => handleRSVP('going')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  rsvpStatus === 'going'
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                    : 'bg-secondary text-secondary-foreground hover:bg-green-500/10 hover:text-green-400',
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                Going
              </button>
              <button
                type="button"
                onClick={() => handleRSVP('maybe')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  rsvpStatus === 'maybe'
                    ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                    : 'bg-secondary text-secondary-foreground hover:bg-yellow-500/10 hover:text-yellow-400',
                )}
              >
                <HelpCircle className="h-3 w-3" />
                Maybe
              </button>
              <button
                type="button"
                onClick={() => handleRSVP('not_going')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  rsvpStatus === 'not_going'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                    : 'bg-secondary text-secondary-foreground hover:bg-red-500/10 hover:text-red-400',
                )}
              >
                <XCircle className="h-3 w-3" />
                Can't go
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(event)}
              className="hover:bg-primary/10 hover:text-primary"
              title="Edit event"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(event.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
            title="Delete event"
          >
            {isDeleting ? (
              <span className="h-4 w-4 inline-flex items-center justify-center">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              </span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

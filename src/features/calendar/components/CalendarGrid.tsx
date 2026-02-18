import React, { useMemo } from 'react';
import { CalendarEvent } from '@/types/calendar';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddEvent?: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export const CalendarGrid = ({
  events,
  selectedDate,
  onSelectDate,
  onAddEvent,
  currentMonth,
  onMonthChange,
}: CalendarGridProps) => {
  // Get all days to display (including padding days from prev/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };

  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    onSelectDate(day);
  };

  const handleAddEventClick = (e: React.MouseEvent, day: Date) => {
    e.stopPropagation();
    if (onAddEvent && isSameMonth(day, currentMonth)) {
      onAddEvent(day);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Month Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>

        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-accent">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              className={cn(
                'group min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-border text-left transition-colors',
                'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                isSelected && 'ring-2 ring-primary',
                isTodayDate && 'bg-primary/5',
              )}
            >
              {/* Day Number + Add button */}
              <div className="flex items-center justify-between mb-1 group/day">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isTodayDate &&
                      'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center',
                    !isCurrentMonth && 'opacity-50',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {isCurrentMonth && onAddEvent && (
                  <button
                    type="button"
                    onClick={e => handleAddEventClick(e, day)}
                    className="p-0.5 rounded hover:bg-accent opacity-0 group-hover/day:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={`Add event on ${format(day, 'MMMM d')}`}
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Event Indicators */}
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={event.id}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate',
                      'bg-primary/10 text-primary border border-primary/20',
                      'hover:bg-primary/20 transition-colors',
                    )}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectDate(day);
                    }}
                  >
                    {event.time && <span className="font-medium mr-1">{event.time}</span>}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1.5">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

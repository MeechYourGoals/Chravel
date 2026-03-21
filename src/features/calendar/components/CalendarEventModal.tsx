import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AddToCalendarData, CalendarEvent } from '@/types/calendar';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';
import { RecurrenceInput } from './RecurrenceInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Common timezones for the timezone picker */
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'UTC',
];

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string; // Required: needed to create/update events
  onEventAdded?: (eventData: AddToCalendarData, eventId?: string) => void; // Optional: for parent components that want to know
  prefilledData?: Partial<AddToCalendarData>;
  editEvent?: CalendarEvent;
}

export const CalendarEventModal = ({
  isOpen,
  onClose,
  tripId,
  onEventAdded,
  prefilledData,
  editEvent,
}: CalendarEventModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<
    AddToCalendarData & { timezone?: string; reminder_minutes?: number }
  >({
    title: prefilledData?.title || editEvent?.title || '',
    date: prefilledData?.date || editEvent?.date || new Date(),
    time: prefilledData?.time || editEvent?.time || '',
    location: prefilledData?.location || editEvent?.location || '',
    description: prefilledData?.description || editEvent?.description || '',
    category: prefilledData?.category || editEvent?.event_category || 'other',
    include_in_itinerary:
      prefilledData?.include_in_itinerary ?? editEvent?.include_in_itinerary ?? true,
    is_all_day: prefilledData?.is_all_day ?? editEvent?.is_all_day ?? false,
    recurrence_rule: prefilledData?.recurrence_rule ?? editEvent?.recurrence_rule,
    timezone: undefined,
    reminder_minutes: undefined,
  });

  // Update form data when editEvent changes
  useEffect(() => {
    if (editEvent) {
      setFormData({
        title: editEvent.title,
        date: editEvent.date,
        time: editEvent.time,
        location: editEvent.location || '',
        description: editEvent.description || '',
        category: editEvent.event_category || 'other',
        include_in_itinerary: editEvent.include_in_itinerary ?? true,
        is_all_day: editEvent.is_all_day ?? false,
        recurrence_rule: editEvent.recurrence_rule,
        timezone: undefined,
        reminder_minutes: undefined,
      });
    } else if (prefilledData) {
      setFormData({
        title: prefilledData.title || '',
        date: prefilledData.date || new Date(),
        time: prefilledData.time || '',
        location: prefilledData.location || '',
        description: prefilledData.description || '',
        category: prefilledData.category || 'other',
        include_in_itinerary: prefilledData.include_in_itinerary ?? true,
        is_all_day: prefilledData.is_all_day ?? false,
        recurrence_rule: prefilledData.recurrence_rule,
        timezone: undefined,
        reminder_minutes: undefined,
      });
    }
  }, [editEvent, prefilledData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || (!formData.is_all_day && !formData.time)) return;

    setIsSubmitting(true);
    try {
      let startTime: Date;
      let endTime: string | undefined;

      if (formData.is_all_day) {
        startTime = new Date(formData.date);
        startTime.setHours(0, 0, 0, 0);
        const endOfDay = new Date(formData.date);
        endOfDay.setHours(23, 59, 59, 999);
        endTime = endOfDay.toISOString();
      } else {
        // Combine date and time into ISO string for start_time
        const [hours, minutes] = formData.time.split(':');
        startTime = new Date(formData.date);
        startTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (formData.endTime) {
          const [endHours, endMins] = formData.endTime.split(':');
          const endDateTime = new Date(formData.date);
          endDateTime.setHours(parseInt(endHours, 10), parseInt(endMins, 10), 0, 0);
          endTime = endDateTime.toISOString();
        }
      }

      if (editEvent) {
        // Update existing event
        const success = await calendarService.updateEvent(editEvent.id, {
          title: formData.title,
          description: formData.description || undefined,
          start_time: startTime.toISOString(),
          end_time: endTime,
          location: formData.location || undefined,
          event_category: formData.category || 'other',
          include_in_itinerary: formData.include_in_itinerary ?? true,
          is_all_day: formData.is_all_day ?? false,
        });

        if (success) {
          toast.success('Event updated');
          onEventAdded?.(formData, editEvent.id);
          handleClose();
        } else {
          toast.error('Failed to update event');
        }
      } else {
        // Create new event
        const result = await calendarService.createEvent({
          trip_id: tripId,
          title: formData.title,
          description: formData.description || undefined,
          start_time: startTime.toISOString(),
          end_time: endTime,
          location: formData.location || undefined,
          event_category: formData.category || 'other',
          include_in_itinerary: formData.include_in_itinerary ?? true,
          is_all_day: formData.is_all_day ?? false,
          source_type: 'manual',
          source_data: {
            ...(formData.timezone ? { timezone: formData.timezone } : {}),
            ...(formData.reminder_minutes != null
              ? { reminder_minutes: formData.reminder_minutes }
              : {}),
          },
          recurrence_rule: formData.recurrence_rule,
        });

        if (result.event) {
          // Show conflict warning if overlapping events exist
          if (result.conflicts.length > 0) {
            toast.success('Event created', {
              description: `Note: This event overlaps with "${result.conflicts[0]}"${result.conflicts.length > 1 ? ` and ${result.conflicts.length - 1} other event(s)` : ''}.`,
            });
          } else {
            toast.success('Event created');
          }
          onEventAdded?.(formData, result.event.id);
          handleClose();
        } else {
          toast.error('Failed to create event');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to save event', {
        description:
          errorMessage.includes('permission') || errorMessage.includes('RLS')
            ? 'You may not have permission to modify events on this trip.'
            : errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      date: new Date(),
      time: '',
      location: '',
      description: '',
      category: 'other',
      include_in_itinerary: true,
      is_all_day: false,
      recurrence_rule: undefined,
      timezone: undefined,
      reminder_minutes: undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Edit Event' : 'Add to Calendar'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event name"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-day"
              checked={formData.is_all_day ?? false}
              onCheckedChange={(checked: boolean) =>
                setFormData({
                  ...formData,
                  is_all_day: checked,
                  time: checked ? '' : formData.time,
                })
              }
            />
            <Label htmlFor="all-day" className="text-sm font-normal cursor-pointer">
              All day
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal text-xs px-3',
                      !formData.date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {formData.date ? format(formData.date, 'MMM d, yyyy') : 'Pick a date'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={date => date && setFormData({ ...formData, date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {!formData.is_all_day && (
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="Event location"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          {/* Recurrence */}
          <RecurrenceInput
            value={formData.recurrence_rule}
            onChange={rrule => setFormData({ ...formData, recurrence_rule: rrule })}
          />

          {/* Timezone */}
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <Globe className="h-3.5 w-3.5" />
              Timezone
            </Label>
            <Select
              value={formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              onValueChange={tz => setFormData({ ...formData, timezone: tz })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COMMON_TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reminder */}
          <div>
            <Label>Reminder</Label>
            <Select
              value={formData.reminder_minutes?.toString() || 'none'}
              onValueChange={val =>
                setFormData({
                  ...formData,
                  reminder_minutes: val === 'none' ? undefined : parseInt(val, 10),
                })
              }
            >
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder="No reminder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No reminder</SelectItem>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="include-itinerary"
              checked={formData.include_in_itinerary}
              onCheckedChange={checked =>
                setFormData({ ...formData, include_in_itinerary: checked })
              }
            />
            <Label htmlFor="include-itinerary">Include in trip itinerary</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editEvent ? 'Update Event' : 'Add Event'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { calendarService, TripEvent } from '@/services/calendarService';
import { toast } from 'sonner';
import { CalendarEventFormFields } from '@/features/calendar/components/CalendarEventFormFields';
import type { EventFormValues } from '@/features/calendar/components/CalendarEventFormFields';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  tripId: string;
  onEventCreated?: (event: TripEvent) => void;
  // Edit mode props
  editEvent?: TripEvent | null;
  onEventUpdated?: (event: TripEvent) => void;
}

export const CreateEventModal = ({
  isOpen,
  onClose,
  selectedDate,
  tripId,
  onEventCreated,
  editEvent,
  onEventUpdated,
}: CreateEventModalProps) => {
  const [formValues, setFormValues] = useState<EventFormValues>({
    title: '',
    time: '12:00',
    endTime: '',
    location: '',
    description: '',
  });
  const [eventDate, setEventDate] = useState(selectedDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editEvent;

  const handleFieldChange = useCallback(
    <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
      setFormValues(prev => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      const startDate = new Date(editEvent.start_time);
      setEventDate(startDate);
      setFormValues({
        title: editEvent.title || '',
        time: format(startDate, 'HH:mm'),
        endTime: editEvent.end_time ? format(new Date(editEvent.end_time), 'HH:mm') : '',
        location: editEvent.location || '',
        description: editEvent.description || '',
      });
    } else {
      // Reset form for new event
      setEventDate(selectedDate);
      setFormValues({
        title: '',
        time: '12:00',
        endTime: '',
        location: '',
        description: '',
      });
    }
  }, [editEvent, selectedDate, isOpen]);

  // Update eventDate when selectedDate prop changes (only for new events)
  useEffect(() => {
    if (!editEvent) {
      setEventDate(selectedDate);
    }
  }, [selectedDate, editEvent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { title, time, endTime, location, description } = formValues;

      // Validate title
      if (!title.trim()) {
        toast.error('Event title is required');
        setIsSubmitting(false);
        return;
      }

      // Validate date
      if (!eventDate || isNaN(eventDate.getTime())) {
        toast.error('Please select a valid date');
        setIsSubmitting(false);
        return;
      }

      // Validate time format
      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        toast.error('Please select a valid start time');
        setIsSubmitting(false);
        return;
      }

      if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
        toast.error('Please select a valid end time');
        setIsSubmitting(false);
        return;
      }

      // Combine selected date and time into ISO string for start_time
      const [hours, minutes] = time.split(':');
      const startTime = new Date(eventDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Final validation that the combined date/time is valid
      if (isNaN(startTime.getTime())) {
        toast.error('Invalid date or time. Please try again.');
        setIsSubmitting(false);
        return;
      }

      let endTimeISO: string | undefined;
      if (endTime) {
        const [endHours, endMinutes] = endTime.split(':');
        const endDate = new Date(eventDate);
        endDate.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);
        if (endDate.getTime() <= startTime.getTime()) {
          toast.error('End time must be after start time');
          setIsSubmitting(false);
          return;
        }
        endTimeISO = endDate.toISOString();
      }

      // Validate tripId
      if (!tripId) {
        toast.error('Trip ID is missing. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (isEditMode && editEvent) {
        // Update existing event
        const success = await calendarService.updateEvent(editEvent.id, {
          title,
          description: description || undefined,
          start_time: startTime.toISOString(),
          end_time: endTimeISO,
          location: location || undefined,
          trip_id: tripId,
        });

        if (success) {
          toast.success('Event updated', {
            description: `${title} has been updated`,
          });

          // Trigger callback for UI update
          onEventUpdated?.({
            ...editEvent,
            title,
            description: description || undefined,
            start_time: startTime.toISOString(),
            end_time: endTimeISO,
            location: location || undefined,
          });

          onClose();
        } else {
          throw new Error('Failed to update event');
        }
      } else {
        // Create new event
        // Create timeout promise (10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Event creation timed out. Please try again.')), 10000);
        });

        // Race between actual creation and timeout
        const result = await Promise.race([
          calendarService.createEvent({
            trip_id: tripId,
            title,
            description: description || undefined,
            start_time: startTime.toISOString(),
            end_time: endTimeISO,
            location: location || undefined,
            include_in_itinerary: true,
            source_type: 'manual',
            source_data: { created_from: 'mobile' },
          }),
          timeoutPromise,
        ]);

        if (result.event) {
          // Show conflict warning if overlapping events exist
          if (result.conflicts.length > 0) {
            toast.success('Event created', {
              description: `${title} has been added to your calendar. Note: This event overlaps with "${result.conflicts[0]}"${result.conflicts.length > 1 ? ` and ${result.conflicts.length - 1} other event(s)` : ''}.`,
            });
          } else {
            toast.success('Event created', {
              description: `${title} has been added to your calendar`,
            });
          }

          // Trigger callback for UI update
          onEventCreated?.(result.event);

          // Reset form
          setFormValues({
            title: '',
            time: '12:00',
            endTime: '',
            location: '',
            description: '',
          });
          onClose();
        } else {
          throw new Error('Failed to create event');
        }
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Please try again or contact support';
      toast.error(isEditMode ? 'Failed to update event' : 'Failed to create event', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-glass-slate-card border border-glass-slate-border rounded-t-3xl sm:rounded-3xl shadow-enterprise-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${isEditMode ? 'bg-amber-500/20' : 'bg-primary/20'} flex items-center justify-center`}
            >
              {isEditMode ? (
                <Pencil className="w-5 h-5 text-amber-400" />
              ) : (
                <CalendarIcon className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isEditMode ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-sm text-gray-400">{format(eventDate, 'MMM d, yyyy')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date field (mobile-specific, not in shared fields) */}
          <div>
            <Label htmlFor="event-date" className="text-gray-300 text-sm">
              Date
            </Label>
            <Input
              id="event-date"
              type="date"
              className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
              value={format(eventDate, 'yyyy-MM-dd')}
              onChange={e => {
                const value = e.target.value;
                if (value) {
                  const [year, month, day] = value.split('-').map(Number);
                  setEventDate(new Date(year, month - 1, day));
                }
              }}
              required
            />
          </div>

          {/* Shared form fields */}
          <CalendarEventFormFields
            values={formValues}
            onFieldChange={handleFieldChange}
            disabled={isSubmitting}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 ${
                isEditMode
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                  : 'bg-primary hover:bg-primary/90'
              } text-white`}
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

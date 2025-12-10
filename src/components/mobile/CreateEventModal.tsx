import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { calendarService, TripEvent } from '@/services/calendarService';
import { toast } from 'sonner';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  tripId: string;
  onEventCreated?: (event: any) => void;
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
  onEventUpdated
}: CreateEventModalProps) => {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editEvent;

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      const startDate = new Date(editEvent.start_time);
      setEventDate(startDate);
      setTime(format(startDate, 'HH:mm'));
      setLocation(editEvent.location || '');
      setDescription(editEvent.description || '');
    } else {
      // Reset form for new event
      setTitle('');
      setEventDate(selectedDate);
      setTime('12:00');
      setLocation('');
      setDescription('');
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
      // Combine selected date and time into ISO string for start_time
      const [hours, minutes] = time.split(':');
      const startTime = new Date(eventDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (isEditMode && editEvent) {
        // Update existing event
        const success = await calendarService.updateEvent(editEvent.id, {
          title,
          description: description || undefined,
          start_time: startTime.toISOString(),
          location: location || undefined,
          trip_id: tripId,
        });

        if (success) {
          toast.success('Event updated', {
            description: `${title} has been updated`
          });

          // Trigger callback for UI update
          onEventUpdated?.({
            ...editEvent,
            title,
            description: description || undefined,
            start_time: startTime.toISOString(),
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
            location: location || undefined,
            include_in_itinerary: true,
            source_type: 'manual',
            source_data: { created_from: 'mobile' }
          }),
          timeoutPromise
        ]);

        if (result.event) {
          // Show conflict warning if overlapping events exist
          if (result.conflicts.length > 0) {
            toast.success('Event created', {
              description: `${title} has been added to your calendar. Note: This event overlaps with "${result.conflicts[0]}"${result.conflicts.length > 1 ? ` and ${result.conflicts.length - 1} other event(s)` : ''}.`
            });
          } else {
            toast.success('Event created', {
              description: `${title} has been added to your calendar`
            });
          }

          // Trigger callback for UI update
          onEventCreated?.(result.event);

          // Reset form
          setTitle('');
          setTime('12:00');
          setLocation('');
          setDescription('');
          onClose();
        } else {
          throw new Error('Failed to create event');
        }
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again or contact support';
      toast.error(isEditMode ? 'Failed to update event' : 'Failed to create event', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-glass-slate-card border border-glass-slate-border rounded-t-3xl sm:rounded-3xl shadow-enterprise-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isEditMode ? 'bg-amber-500/20' : 'bg-blue-500/20'} flex items-center justify-center`}>
              {isEditMode ? (
                <Pencil className="w-5 h-5 text-amber-400" />
              ) : (
                <CalendarIcon className="w-5 h-5 text-blue-400" />
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dinner at Italian Restaurant"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={format(eventDate, 'yyyy-MM-dd')}
              onChange={(e) => setEventDate(new Date(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Central Park"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

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
              className={`flex-1 ${isEditMode 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              } text-white`}
            >
              {isSubmitting 
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Save Changes' : 'Create Event')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

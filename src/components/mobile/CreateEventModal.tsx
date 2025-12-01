import React, { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { calendarService } from '@/services/calendarService';
import { toast } from 'sonner';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  tripId: string;
  onEventCreated?: (event: any) => void;
}

export const CreateEventModal = ({ isOpen, onClose, selectedDate, tripId, onEventCreated }: CreateEventModalProps) => {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update eventDate when selectedDate prop changes
  React.useEffect(() => {
    setEventDate(selectedDate);
  }, [selectedDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine selected date and time into ISO string for start_time
      const [hours, minutes] = time.split(':');
      const startTime = new Date(eventDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create event via calendar service
      const createdEvent = await calendarService.createEvent({
        trip_id: tripId,
        title,
        description: description || undefined,
        start_time: startTime.toISOString(),
        location: location || undefined,
        include_in_itinerary: true,
        source_type: 'manual',
        source_data: { created_from: 'mobile' }
      });

      if (createdEvent) {
        toast.success('Event created', {
          description: `${title} has been added to your calendar`
        });

        // Trigger callback for UI update
        onEventCreated?.(createdEvent);

        // Reset form
        setTitle('');
        setTime('12:00');
        setLocation('');
        setDescription('');
        onClose();
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event', {
        description: 'Please try again or contact support if the issue persists'
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Add Event</h2>
              <p className="text-sm text-gray-400">{format(selectedDate, 'MMM d, yyyy')}</p>
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
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { AddToCalendarData, CalendarEvent } from '../types/calendar';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: (eventData: AddToCalendarData, eventId?: string) => void;
  prefilledData?: Partial<AddToCalendarData>;
  editEvent?: CalendarEvent;
}

export const CalendarEventModal = ({
  isOpen,
  onClose,
  onEventAdded,
  prefilledData,
  editEvent
}: CalendarEventModalProps) => {
  const [formData, setFormData] = useState<AddToCalendarData>({
    title: prefilledData?.title || editEvent?.title || '',
    date: prefilledData?.date || editEvent?.date || new Date(),
    time: prefilledData?.time || editEvent?.time || '',
    location: prefilledData?.location || editEvent?.location || '',
    description: prefilledData?.description || editEvent?.description || '',
    include_in_itinerary: prefilledData?.include_in_itinerary ?? editEvent?.include_in_itinerary ?? true
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
        include_in_itinerary: editEvent.include_in_itinerary ?? true
      });
    } else if (prefilledData) {
      setFormData({
        title: prefilledData.title || '',
        date: prefilledData.date || new Date(),
        time: prefilledData.time || '',
        location: prefilledData.location || '',
        description: prefilledData.description || '',
        include_in_itinerary: prefilledData.include_in_itinerary ?? true
      });
    }
  }, [editEvent, prefilledData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.time) return;

    // Pass event ID if editing, otherwise undefined for new event
    onEventAdded(formData, editEvent?.id);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      date: new Date(),
      time: '',
      location: '',
      description: '',
      include_in_itinerary: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editEvent ? 'Edit Event' : 'Add to Calendar'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Event name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({...formData, date})}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Event location"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="include-itinerary"
              checked={formData.include_in_itinerary}
              onCheckedChange={(checked) => 
                setFormData({...formData, include_in_itinerary: checked})
              }
            />
            <Label htmlFor="include-itinerary">Include in trip itinerary</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editEvent ? 'Update Event' : 'Add Event'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AddToCalendarData } from '@/types/calendar';
import { format } from 'date-fns';

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  newEvent: AddToCalendarData;
  onUpdateField: <K extends keyof AddToCalendarData>(field: K, value: AddToCalendarData[K]) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
  selectedDate?: Date;
}

export function AddEventModal({ 
  open, 
  onClose, 
  newEvent, 
  onUpdateField, 
  onSubmit, 
  isSubmitting = false, 
  isEditing = false,
  selectedDate 
}: AddEventModalProps) {
  const handleSubmit = () => {
    onSubmit();
    // Don't close here - let the parent handle it after successful save
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            {isEditing 
              ? `Edit Event${selectedDate ? ` for ${format(selectedDate, 'EEEE, MMM d')}` : ''}`
              : `Add Event${selectedDate ? ` for ${format(selectedDate, 'EEEE, MMM d')}` : ''}`
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="modal-title" className="text-gray-300 text-sm">Title</Label>
            <Input
              id="modal-title"
              className="mt-1.5 bg-gray-800 border-white/10 text-white"
              value={newEvent.title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              placeholder="Event title"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modal-start-time" className="text-gray-300 text-sm">Start Time</Label>
              <Input
                id="modal-start-time"
                type="time"
                className="mt-1.5 bg-gray-800 border-white/10 text-white"
                value={newEvent.time}
                onChange={(e) => onUpdateField('time', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="modal-end-time" className="text-gray-300 text-sm">End Time</Label>
              <Input
                id="modal-end-time"
                type="time"
                className="mt-1.5 bg-gray-800 border-white/10 text-white"
                value={newEvent.endTime || ''}
                onChange={(e) => onUpdateField('endTime', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="modal-location" className="text-gray-300 text-sm">Location</Label>
            <Input
              id="modal-location"
              className="mt-1.5 bg-gray-800 border-white/10 text-white"
              value={newEvent.location}
              onChange={(e) => onUpdateField('location', e.target.value)}
              placeholder="e.g., Central Park, NYC"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="modal-description" className="text-gray-300 text-sm">Description</Label>
            <Textarea
              id="modal-description"
              className="mt-1.5 bg-gray-800 border-white/10 text-white resize-none"
              rows={3}
              value={newEvent.description}
              onChange={(e) => onUpdateField('description', e.target.value)}
              placeholder="Event details (optional)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newEvent.title || isSubmitting}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Save Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

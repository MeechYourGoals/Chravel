import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  selectedDate,
}: AddEventModalProps) {
  const handleSubmit = () => {
    onSubmit();
    // Don't close here - let the parent handle it after successful save
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-6 max-w-md mx-auto shadow-enterprise-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            {isEditing
              ? `Edit Event${selectedDate ? ` for ${format(selectedDate, 'EEEE, MMM d')}` : ''}`
              : `Add Event${selectedDate ? ` for ${format(selectedDate, 'EEEE, MMM d')}` : ''}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="modal-title" className="text-gray-300 text-sm">
              Title
            </Label>
            <Input
              id="modal-title"
              className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
              value={newEvent.title}
              onChange={e => onUpdateField('title', e.target.value)}
              placeholder="Event title"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modal-start-time" className="text-gray-300 text-sm">
                Start Time
              </Label>
              <Input
                id="modal-start-time"
                type="time"
                className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
                value={newEvent.time}
                onChange={e => onUpdateField('time', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="modal-end-time" className="text-gray-300 text-sm">
                End Time
              </Label>
              <Input
                id="modal-end-time"
                type="time"
                className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
                value={newEvent.endTime || ''}
                onChange={e => onUpdateField('endTime', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="modal-location" className="text-gray-300 text-sm">
              Location
            </Label>
            <Input
              id="modal-location"
              className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
              value={newEvent.location}
              onChange={e => onUpdateField('location', e.target.value)}
              placeholder="e.g., Central Park, NYC"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="modal-description" className="text-gray-300 text-sm">
              Description
            </Label>
            <Textarea
              id="modal-description"
              className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500 resize-none"
              rows={3}
              value={newEvent.description}
              onChange={e => onUpdateField('description', e.target.value)}
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
            className="border-glass-slate-border text-gray-300 hover:bg-glass-slate-bg hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newEvent.title || isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Save Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

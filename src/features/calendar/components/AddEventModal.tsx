import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AddToCalendarData } from '@/types/calendar';
import { format } from 'date-fns';
import { CalendarEventFormFields } from './CalendarEventFormFields';
import type { EventFormValues } from './CalendarEventFormFields';

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

  const formValues: EventFormValues = {
    title: newEvent.title,
    time: newEvent.time,
    endTime: newEvent.endTime || '',
    location: newEvent.location || '',
    description: newEvent.description || '',
  };

  const handleFieldChange = <K extends keyof EventFormValues>(
    field: K,
    value: EventFormValues[K],
  ) => {
    onUpdateField(
      field as keyof AddToCalendarData,
      value as AddToCalendarData[keyof AddToCalendarData],
    );
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
          <CalendarEventFormFields
            values={formValues}
            onFieldChange={handleFieldChange}
            disabled={isSubmitting}
          />
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

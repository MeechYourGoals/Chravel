import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface EventFormValues {
  title: string;
  time: string;
  endTime: string;
  location: string;
  description: string;
}

interface CalendarEventFormFieldsProps {
  values: EventFormValues;
  onFieldChange: <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => void;
  disabled?: boolean;
}

export function CalendarEventFormFields({
  values,
  onFieldChange,
  disabled = false,
}: CalendarEventFormFieldsProps) {
  return (
    <>
      <div>
        <Label htmlFor="event-title" className="text-gray-300 text-sm">
          Title
        </Label>
        <Input
          id="event-title"
          className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
          value={values.title}
          onChange={e => onFieldChange('title', e.target.value)}
          placeholder="Event title"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="event-start-time" className="text-gray-300 text-sm">
            Start Time
          </Label>
          <Input
            id="event-start-time"
            type="time"
            className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
            value={values.time}
            onChange={e => onFieldChange('time', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="event-end-time" className="text-gray-300 text-sm">
            End Time
          </Label>
          <Input
            id="event-end-time"
            type="time"
            className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
            value={values.endTime}
            onChange={e => onFieldChange('endTime', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="event-location" className="text-gray-300 text-sm">
          Location
        </Label>
        <Input
          id="event-location"
          className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
          value={values.location}
          onChange={e => onFieldChange('location', e.target.value)}
          placeholder="e.g., Central Park, NYC"
          disabled={disabled}
        />
      </div>

      <div>
        <Label htmlFor="event-description" className="text-gray-300 text-sm">
          Description
        </Label>
        <Textarea
          id="event-description"
          className="mt-1.5 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500 resize-none"
          rows={3}
          value={values.description}
          onChange={e => onFieldChange('description', e.target.value)}
          placeholder="Event details (optional)"
          disabled={disabled}
        />
      </div>
    </>
  );
}

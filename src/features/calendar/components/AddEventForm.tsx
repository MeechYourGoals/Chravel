import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AddToCalendarData } from '@/types/calendar';
import { RecurrenceInput } from './RecurrenceInput';

interface AddEventFormProps {
  newEvent: AddToCalendarData;
  onUpdateField: <K extends keyof AddToCalendarData>(field: K, value: AddToCalendarData[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

export const AddEventForm = ({ newEvent, onUpdateField, onSubmit, onCancel, isSubmitting = false, isEditing = false }: AddEventFormProps) => {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={newEvent.title}
          onChange={(e) => onUpdateField('title', e.target.value)}
          placeholder="Event title"
        />
      </div>

      <div>
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          value={newEvent.time}
          onChange={(e) => onUpdateField('time', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="endTime">End Time (optional)</Label>
        <Input
          id="endTime"
          type="time"
          value={newEvent.endTime || ''}
          onChange={(e) => onUpdateField('endTime', e.target.value || undefined)}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={newEvent.description}
          onChange={(e) => onUpdateField('description', e.target.value)}
          placeholder="Event details (optional)"
        />
      </div>

      {/* Recurring Events */}
      <RecurrenceInput
        value={newEvent.recurrence_rule}
        onChange={(rrule) => onUpdateField('recurrence_rule', rrule)}
      />

      {/* Busy/Free Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="is-busy-switch">Mark as Busy</Label>
          <Switch
            id="is-busy-switch"
            checked={newEvent.is_busy || false}
            onCheckedChange={(checked) => onUpdateField('is_busy', checked)}
          />
        </div>

        {newEvent.is_busy && (
          <div>
            <Label htmlFor="availability-status">Availability Status</Label>
            <Select
              value={newEvent.availability_status || 'busy'}
              onValueChange={(value) =>
                onUpdateField('availability_status', value as 'busy' | 'free' | 'tentative')
              }
            >
              <SelectTrigger id="availability-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="tentative">Tentative</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={onSubmit} disabled={!newEvent.title || isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Add Event'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      </div>
    </div>
  );
};

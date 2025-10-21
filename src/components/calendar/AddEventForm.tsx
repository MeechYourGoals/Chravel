import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddToCalendarData } from '@/types/calendar';

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
    <div className="space-y-4">
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
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={newEvent.location}
          onChange={(e) => onUpdateField('location', e.target.value)}
          placeholder="Event location"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={newEvent.category} onValueChange={(value) => onUpdateField('category', value as AddToCalendarData['category'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="lodging">Lodging</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="transportation">Transportation</SelectItem>
            <SelectItem value="entertainment">Entertainment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={!newEvent.title || isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Add Event'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      </div>
    </div>
  );
};

/**
 * Recurring Event Dialog
 * UI for creating recurring events
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurringEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recurrenceConfig: RecurrenceConfig) => void;
}

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months/years
  endDate?: Date;
  occurrences?: number;
}

export const RecurringEventDialog: React.FC<RecurringEventDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<'never' | 'date' | 'occurrences'>('never');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [occurrences, setOccurrences] = useState(10);

  const handleSave = () => {
    const config: RecurrenceConfig = {
      frequency,
      interval,
      ...(endType === 'date' && endDate ? { endDate } : {}),
      ...(endType === 'occurrences' ? { occurrences } : {}),
    };
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recurring Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Repeat Every</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Day(s)</SelectItem>
                  <SelectItem value="weekly">Week(s)</SelectItem>
                  <SelectItem value="monthly">Month(s)</SelectItem>
                  <SelectItem value="yearly">Year(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ends</Label>
            <Select value={endType} onValueChange={(v) => setEndType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="date">On Date</SelectItem>
                <SelectItem value="occurrences">After Occurrences</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {endType === 'date' && (
            <div className="space-y-2">
              <Label>End Date</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                className="rounded-md border"
              />
            </div>
          )}

          {endType === 'occurrences' && (
            <div className="space-y-2">
              <Label>Number of Occurrences</Label>
              <Input
                type="number"
                min={1}
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

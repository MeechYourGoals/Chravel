/**
 * RecurrenceInput Component
 *
 * Provides UI for configuring recurring events using RRULE format
 * Supports daily, weekly, monthly patterns with customizable intervals
 */

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Repeat } from 'lucide-react';

export interface RecurrenceInputProps {
  value?: string; // RRULE format
  onChange: (rrule: string | undefined) => void;
}

type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type RecurrenceEndType = 'never' | 'count' | 'until';

interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;
  endType: RecurrenceEndType;
  count?: number;
  until?: string; // ISO date format
  weekdays?: number[]; // For weekly: 0=SU, 1=MO, etc.
}

const WEEKDAY_ABBR = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parse RRULE string to RecurrenceConfig
 */
function parseRRule(rrule: string | undefined): RecurrenceConfig {
  if (!rrule) {
    return {
      frequency: 'DAILY',
      interval: 1,
      endType: 'never'
    };
  }

  const config: RecurrenceConfig = {
    frequency: 'DAILY',
    interval: 1,
    endType: 'never'
  };

  const parts = rrule.split(';');
  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key === 'FREQ') {
      config.frequency = value as RecurrenceFrequency;
    } else if (key === 'INTERVAL') {
      config.interval = parseInt(value, 10);
    } else if (key === 'COUNT') {
      config.endType = 'count';
      config.count = parseInt(value, 10);
    } else if (key === 'UNTIL') {
      config.endType = 'until';
      config.until = value;
    } else if (key === 'BYDAY') {
      config.weekdays = value.split(',').map(day => WEEKDAY_ABBR.indexOf(day));
    }
  });

  return config;
}

/**
 * Build RRULE string from RecurrenceConfig
 */
function buildRRule(config: RecurrenceConfig): string {
  const parts = [
    `FREQ=${config.frequency}`,
    `INTERVAL=${config.interval}`
  ];

  if (config.endType === 'count' && config.count) {
    parts.push(`COUNT=${config.count}`);
  } else if (config.endType === 'until' && config.until) {
    parts.push(`UNTIL=${config.until}`);
  }

  if (config.weekdays && config.weekdays.length > 0) {
    const days = config.weekdays.map(d => WEEKDAY_ABBR[d]).join(',');
    parts.push(`BYDAY=${days}`);
  }

  return parts.join(';');
}

export const RecurrenceInput: React.FC<RecurrenceInputProps> = ({ value, onChange }) => {
  const [isRecurring, setIsRecurring] = useState(!!value);
  const [config, setConfig] = useState<RecurrenceConfig>(() => parseRRule(value));

  // Update config when value changes externally
  useEffect(() => {
    if (value) {
      setConfig(parseRRule(value));
      setIsRecurring(true);
    }
  }, [value]);

  // Notify parent of changes
  const updateRecurrence = (newConfig: RecurrenceConfig) => {
    setConfig(newConfig);
    if (isRecurring) {
      onChange(buildRRule(newConfig));
    }
  };

  // Toggle recurrence on/off
  const handleToggle = (checked: boolean) => {
    setIsRecurring(checked);
    if (checked) {
      onChange(buildRRule(config));
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle Recurrence */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="recurring-switch" className="cursor-pointer">
            Repeat Event
          </Label>
        </div>
        <Switch
          id="recurring-switch"
          checked={isRecurring}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Recurrence Options */}
      {isRecurring && (
        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
          {/* Frequency */}
          <div className="flex items-center gap-3">
            <Label className="text-sm min-w-[80px]">Repeats</Label>
            <Select
              value={config.frequency}
              onValueChange={(freq) =>
                updateRecurrence({ ...config, frequency: freq as RecurrenceFrequency })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-3">
            <Label className="text-sm min-w-[80px]">Every</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={config.interval}
              onChange={(e) =>
                updateRecurrence({ ...config, interval: parseInt(e.target.value, 10) || 1 })
              }
              className="w-[80px]"
            />
            <span className="text-sm text-muted-foreground">
              {config.frequency === 'DAILY' && (config.interval === 1 ? 'day' : 'days')}
              {config.frequency === 'WEEKLY' && (config.interval === 1 ? 'week' : 'weeks')}
              {config.frequency === 'MONTHLY' && (config.interval === 1 ? 'month' : 'months')}
            </span>
          </div>

          {/* Weekdays (for weekly recurrence) */}
          {config.frequency === 'WEEKLY' && (
            <div>
              <Label className="text-sm mb-2 block">On these days</Label>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAY_NAMES.map((day, index) => {
                  const isSelected = config.weekdays?.includes(index) || false;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const current = config.weekdays || [];
                        const updated = isSelected
                          ? current.filter(d => d !== index)
                          : [...current, index].sort();
                        updateRecurrence({ ...config, weekdays: updated });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* End Type */}
          <div className="flex items-center gap-3">
            <Label className="text-sm min-w-[80px]">Ends</Label>
            <Select
              value={config.endType}
              onValueChange={(type) =>
                updateRecurrence({ ...config, endType: type as RecurrenceEndType })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="count">After</SelectItem>
                <SelectItem value="until">On date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count */}
          {config.endType === 'count' && (
            <div className="flex items-center gap-3 pl-[92px]">
              <Input
                type="number"
                min={1}
                max={999}
                value={config.count || 10}
                onChange={(e) =>
                  updateRecurrence({ ...config, count: parseInt(e.target.value, 10) || 1 })
                }
                className="w-[100px]"
              />
              <span className="text-sm text-muted-foreground">occurrences</span>
            </div>
          )}

          {/* Until Date */}
          {config.endType === 'until' && (
            <div className="flex items-center gap-3 pl-[92px]">
              <Input
                type="date"
                value={config.until || ''}
                onChange={(e) => updateRecurrence({ ...config, until: e.target.value })}
                className="w-[180px]"
              />
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 text-xs text-muted-foreground border-t border-border">
            <strong>Summary:</strong> Repeats{' '}
            {config.interval > 1 ? `every ${config.interval} ` : ''}
            {config.frequency === 'DAILY' && (config.interval === 1 ? 'day' : 'days')}
            {config.frequency === 'WEEKLY' &&
              (config.interval === 1 ? 'week' : 'weeks') +
                (config.weekdays && config.weekdays.length > 0
                  ? ` on ${config.weekdays.map(d => WEEKDAY_NAMES[d]).join(', ')}`
                  : '')}
            {config.frequency === 'MONTHLY' && (config.interval === 1 ? 'month' : 'months')}
            {config.endType === 'count' && `, ${config.count} times`}
            {config.endType === 'until' && `, until ${config.until}`}
          </div>
        </div>
      )}
    </div>
  );
};

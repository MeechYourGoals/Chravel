import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BroadcastSchedulerProps {
  scheduledFor: Date | null;
  onScheduleChange: (date: Date | null) => void;
  onCancel: () => void;
}

export const BroadcastScheduler = ({
  scheduledFor,
  onScheduleChange,
  onCancel,
}: BroadcastSchedulerProps) => {
  const [dateInput, setDateInput] = useState(
    scheduledFor ? scheduledFor.toISOString().slice(0, 16) : '',
  );
  const [timeInput, setTimeInput] = useState(
    scheduledFor ? scheduledFor.toTimeString().slice(0, 5) : '',
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateInput(newDate);

    if (newDate && timeInput) {
      const scheduledDate = new Date(`${newDate}T${timeInput}`);
      if (scheduledDate > new Date()) {
        onScheduleChange(scheduledDate);
      }
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeInput(newTime);

    if (dateInput && newTime) {
      const scheduledDate = new Date(`${dateInput}T${newTime}`);
      if (scheduledDate > new Date()) {
        onScheduleChange(scheduledDate);
      }
    }
  };

  const handleQuickSelect = (minutes: number) => {
    const scheduledDate = new Date(Date.now() + minutes * 60 * 1000);
    setDateInput(scheduledDate.toISOString().slice(0, 10));
    setTimeInput(scheduledDate.toTimeString().slice(0, 5));
    onScheduleChange(scheduledDate);
  };

  const handleClear = () => {
    setDateInput('');
    setTimeInput('');
    onScheduleChange(null);
    onCancel();
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Schedule Broadcast</span>
        </div>
        <button onClick={handleClear} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Quick select buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect(15)}
            className="text-xs"
          >
            In 15 min
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect(30)}
            className="text-xs"
          >
            In 30 min
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect(60)}
            className="text-xs"
          >
            In 1 hour
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect(120)}
            className="text-xs"
          >
            In 2 hours
          </Button>
        </div>

        {/* Date and time inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={dateInput}
              onChange={handleDateChange}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Time</label>
            <input
              type="time"
              value={timeInput}
              onChange={handleTimeChange}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Display scheduled time */}
        {scheduledFor && scheduledFor > new Date() && (
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/30 rounded p-2">
            <Clock size={12} />
            <span>
              Scheduled for{' '}
              {scheduledFor.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

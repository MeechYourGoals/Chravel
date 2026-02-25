import React from 'react';
import { isToday, isYesterday, format } from 'date-fns';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy'); // "November 26, 2025"
  };

  return (
    <div className="flex items-center justify-center py-3">
      <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
        <span className="text-xs md:text-sm text-white/60 font-medium">{getDateLabel(date)}</span>
      </div>
    </div>
  );
};

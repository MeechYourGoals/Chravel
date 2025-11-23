import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarEmptyStateProps {
  onAddClick: () => void;
}

export const CalendarEmptyState = ({ onAddClick }: CalendarEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
      <div className="bg-primary/10 p-4 rounded-full mb-4">
        <Calendar size={48} className="text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Calendar is empty</h3>
      <p className="text-gray-400 max-w-md mb-8">
        Add events to your itinerary to keep everyone on the same page. Schedule flights, dinners, and activities.
      </p>
      <Button
        onClick={onAddClick}
        className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2 h-auto"
      >
        <Plus size={18} className="mr-2" />
        Add Event
      </Button>
    </div>
  );
};

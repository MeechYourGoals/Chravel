import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTripVariant } from '@/contexts/TripVariantContext';

interface CalendarEmptyStateProps {
  onCreateEvent: () => void;
}

export const CalendarEmptyState = ({ onCreateEvent }: CalendarEmptyStateProps) => {
  const { accentColors } = useTripVariant();

  return (
    <div className="text-center py-16 px-4">
      <div
        className={`w-24 h-24 bg-gradient-to-br ${accentColors.gradient} opacity-20 rounded-full flex items-center justify-center mx-auto mb-6`}
      >
        <Calendar size={40} className={`text-${accentColors.primary}`} />
      </div>
      <h3 className="text-2xl font-bold mb-3 text-white">No events scheduled</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Plan your trip schedule! Add events, activities, and important dates to keep everyone on the
        same page.
      </p>
      <Button
        onClick={onCreateEvent}
        className={`inline-flex items-center gap-2 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg`}
      >
        <Plus size={20} />
        Add Your First Event
      </Button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Shared Calendar</h4>
          <p className="text-sm text-gray-400">Everyone sees the same schedule—no more confusion</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Event Details</h4>
          <p className="text-sm text-gray-400">
            Add times, locations, and descriptions for each event
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold mb-2 text-white">Itinerary View</h4>
          <p className="text-sm text-gray-400">
            Switch to itinerary mode for a day-by-day overview
          </p>
        </div>
      </div>
    </div>
  );
};

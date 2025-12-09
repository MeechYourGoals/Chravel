import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { CalendarEventModal } from './CalendarEventModal';
import { AddToCalendarData } from '../types/calendar';

interface AddToCalendarButtonProps {
  tripId: string; // Required: needed to create events
  placeName: string;
  placeAddress?: string;
  category?: AddToCalendarData['category'];
  onEventAdded?: (eventData: AddToCalendarData) => void;
  variant?: 'default' | 'icon' | 'pill';
}

export const AddToCalendarButton = ({
  tripId,
  placeName,
  placeAddress,
  category = 'other',
  onEventAdded,
  variant = 'default'
}: AddToCalendarButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEventAdded = (eventData: AddToCalendarData) => {
    onEventAdded?.(eventData);
    setIsModalOpen(false);
  };

  const prefilledData: Partial<AddToCalendarData> = {
    title: placeName,
    location: placeAddress || placeName,
    category: category,
    include_in_itinerary: true
  };

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="p-2"
        >
          <Calendar size={16} />
        </Button>
        <CalendarEventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          tripId={tripId}
          onEventAdded={handleEventAdded}
          prefilledData={prefilledData}
        />
      </>
    );
  }

  if (variant === 'pill') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs md:text-sm md:px-3 md:py-2"
        >
          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
          Add to Calendar
        </Button>
        <CalendarEventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          tripId={tripId}
          onEventAdded={handleEventAdded}
          prefilledData={prefilledData}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="w-full"
      >
        <Plus size={16} className="mr-2" />
        Add to Calendar
      </Button>
      <CalendarEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripId={tripId}
        onEventAdded={handleEventAdded}
        prefilledData={prefilledData}
      />
    </>
  );
};
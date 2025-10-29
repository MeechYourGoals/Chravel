import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { CalendarEventModal } from './CalendarEventModal';
import { AddToCalendarData } from '../types/calendar';

interface AddToCalendarButtonProps {
  placeName: string;
  placeAddress?: string;
  onEventAdded?: (eventData: AddToCalendarData) => void;
  variant?: 'default' | 'icon' | 'pill';
}

export const AddToCalendarButton = ({
  placeName,
  placeAddress,
  onEventAdded,
  variant = 'default'
}: AddToCalendarButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEventAdded = (eventData: AddToCalendarData) => {
    onEventAdded?.(eventData);
    setIsModalOpen(false);
  };

  const prefilledData = {
    title: placeName,
    location: placeAddress || placeName,
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
          className="text-xs"
        >
          <Calendar size={14} className="mr-1" />
          Add to Calendar
        </Button>
        <CalendarEventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
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
        onEventAdded={handleEventAdded}
        prefilledData={prefilledData}
      />
    </>
  );
};
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AddEventModal } from '../AddEventModal';
import type { AddToCalendarData } from '@/types/calendar';

describe('AddEventModal', () => {
  it('renders explicit clock affordance for both time inputs', () => {
    const newEvent: AddToCalendarData = {
      title: 'Breakfast at Four Seasons',
      date: new Date('2026-07-24T00:00:00.000Z'),
      time: '08:00',
      endTime: '09:30',
      location: 'NYC',
      description: '',
      category: 'other',
      include_in_itinerary: true,
      is_all_day: false,
    };

    render(
      <AddEventModal
        open={true}
        onClose={vi.fn()}
        newEvent={newEvent}
        onUpdateField={vi.fn()}
        onSubmit={vi.fn()}
        selectedDate={new Date('2026-07-24T00:00:00.000Z')}
      />,
    );

    const startTimeInput = screen.getByLabelText('Start Time');
    const endTimeInput = screen.getByLabelText('End Time');

    expect(startTimeInput).toHaveClass('calendar-time-input');
    expect(endTimeInput).toHaveClass('calendar-time-input');
    expect(document.querySelectorAll('.calendar-time-icon')).toHaveLength(2);
  });
});

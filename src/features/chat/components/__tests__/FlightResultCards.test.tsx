import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightResultCards } from '../FlightResultCards';

describe('FlightResultCards', () => {
  it('renders a hardened external anchor for Google Flights links', () => {
    render(
      <FlightResultCards
        flights={[
          {
            origin: 'ATL',
            destination: 'TYO',
            departureDate: '2026-05-13',
            returnDate: '2026-05-27',
            passengers: 2,
            deeplink: 'https://www.google.com/travel/flights?q=atl+tyo',
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: /check availability/i });
    expect(link).toHaveAttribute('href', 'https://www.google.com/travel/flights?q=atl+tyo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('supports save-to-trip state and disables repeat saves once saved', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    const flights = [
      {
        origin: 'ATL',
        destination: 'TYO',
        departureDate: '2026-05-13',
        passengers: 1,
        deeplink: 'https://www.google.com/travel/flights?q=atl+tyo',
      },
    ];

    const { rerender } = render(
      <FlightResultCards flights={flights} onSave={onSave} isSaved={() => false} />,
    );

    const saveButton = screen.getByRole('button', { name: /save to trip/i });
    await user.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(<FlightResultCards flights={flights} onSave={onSave} isSaved={() => true} />);

    expect(screen.getByRole('button', { name: /saved ✓/i })).toBeDisabled();
  });
});

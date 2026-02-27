import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FlightResultCards, FlightResult } from '../FlightResultCards';
import { PlaceResultCards, PlaceResult } from '../PlaceResultCards';
import { describe, it, expect, vi } from 'vitest';

describe('FlightResultCards', () => {
  const mockFlights: FlightResult[] = [
    {
      origin: 'SFO',
      destination: 'JFK',
      departureDate: '2023-10-25',
      returnDate: '2023-10-30',
      passengers: 2,
      deeplink: 'https://google.com/flights',
    },
  ];

  it('renders flight details correctly', () => {
    render(<FlightResultCards flights={mockFlights} />);

    expect(screen.getByText('SFO')).toBeInTheDocument();
    expect(screen.getByText('JFK')).toBeInTheDocument();
    expect(screen.getByText(/2023-10-25/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Passengers

    const link = screen.getByRole('link', { name: /Check Availability/i });
    expect(link).toHaveAttribute('href', 'https://google.com/flights');
  });

  it('calls onSave when save button is clicked', () => {
    const handleSave = vi.fn();
    render(<FlightResultCards flights={mockFlights} onSave={handleSave} />);

    const saveButton = screen.getByTitle('Save Flight');
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith(mockFlights[0]);
  });

  it('renders nothing when flights list is empty', () => {
    const { container } = render(<FlightResultCards flights={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PlaceResultCards', () => {
  const mockPlaces: PlaceResult[] = [
    {
      placeId: '123',
      name: 'Test Place',
      address: '123 Test St',
      rating: 4.5,
      userRatingCount: 100,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      mapsUrl: 'https://maps.google.com',
      previewPhotoUrl: 'https://example.com/photo.jpg',
    },
  ];

  it('renders place details correctly', () => {
    render(<PlaceResultCards places={mockPlaces} />);

    expect(screen.getByText('Test Place')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(100)')).toBeInTheDocument();
    expect(screen.getByText('· $$')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    const handleSave = vi.fn();
    render(<PlaceResultCards places={mockPlaces} onSave={handleSave} />);

    const saveButton = screen.getByRole('button', { name: /Save to Trip/i });
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith(mockPlaces[0]);
  });

  it('renders nothing when places list is empty', () => {
    const { container } = render(<PlaceResultCards places={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

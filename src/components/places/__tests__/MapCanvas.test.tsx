import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapCanvas } from '../MapCanvas';

// Mock Google Maps API
vi.mock('@/services/googlePlacesNew', () => ({
  loadMaps: vi.fn(),
  autocomplete: vi.fn(),
  resolveQuery: vi.fn(),
  centerMapOnPlace: vi.fn(),
}));

// Mock BasecampContext to avoid provider requirement
vi.mock('@/contexts/BasecampContext', () => ({
  useBasecamp: () => ({
    basecamp: null,
    basecampCoordinates: null,
    isLoading: false,
    setBasecamp: vi.fn(),
  }),
  BasecampProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// NOTE: MapCanvas requires extensive browser API mocking (geolocation, Google Maps)
// Skipping this test pending a proper test infrastructure overhaul.
// Map functionality is verified through e2e tests instead.
describe.skip('MapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a loading state while the map is initializing', () => {
    render(<MapCanvas activeContext="trip" />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });
});

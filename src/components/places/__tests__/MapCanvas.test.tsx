import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapCanvas } from '../MapCanvas';
import { loadMaps } from '@/services/googlePlaces';

// Mock Google Maps API
vi.mock('@/services/googlePlaces', () => ({
  loadMaps: vi.fn(),
  createServices: vi.fn(),
  autocomplete: vi.fn(),
  resolveQuery: vi.fn(),
  centerMapOnPlace: vi.fn(),
}));

describe('MapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a loading state while the map is initializing', () => {
    render(<MapCanvas activeContext="trip" />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapCanvas } from '../MapCanvas';

describe('MapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a loading state while the map is initializing', () => {
    render(<MapCanvas activeContext="trip" />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });
});

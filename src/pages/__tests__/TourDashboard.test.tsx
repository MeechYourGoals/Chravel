import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TourDashboard } from '../../components/TourDashboard';
import { proTripMockData } from '../../data/proTripMockData';

const renderWithRouter = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tour/pro-:proTripId/dashboard" element={<TourDashboard />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('TourDashboard route', () => {
  it('displays pro trip data for valid id', () => {
    renderWithRouter('/tour/pro-1/dashboard');
    expect(screen.getByRole('heading', { name: proTripMockData['1'].title })).toBeInTheDocument();
  });
});

import { PendingTripRequest } from '@/hooks/useMyPendingTrips';

// Dynamically calculate relative timestamps
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

// Import the Rose Bowl cover image
import iuRoseBowlCover from '@/assets/iu-rose-bowl-cover.jpg';

export const mockMyPendingRequests: PendingTripRequest[] = [
  {
    id: 'mock-request-1',
    trip_id: 'iu-rose-bowl-2026',
    requested_at: threeDaysAgo,
    trip: {
      id: 'iu-rose-bowl-2026',
      name: 'Indiana University Alumni Rose Bowl Trip',
      destination: 'Pasadena, California',
      start_date: '2026-05-15',
      cover_image_url: iuRoseBowlCover,
    },
  },
  {
    id: 'mock-request-2',
    trip_id: 'drake-tour-2026',
    requested_at: oneDayAgo,
    trip: {
      id: 'drake-tour-2026',
      name: 'Drake - Anita Max Win Tour',
      destination: 'Toronto ON → Houston TX → Atlanta GA',
      start_date: '2026-06-20',
      cover_image_url: undefined,
    },
  },
  {
    id: 'mock-request-3',
    trip_id: 'essence-fest-2026',
    requested_at: fiveHoursAgo,
    trip: {
      id: 'essence-fest-2026',
      name: 'Essence Festival 2026',
      destination: 'New Orleans, LA',
      start_date: '2026-07-03',
      cover_image_url: undefined,
    },
  },
];

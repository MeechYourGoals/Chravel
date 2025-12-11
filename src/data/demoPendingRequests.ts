import { PendingTripRequest } from '@/hooks/useMyPendingTrips';

export const demoPendingRequests: PendingTripRequest[] = [
  {
    id: 'demo-req-1',
    trip_id: 'demo-trip-consumer',
    requested_at: new Date().toISOString(),
    trip: {
      id: 'demo-trip-consumer',
      name: 'Summer Road Trip 2025',
      destination: 'Pacific Coast Highway, CA',
      start_date: '2025-07-15',
      cover_image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60', // Scenic road trip
    }
  },
  {
    id: 'demo-req-2',
    trip_id: 'demo-trip-pro',
    requested_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    trip: {
      id: 'demo-trip-pro',
      name: 'Global Executive Retreat',
      destination: 'Swiss Alps, Switzerland',
      start_date: '2025-09-20',
      cover_image_url: 'https://images.unsplash.com/photo-1531973819741-449e72495b01?w=800&auto=format&fit=crop&q=60', // Professional/Luxury
    }
  },
  {
    id: 'demo-req-3',
    trip_id: 'demo-trip-event',
    requested_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    trip: {
      id: 'demo-trip-event',
      name: 'Tech Innovators Summit',
      destination: 'Austin, TX',
      start_date: '2025-10-05',
      cover_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60', // Conference/Event
    }
  }
];

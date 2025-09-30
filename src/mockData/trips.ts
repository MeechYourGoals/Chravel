import { Trip } from '@/services/tripService';

export const mockConsumerTrips: Trip[] = [
  {
    id: '1',
    name: 'Spring Break Cancun',
    description: 'Beach vacation with the crew',
    destination: 'Cancun, Mexico',
    start_date: '2026-03-15',
    end_date: '2026-03-22',
    cover_image_url: '/images/trips/cancun.jpg',
    created_by: 'mock-user-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    is_archived: false,
    trip_type: 'consumer'
  },
  {
    id: '2',
    name: 'Tokyo Adventure',
    description: 'Exploring Japan with friends',
    destination: 'Tokyo, Japan',
    start_date: '2026-06-10',
    end_date: '2026-06-17',
    cover_image_url: '/images/trips/tokyo.jpg',
    created_by: 'mock-user-1',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
    is_archived: false,
    trip_type: 'consumer'
  },
  {
    id: '3',
    name: '2026 Kappa Alpha Side Trip',
    description: 'Alumni weekend getaway',
    destination: 'Charleston, SC',
    start_date: '2026-04-05',
    end_date: '2026-04-08',
    cover_image_url: '/images/trips/charleston.jpg',
    created_by: 'mock-user-1',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    is_archived: false,
    trip_type: 'consumer'
  }
];

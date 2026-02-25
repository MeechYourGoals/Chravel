export const mockBroadcasts = [
  {
    id: 'mock-broadcast-1',
    trip_id: '1',
    message: 'Just booked my flight, landing at 3:30 on Friday',
    priority: 'fyi' as const,
    created_by: 'mock-user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_sent: true,
  },
];

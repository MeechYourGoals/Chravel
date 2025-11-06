export const mockNotifications = [
  {
    id: 'mock-notif-1',
    type: 'message' as const,
    title: 'New message in Spring Break Cancun',
    message: 'Sarah Chen: Super excited for this trip!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    read: false,
    tripId: '1'
  },
  {
    id: 'mock-notif-2',
    type: 'broadcast' as const,
    title: 'Broadcast in Spring Break Cancun',
    message: 'Marcus Johnson: Just booked my flight',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    read: false,
    tripId: '1'
  },
  {
    id: 'mock-notif-3',
    type: 'broadcast' as const,
    title: 'Team Meeting - Corporate Retreat LA',
    message: 'Meeting at hotel lobby at 9am sharp tomorrow for group activity.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: false,
    tripId: 'pro-trip-1'
  },
  {
    id: 'mock-notif-4',
    type: 'calendar' as const,
    title: 'Agenda Updated - Tech Conference 2025',
    message: 'The agenda for Tech Conference 2025 has been updated. Several speakers have moved time slots.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    read: false,
    tripId: 'event-trip-1'
  },
  {
    id: 'mock-notif-5',
    type: 'poll' as const,
    title: 'Task Assigned - Tokyo Adventure',
    message: 'Emily Rodriguez assigned you: "Book transportation from airport to hotel"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: false,
    tripId: '2'
  },
  {
    id: 'mock-notif-6',
    type: 'calendar' as const,
    title: 'Trip Reminder - Tokyo Adventure',
    message: 'Tokyo Adventure starts in one week! Time to finalize your packing list.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    read: true,
    tripId: '2'
  },
  {
    id: 'mock-notif-7',
    type: 'message' as const,
    title: 'Payment Request - Spring Break Cancun',
    message: 'Alex Kim requested $45 for dinner at Sushi Palace',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    tripId: '1'
  },
  {
    id: 'mock-notif-8',
    type: 'photos' as const,
    title: 'New Photos - Spring Break Cancun',
    message: 'Sarah Chen uploaded 15 new photos to Spring Break Cancun album',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    read: true,
    tripId: '1'
  }
];

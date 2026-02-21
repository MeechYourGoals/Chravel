// Demo notifications covering all notification types with REAL demo trip/event IDs
// Each notification deep-links correctly to the corresponding trip/tab

export type NotificationType =
  | 'broadcast'
  | 'calendar_event'
  | 'payment'
  | 'task'
  | 'poll'
  | 'join_request'
  | 'basecamp_update'
  | 'media';

export interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tripId: string;
  tripType?: 'consumer' | 'pro' | 'event';
  focusTab?: string; // Tab to navigate to
  focusId?: string; // Specific item ID (payment, task, poll, etc.)
  data?: {
    trip_id?: string;
    trip_name?: string;
    requester_id?: string;
    requester_name?: string;
    request_id?: string;
    payment_id?: string;
    task_id?: string;
    poll_id?: string;
    event_id?: string;
    actor_name?: string;
    actor_avatar?: string;
  };
}

export const mockNotifications: MockNotification[] = [
  // ===== JOIN REQUEST - Jack & Jill's Wedding (id: 3) =====
  {
    id: 'notif-join-request-1',
    type: 'join_request',
    title: "Join Request - The Tyler's Tie The Knot",
    message: 'Emily Rodriguez would like to join your trip',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    read: false,
    tripId: '3',
    tripType: 'consumer',
    focusTab: 'collaborators',
    data: {
      trip_id: '3',
      trip_name: "The Tyler's Tie The Knot",
      requester_id: 'demo-user-emily',
      requester_name: 'Emily Rodriguez',
      request_id: 'demo-request-1',
      actor_name: 'Emily Rodriguez',
      actor_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    },
  },

  // ===== BROADCAST - Lakers Road Trip (Pro) =====
  {
    id: 'notif-broadcast-1',
    type: 'broadcast',
    title: 'Broadcast - Lakers Road Trip',
    message: 'Team Manager: Bus departure moved to 4:30 PM. Be in lobby by 4:15.',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    read: false,
    tripId: 'lakers-road-trip',
    tripType: 'pro',
    focusTab: 'broadcasts',
    data: {
      trip_id: 'lakers-road-trip',
      trip_name: 'Lakers Road Trip - Western Conference',
      actor_name: 'Team Manager',
      actor_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    },
  },

  // ===== PAYMENT - Corporate Ski Trip Aspen (id: 10) =====
  {
    id: 'notif-payment-1',
    type: 'payment',
    title: 'Payment Request - Corporate Ski Trip',
    message: 'Tom Nguyen requested $125 for ski lift passes',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    read: false,
    tripId: '10',
    tripType: 'consumer',
    focusTab: 'payments',
    focusId: 'demo-payment-1',
    data: {
      trip_id: '10',
      trip_name: 'Corporate Holiday Ski Trip – Aspen',
      payment_id: 'demo-payment-1',
      actor_name: 'Tom Nguyen',
      actor_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    },
  },

  // ===== TASK - Tokyo Adventure (id: 2) =====
  {
    id: 'notif-task-1',
    type: 'task',
    title: 'Task Assigned - Tokyo Adventure',
    message: 'Alex assigned you: "Book JR Pass for group transportation"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    read: false,
    tripId: '2',
    tripType: 'consumer',
    focusTab: 'tasks',
    focusId: 'demo-task-1',
    data: {
      trip_id: '2',
      trip_name: 'Tokyo Adventure',
      task_id: 'demo-task-1',
      actor_name: 'Alex Chen',
      actor_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    },
  },

  // ===== POLL - Coachella Squad (id: 5) =====
  {
    id: 'notif-poll-1',
    type: 'poll',
    title: 'New Poll - Coachella Squad 2026',
    message: 'Tyler created a poll: "Which headliner should we prioritize?"',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    read: false,
    tripId: '5',
    tripType: 'consumer',
    focusTab: 'polls',
    focusId: 'demo-poll-1',
    data: {
      trip_id: '5',
      trip_name: 'Coachella Squad 2026',
      poll_id: 'demo-poll-1',
      actor_name: 'Tyler Martinez',
      actor_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    },
  },

  // ===== CALENDAR - SXSW 2025 (Event) =====
  {
    id: 'notif-calendar-1',
    type: 'calendar_event',
    title: 'Agenda Updated - SXSW 2025',
    message: 'Opening Keynote moved to 11:00 AM. Interactive Showcase now starts at 12:30 PM.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: false,
    tripId: 'sxsw-2025',
    tripType: 'event',
    focusTab: 'calendar',
    data: {
      trip_id: 'sxsw-2025',
      trip_name: 'SXSW 2025',
      event_id: 'a2',
      actor_name: 'Event Organizer',
    },
  },

  // ===== BASECAMP - Kristen's Bachelorette (id: 4) =====
  {
    id: 'notif-basecamp-1',
    type: 'basecamp_update',
    title: "Basecamp Updated - Kristen's Bachelorette",
    message: 'Ashley updated the hotel: Now staying at The Hermitage Hotel, 231 6th Ave N',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    read: false,
    tripId: '4',
    tripType: 'consumer',
    focusTab: 'places',
    data: {
      trip_id: '4',
      trip_name: "Kristen's Bachelorette Party",
      actor_name: 'Ashley Miller',
      actor_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    },
  },

  // ===== PHOTOS - Spring Break Cancun (id: 1) =====
  {
    id: 'notif-photos-1',
    type: 'media',
    title: 'New Photos - Spring Break Cancun',
    message: 'Sarah Chen uploaded 15 new photos to Spring Break Cancun album',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
    read: false,
    tripId: '1',
    tripType: 'consumer',
    focusTab: 'media',
    data: {
      trip_id: '1',
      trip_name: 'Spring Break Cancun 2026 Kappa Alpha Psi Trip',
      actor_name: 'Sarah Chen',
      actor_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    },
  },

  // ===== Additional notifications for variety =====

  // BROADCAST - Beyoncé Tour (Pro)
  {
    id: 'notif-broadcast-2',
    type: 'broadcast',
    title: 'Broadcast - Cowboy Carter Tour',
    message: 'Tour Manager: Soundcheck at 3 PM. All crew report to stage.',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
    read: true,
    tripId: 'beyonce-cowboy-carter-tour',
    tripType: 'pro',
    focusTab: 'broadcasts',
    data: {
      trip_id: 'beyonce-cowboy-carter-tour',
      trip_name: 'Beyoncé Cowboy Carter World Tour',
      actor_name: 'Tour Manager',
    },
  },

  // CALENDAR - Invest Fest 2025 (Event)
  {
    id: 'notif-calendar-2',
    type: 'calendar_event',
    title: 'Event Reminder - Invest Fest 2025',
    message: 'Robert Kiyosaki keynote starts in 1 hour at Hall A - Main Stage',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    read: true,
    tripId: 'invest-fest-2025',
    tripType: 'event',
    focusTab: 'calendar',
    data: {
      trip_id: 'invest-fest-2025',
      trip_name: 'Invest Fest 2025',
      event_id: 'if-a2',
    },
  },

  // PAYMENT - Johnson Family Vacay (id: 6)
  {
    id: 'notif-payment-2',
    type: 'payment',
    title: 'Payment Settled - Johnson Family Vacay',
    message: 'Dad (Mike) marked the spa treatment expense as settled',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    tripId: '6',
    tripType: 'consumer',
    focusTab: 'payments',
    data: {
      trip_id: '6',
      trip_name: 'Johnson Family Summer Vacay',
      payment_id: 'demo-payment-2',
      actor_name: 'Dad (Mike)',
    },
  },

  // TASK - Tulum Wellness (id: 8)
  {
    id: 'notif-task-2',
    type: 'task',
    title: 'Task Completed - Tulum Wellness Retreat',
    message: 'Maya Patel completed: "Reserve yoga studio for group session"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    read: true,
    tripId: '8',
    tripType: 'consumer',
    focusTab: 'tasks',
    data: {
      trip_id: '8',
      trip_name: 'Tulum Wellness Retreat',
      task_id: 'demo-task-2',
      actor_name: 'Maya Patel',
    },
  },
];

// Helper to get unread count
export const getUnreadNotificationCount = (): number => {
  return mockNotifications.filter(n => !n.read).length;
};

// Helper to get notifications by trip
export const getNotificationsByTrip = (tripId: string): MockNotification[] => {
  return mockNotifications.filter(n => n.tripId === tripId);
};

// Helper to get notifications by type
export const getNotificationsByType = (type: NotificationType): MockNotification[] => {
  return mockNotifications.filter(n => n.type === type);
};

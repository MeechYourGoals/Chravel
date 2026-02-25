import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const ohioStateNotreDame: ProTripData = {
  id: 'osu-notredame-2025',
  title: 'Ohio State vs Notre Dame – Away Game 2025',
  description:
    'Ohio State Buckeyes away game against Notre Dame Fighting Irish at Notre Dame Stadium.',
  location: 'South Bend, IN',
  dateRange: 'Sep 13 - Sep 14, 2025',
  proTripCategory: 'sports',
  tags: [],
  basecamp_name: 'Notre Dame Stadium',
  basecamp_address: 'Notre Dame, IN 46556',
  tasks: [
    {
      id: 'task-osu-1',
      title: 'Equipment truck departure confirmation',
      description: 'Verify all equipment loaded and truck departed on schedule',
      completed: true,
      due_at: '2025-09-12',
      assigned_to: 'operations',
      created_at: new Date(Date.now() - 604800000).toISOString(),
    },
    {
      id: 'task-osu-2',
      title: 'Player eligibility verification',
      description: 'NCAA compliance check for all traveling players',
      completed: false,
      due_at: '2025-09-13',
      assigned_to: 'compliance',
      created_at: new Date().toISOString(),
    },
  ],
  polls: [
    {
      id: 'poll-osu-1',
      question: 'Preferred team meal time on game day?',
      options: [
        { id: 'opt1', text: '10:00 AM (Early)', votes: 45 },
        { id: 'opt2', text: '11:00 AM (Standard)', votes: 82 },
        { id: 'opt3', text: '12:00 PM (Late)', votes: 23 },
      ],
      total_votes: 150,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  links: [
    {
      id: 'link-osu-1',
      url: 'https://www.nd.edu/stadium',
      title: 'Notre Dame Stadium Information',
      description: 'Venue details and parking instructions',
      domain: 'nd.edu',
      created_at: new Date().toISOString(),
      source: 'places',
    },
    {
      id: 'link-osu-2',
      url: 'https://morrisinn.nd.edu',
      title: 'Morris Inn - Team Hotel',
      description: 'Official team accommodation',
      domain: 'morrisinn.nd.edu',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual',
    },
  ],
  broadcasts: [
    {
      id: 'bc-osu-1',
      senderId: '1',
      message: 'Weather forecast shows rain. Bring rain gear and waterproof equipment covers.',
      targetTrips: ['osu-notredame-2025'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4'],
    },
    {
      id: 'bc-osu-2',
      senderId: '3',
      message:
        'URGENT: Stadium access restricted to credentialed personnel only. Ensure all IDs visible.',
      targetTrips: ['osu-notredame-2025'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      readBy: ['1', '2'],
    },
  ],
  participants: Array.from({ length: 150 }, (_, i) => {
    const id = String(301 + i);

    if (i < 15) {
      const coaches = [
        'Ryan Day',
        'Offensive Coordinator',
        'Defensive Coordinator',
        'Special Teams Coach',
        'QB Coach',
        'RB Coach',
        'WR Coach',
        'OL Coach',
        'DL Coach',
        'LB Coach',
        'DB Coach',
        'Strength Coach',
        'Assistant Coach 1',
        'Assistant Coach 2',
        'Graduate Assistant',
      ];
      return {
        id,
        name: coaches[i] || `Coach ${i + 1}`,
        avatar: getMockAvatar(coaches[i] || `Coach ${i + 1}`),
        role: 'Coaches',
      };
    } else if (i < 100) {
      const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS'];
      const position = positions[i % positions.length];
      const playerNumber = Math.floor((i - 15) / 11) + 1;
      const playerName = `${position} Player ${playerNumber}`;
      return { id, name: playerName, avatar: getMockAvatar(playerName), role: 'Players' };
    } else if (i < 115) {
      const medical = [
        'Head Team Doctor',
        'Orthopedic Surgeon',
        'Athletic Trainer 1',
        'Athletic Trainer 2',
        'Athletic Trainer 3',
        'Physical Therapist',
        'Massage Therapist',
        'Nutritionist',
        'Mental Health Specialist',
        'Team Chaplain',
        'Logistics Manager',
        'Assistant Logistics Manager',
        'Video Coordinator',
        'Technology Specialist',
        'Academic Advisor',
      ];
      const staffName = medical[i - 100] || `Medical Staff ${i - 99}`;
      return { id, name: staffName, avatar: getMockAvatar(staffName), role: 'Medical Staff' };
    } else if (i < 135) {
      const admin = [
        'Athletic Director',
        'Team Manager',
        'Operations Manager',
        'Travel Coordinator',
        'Compliance Officer',
        'Sports Information Director',
        'Media Relations',
        'Security Chief',
        'Bus Driver 1',
        'Bus Driver 2',
        'Team Chef',
        'Logistics Coordinator',
        'Administrative Assistant 1',
        'Administrative Assistant 2',
        'Guest Relations',
      ];
      const staffName = admin[i - 115] || `Admin Staff ${i - 114}`;
      return { id, name: staffName, avatar: getMockAvatar(staffName), role: 'Management' };
    } else {
      const support = [
        'Team Photographer',
        'Video Production',
        'Broadcasting Coordinator',
        'Alumni Relations',
        'Fan Experience Coordinator',
        'Band Director',
        'Cheerleading Coach',
        'Mascot Coordinator',
        'Facility Operations',
        'Maintenance Supervisor',
        'Security Officer 1',
        'Security Officer 2',
        'VIP Host',
        'Game Operations',
        'Emergency Coordinator',
      ];
      const staffName = support[i - 135] || `Support Staff ${i - 134}`;
      return { id, name: staffName, avatar: getMockAvatar(staffName), role: 'Support Staff' };
    }
  }),
  budget: {
    total: 250000,
    spent: 75000,
    categories: [
      { name: 'Travel', budgeted: 80000, spent: 25000 },
      { name: 'Accommodation', budgeted: 70000, spent: 20000 },
      { name: 'Meals', budgeted: 50000, spent: 15000 },
      { name: 'Logistics', budgeted: 50000, spent: 15000 },
    ],
  },
  itinerary: [
    {
      date: '2025-09-13',
      events: [
        { time: '08:00', title: 'Team Departure', location: 'Columbus Airport', type: 'travel' },
        {
          time: '11:30',
          title: 'Arrival in South Bend',
          location: 'South Bend Airport',
          type: 'travel',
        },
        { time: '14:00', title: 'Hotel Check-in', location: 'Morris Inn', type: 'travel' },
        { time: '16:00', title: 'Team Practice', location: 'Notre Dame Stadium', type: 'meeting' },
        { time: '19:00', title: 'Team Dinner', location: 'Morris Inn Dining', type: 'meeting' },
      ],
    },
  ],
  roster: [
    {
      id: '1',
      name: 'Ryan Day',
      email: 'rday@osu.edu',
      avatar: getMockAvatar('Ryan Day'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'team-management'],
      roomPreferences: ['suite', 'quiet-floor'],
      dietaryRestrictions: [],
    },
    {
      id: '2',
      name: 'Marvin Harrison Jr.',
      email: 'mharrison@osu.edu',
      avatar: getMockAvatar('Marvin Harrison Jr.'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['double-room', 'teammate-pairing'],
      dietaryRestrictions: [],
    },
    {
      id: '3',
      name: 'Kyle McCord',
      email: 'kmccord@osu.edu',
      avatar: getMockAvatar('Kyle McCord'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['double-room', 'teammate-pairing'],
      dietaryRestrictions: ['no-shellfish'],
    },
    {
      id: '4',
      name: 'Kate Hoke',
      email: 'khoke@osu.edu',
      avatar: getMockAvatar('Kate Hoke'),
      role: 'Medical Staff',
      credentialLevel: 'Backstage',
      permissions: ['medical-facilities', 'team-coordination'],
      roomPreferences: ['single-room', 'near-elevator'],
      dietaryRestrictions: ['vegetarian'],
    },
  ],
  roomAssignments: [
    {
      id: 'room-osu1',
      room: 'Suite 301',
      hotel: 'Morris Inn',
      occupants: ['1'],
      checkIn: '2025-09-13T14:00:00Z',
      checkOut: '2025-09-14T11:00:00Z',
      roomType: 'suite',
      specialRequests: ['late-checkout', 'quiet-floor'],
    },
  ],
  schedule: [
    {
      id: 'sched-osu1',
      type: 'meeting',
      title: 'Pre-game Strategy Meeting',
      startTime: '2025-09-13T20:30:00Z',
      endTime: '2025-09-13T21:30:00Z',
      location: 'Morris Inn Conference Room',
      participants: ['1', '2', '3'],
      priority: 'high',
      notes: 'Review Notre Dame defensive schemes',
    },
  ],
  perDiem: {
    dailyRate: 125,
    currency: 'USD',
    startDate: '2025-09-13',
    endDate: '2025-09-14',
    participants: [
      { participantId: '1', customRate: 200, advances: 0, deductions: 0, balance: 400 },
      { participantId: '2', customRate: 125, advances: 0, deductions: 0, balance: 250 },
    ],
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-osu1',
      type: 'safety',
      title: 'NCAA Travel Protocols',
      description: 'All team members must follow NCAA travel and eligibility guidelines',
      deadline: '2025-09-12',
      status: 'compliant',
      assignedTo: '1',
      documents: ['ncaa-travel-policy.pdf'],
    },
  ],
  media: [],
  sponsors: [],
};

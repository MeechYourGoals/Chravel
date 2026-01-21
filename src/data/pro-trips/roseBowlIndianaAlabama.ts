import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const roseBowlIndianaAlabama: ProTripData = {
  id: 'rose-bowl-indiana-alabama-2025',
  title: 'Rose Bowl: Indiana vs Alabama',
  description: 'Indiana Hoosiers facing Alabama Crimson Tide in the historic Rose Bowl Championship.',
  location: 'Pasadena, California',
  dateRange: 'December 29, 2025 - Jan 2, 2026',
  proTripCategory: 'Sports – Pro, Collegiate, Youth',
  tags: [],
  basecamp_name: 'Rose Bowl Stadium',
  basecamp_address: '1001 Rose Bowl Dr, Pasadena, CA 91103',
  tasks: [
    {
      id: 'task-rb-1',
      title: 'Equipment truck departure confirmation',
      description: 'Verify all equipment loaded and truck departed on schedule',
      completed: true,
      due_at: '2025-12-28',
      assigned_to: 'operations',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-rb-2',
      title: 'Player eligibility verification',
      description: 'NCAA compliance check for all traveling players',
      completed: false,
      due_at: '2025-12-29',
      assigned_to: 'compliance',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-rb-1',
      question: 'Preferred team meal time on game day?',
      options: [
        { id: 'opt1', text: '10:00 AM (Early)', votes: 35 },
        { id: 'opt2', text: '11:00 AM (Standard)', votes: 42 },
        { id: 'opt3', text: '12:00 PM (Late)', votes: 12 }
      ],
      total_votes: 89,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-rb-1',
      url: 'https://www.rosebowlstadium.com',
      title: 'Rose Bowl Stadium Information',
      description: 'Venue details and parking instructions',
      domain: 'rosebowlstadium.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-rb-2',
      url: 'https://www.ritzcarlton.com/pasadena',
      title: 'Ritz-Carlton Pasadena - Team Hotel',
      description: 'Official team accommodation',
      domain: 'ritzcarlton.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-rb-1',
      senderId: '1',
      message: 'Weather forecast shows clear skies. Perfect conditions for the Rose Bowl!',
      targetTrips: ['rose-bowl-indiana-alabama-2025'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4']
    },
    {
      id: 'bc-rb-2',
      senderId: '3',
      message: 'URGENT: Stadium access restricted to credentialed personnel only. Ensure all IDs visible.',
      targetTrips: ['rose-bowl-indiana-alabama-2025'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      readBy: ['1', '2']
    }
  ],
  participants: Array.from({ length: 89 }, (_, i) => {
    const id = String(501 + i);

    if (i < 12) {
      const coaches = ['Curt Cignetti', 'Offensive Coordinator', 'Defensive Coordinator', 'Special Teams Coach', 'QB Coach', 'RB Coach', 'WR Coach', 'OL Coach', 'DL Coach', 'LB Coach', 'DB Coach', 'Strength Coach'];
      return { id, name: coaches[i] || `Coach ${i + 1}`, avatar: getMockAvatar(coaches[i] || `Coach ${i + 1}`), role: 'Coaches' };
    } else if (i < 60) {
      const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS'];
      const position = positions[(i - 12) % positions.length];
      const playerNumber = Math.floor((i - 12) / 11) + 1;
      const playerName = `${position} Player ${playerNumber}`;
      return { id, name: playerName, avatar: getMockAvatar(playerName), role: 'Players' };
    } else if (i < 72) {
      const medical = ['Head Team Doctor', 'Athletic Trainer 1', 'Athletic Trainer 2', 'Physical Therapist', 'Nutritionist', 'Mental Health Specialist', 'Team Chaplain', 'Video Coordinator', 'Technology Specialist', 'Academic Advisor', 'Logistics Manager', 'Assistant Logistics Manager'];
      const staffName = medical[i - 60] || `Medical Staff ${i - 59}`;
      return { id, name: staffName, avatar: getMockAvatar(staffName), role: 'Medical Staff' };
    } else {
      const admin = ['Athletic Director', 'Team Manager', 'Operations Manager', 'Travel Coordinator', 'Compliance Officer', 'Sports Information Director', 'Media Relations', 'Security Chief', 'Bus Driver 1', 'Bus Driver 2', 'Team Chef', 'Logistics Coordinator', 'Administrative Assistant 1', 'Administrative Assistant 2', 'Guest Relations', 'Support Staff 1', 'Support Staff 2'];
      const staffName = admin[i - 72] || `Support Staff ${i - 71}`;
      return { id, name: staffName, avatar: getMockAvatar(staffName), role: 'Support Staff' };
    }
  }),
  budget: {
    total: 500000,
    spent: 125000,
    categories: [
      { name: 'Travel', budgeted: 150000, spent: 40000 },
      { name: 'Accommodation', budgeted: 200000, spent: 55000 },
      { name: 'Meals', budgeted: 100000, spent: 20000 },
      { name: 'Logistics', budgeted: 50000, spent: 10000 }
    ]
  },
  itinerary: [
    {
      date: '2025-12-29',
      events: [
        { time: '08:00', title: 'Team Departure', location: 'Bloomington Airport', type: 'travel' },
        { time: '13:30', title: 'Arrival in Los Angeles', location: 'LAX Airport', type: 'travel' },
        { time: '16:00', title: 'Hotel Check-in', location: 'Ritz-Carlton Pasadena', type: 'travel' },
        { time: '18:00', title: 'Team Practice', location: 'Rose Bowl Stadium', type: 'meeting' },
        { time: '20:00', title: 'Team Dinner', location: 'Langham Huntington Pasadena', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Curt Cignetti',
      email: 'ccignetti@indiana.edu',
      avatar: getMockAvatar('Curt Cignetti'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'team-management'],
      roomPreferences: ['suite', 'quiet-floor'],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Fernando Mendoza',
      email: 'fmendoza@indiana.edu',
      avatar: getMockAvatar('Fernando Mendoza'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['double-room', 'teammate-pairing'],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'Elijah Sarratt',
      email: 'esarratt@indiana.edu',
      avatar: getMockAvatar('Elijah Sarratt'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['double-room', 'teammate-pairing'],
      dietaryRestrictions: []
    },
    {
      id: '4',
      name: 'Charlie Becker',
      email: 'cbecker@indiana.edu',
      avatar: getMockAvatar('Charlie Becker'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['double-room', 'teammate-pairing'],
      dietaryRestrictions: []
    },
    {
      id: '5',
      name: 'Kate Hoke',
      email: 'khoke@indiana.edu',
      avatar: getMockAvatar('Kate Hoke'),
      role: 'Medical Staff',
      credentialLevel: 'Backstage',
      permissions: ['medical-facilities', 'team-coordination'],
      roomPreferences: ['single-room', 'near-elevator'],
      dietaryRestrictions: ['vegetarian']
    }
  ],
  roomAssignments: [
    {
      id: 'room-rb1',
      room: 'Suite 501',
      hotel: 'Ritz-Carlton Pasadena',
      occupants: ['1'],
      checkIn: '2025-12-29T16:00:00Z',
      checkOut: '2026-01-02T11:00:00Z',
      roomType: 'suite',
      specialRequests: ['late-checkout', 'quiet-floor']
    }
  ],
  schedule: [
    {
      id: 'sched-rb1',
      type: 'meeting',
      title: 'Pre-game Strategy Meeting',
      startTime: '2025-12-30T20:30:00Z',
      endTime: '2025-12-30T21:30:00Z',
      location: 'Ritz-Carlton Conference Room',
      participants: ['1', '2', '3', '4'],
      priority: 'high',
      notes: 'Review Alabama defensive schemes and game plan'
    }
  ],
  perDiem: {
    dailyRate: 150,
    currency: 'USD',
    startDate: '2025-12-29',
    endDate: '2026-01-02',
    participants: [
      { participantId: '1', customRate: 250, advances: 0, deductions: 0, balance: 1250 },
      { participantId: '2', customRate: 150, advances: 0, deductions: 0, balance: 750 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-rb1',
      type: 'safety',
      title: 'NCAA Travel Protocols',
      description: 'All team members must follow NCAA travel and eligibility guidelines',
      deadline: '2025-12-28',
      status: 'compliant',
      assignedTo: '1',
      documents: ['ncaa-travel-policy.pdf']
    }
  ],
  media: [],
  sponsors: []
};

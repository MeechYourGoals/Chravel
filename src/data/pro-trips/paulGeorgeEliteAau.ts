import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const paulGeorgeEliteAau: ProTripData = {
  id: 'paul-george-elite-aau-nationals-2025',
  title: "Paul George Elite AAU Nationals '25",
  description: 'AAU National Championship tournament for Paul George Elite 17U basketball team.',
  location: 'Orlando FL',
  dateRange: 'Jul 8 - Jul 14, 2025',
  proTripCategory: 'Sports – Pro, Collegiate, Youth',
  tags: ['Sports – Team Trip', 'Basketball', 'AAU', 'Nationals'],
  basecamp_name: 'Orange County Convention Center',
  basecamp_address: '9800 International Drive, Orlando, FL 32819',
  tasks: [
    {
      id: 'task-pg-1',
      title: 'Confirm all player AAU membership cards',
      description: 'Verify current AAU memberships and eligibility for all roster players',
      completed: true,
      due_at: '2025-07-07',
      assigned_to: 'team-manager',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-pg-2',
      title: 'Submit tournament roster to officials',
      description: 'Final roster submission with jersey numbers to tournament desk',
      completed: false,
      due_at: '2025-07-09',
      assigned_to: 'director',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-pg-1',
      question: 'Team dinner location after first game?',
      options: [
        { id: 'opt1', text: 'Chipotle', votes: 28 },
        { id: 'opt2', text: 'Chick-fil-A', votes: 52 },
        { id: 'opt3', text: 'Pizza Hut', votes: 15 }
      ],
      total_votes: 95,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-pg-1',
      url: 'https://www.espnwwos.com/tournaments',
      title: 'ESPN Wide World of Sports - Tournament Brackets',
      description: 'Official tournament schedule and bracket information',
      domain: 'espnwwos.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-pg-2',
      url: 'https://disneyworld.disney.go.com/resorts/grand-floridian',
      title: 'Disney Grand Floridian - Team Hotel',
      description: 'Team accommodation and amenities',
      domain: 'disney.go.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-pg-1',
      senderId: '101',
      message: 'Breakfast at 7 AM sharp tomorrow. Bus leaves hotel at 8:15 AM for tournament check-in.',
      targetTrips: ['paul-george-elite-aau-nationals-2025'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['102', '103', '104']
    },
    {
      id: 'bc-pg-2',
      senderId: '102',
      message: 'Great job today team! Pool play continues tomorrow at 2 PM on Court 5.',
      targetTrips: ['paul-george-elite-aau-nationals-2025'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['101', '103']
    }
  ],
  participants: Array.from({ length: 120 }, (_, i) => {
    const id = 101 + i;
    
    if (i < 10) {
      const coaches = ['Matt Barnes', 'Brandon Lincoln', 'Byron Joseph', 'Jerald Dickson', 'Dave McClure', 'Travis Oscar', 'Eddie Cruz', 'Paul George', 'Assistant Coach 1', 'Assistant Coach 2'];
      const name = coaches[i] || `Coach ${i + 1}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Coaches' };
    } else if (i < 20) {
      const staff = ['Team Manager', 'Logistics Manager', 'Team Doctor', 'Athletic Trainer', 'Team Photographer', 'Video Coordinator', 'Nutrition Specialist', 'Transportation Coordinator', 'Team Administrator', 'Academic Advisor'];
      const name = staff[i - 10] || `Staff ${i - 9}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Staff' };
    } else if (i < 100) {
      const playerNames = ['Carter Bryant', 'Jaden DePina', 'James Evans Jr.', 'Ifiok Peter', 'Michael Johnson', 'David Williams', 'Chris Brown', 'Kevin Davis', 'Anthony Miller', 'Brandon Wilson'];
      const playerIndex = (i - 20) % playerNames.length;
      const teamNumber = Math.floor((i - 20) / 10) + 1;
      const name = `${playerNames[playerIndex]} (T${teamNumber})`;
      return { id, name, avatar: getMockAvatar(name), role: 'Players' };
    } else {
      const chaperones = ['Parent Chaperone', 'Team Volunteer', 'Guardian', 'Family Representative'];
      const chaperoneIndex = (i - 100) % chaperones.length;
      const name = `${chaperones[chaperoneIndex]} ${i - 99}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Chaperones' };
    }
  }),
  budget: {
    total: 45000,
    spent: 18500,
    categories: [
      { name: 'Travel', budgeted: 15000, spent: 6500 },
      { name: 'Accommodation', budgeted: 18000, spent: 8000 },
      { name: 'Meals', budgeted: 8000, spent: 3000 },
      { name: 'Tournament Fees', budgeted: 4000, spent: 1000 }
    ]
  },
  itinerary: [
    {
      date: '2025-07-08',
      events: [
        { time: '07:00', title: 'Team Bus Departure', location: 'PG Elite Training Facility', type: 'travel' },
        { time: '18:00', title: 'Arrival Orlando', location: 'Disney World Resort', type: 'travel' },
        { time: '19:30', title: 'Team Dinner & Meeting', location: 'Resort Conference Room', type: 'meeting' },
        { time: '21:00', title: 'Room Check & Curfew', location: 'Hotel Rooms', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '101',
      name: 'Matt Barnes',
      email: 'mbarnes@pgelite.com',
      avatar: getMockAvatar('Matt Barnes'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'medical-access', 'facility-access'],
      roomPreferences: ['single-room', 'near-team'],
      dietaryRestrictions: []
    },
    {
      id: '102',
      name: 'Brandon Lincoln',
      email: 'blincoln@pgelite.com',
      avatar: getMockAvatar('Brandon Lincoln'),
      role: 'Directors',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'facility-access', 'tournament-admin'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '103',
      name: 'Byron Joseph',
      email: 'bjoseph@pgelite.com',
      avatar: getMockAvatar('Byron Joseph'),
      role: 'Directors',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'facility-access'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '104',
      name: 'Jerald Dickson',
      email: 'jdickson@pgelite.com',
      avatar: getMockAvatar('Jerald Dickson'),
      role: 'Staff',
      credentialLevel: 'Backstage',
      permissions: ['facility-access', 'operations'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '105',
      name: 'Dave McClure',
      email: 'dmcclure@pgelite.com',
      avatar: getMockAvatar('Dave McClure'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'medical-access'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '106',
      name: 'Travis Oscar',
      email: 'toscar@pgelite.com',
      avatar: getMockAvatar('Travis Oscar'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'youth-coordination'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '107',
      name: 'Eddie Cruz',
      email: 'ecruz@pgelite.com',
      avatar: getMockAvatar('Eddie Cruz'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'program-coaching'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '108',
      name: 'Carter Bryant',
      email: 'cbryant@pgelite.com',
      avatar: getMockAvatar('Carter Bryant'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['court-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '109',
      name: 'Jaden DePina',
      email: 'jdepina@pgelite.com',
      avatar: getMockAvatar('Jaden DePina'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['court-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '110',
      name: 'James Evans Jr.',
      email: 'jevans@pgelite.com',
      avatar: getMockAvatar('James Evans Jr.'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['court-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: ['no-dairy']
    },
    {
      id: '111',
      name: 'Ifiok Peter',
      email: 'ipeter@pgelite.com',
      avatar: getMockAvatar('Ifiok Peter'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['court-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-pg1',
      room: 'Room 301',
      hotel: 'Disney World Grand Floridian',
      occupants: ['108', '109'],
      checkIn: '2025-07-08T18:00:00Z',
      checkOut: '2025-07-14T11:00:00Z',
      roomType: 'double',
      specialRequests: ['connecting-rooms', 'ground-floor']
    },
    {
      id: 'room-pg2',
      room: 'Room 302',
      hotel: 'Disney World Grand Floridian',
      occupants: ['110', '111'],
      checkIn: '2025-07-08T18:00:00Z',
      checkOut: '2025-07-14T11:00:00Z',
      roomType: 'double',
      specialRequests: ['connecting-rooms']
    }
  ],
  schedule: [
    {
      id: 'sched-pg1',
      type: 'meeting',
      title: 'Tournament Check-in & Registration',
      startTime: '2025-07-09T08:00:00Z',
      endTime: '2025-07-09T10:00:00Z',
      location: 'ESPN Wide World of Sports',
      participants: ['102', '101'],
      priority: 'high',
      notes: 'Bring all player AAU cards and documentation'
    },
    {
      id: 'sched-pg2',
      type: 'meeting',
      title: 'Pool Play Game 1 vs Team Charlotte',
      startTime: '2025-07-09T14:00:00Z',
      endTime: '2025-07-09T16:00:00Z',
      location: 'Court 3 - ESPN WWOS',
      participants: ['101', '102', '108', '109', '110', '111'],
      priority: 'high',
      notes: 'RED jerseys - be at court 45 min early'
    }
  ],
  perDiem: {
    dailyRate: 75,
    currency: 'USD',
    startDate: '2025-07-08',
    endDate: '2025-07-14',
    participants: [
      { participantId: '108', customRate: 75, advances: 0, deductions: 0, balance: 525 },
      { participantId: '109', customRate: 75, advances: 0, deductions: 0, balance: 525 },
      { participantId: '110', customRate: 75, advances: 0, deductions: 0, balance: 525 },
      { participantId: '111', customRate: 75, advances: 0, deductions: 0, balance: 525 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-pg1',
      type: 'safety',
      title: 'AAU Eligibility & Registration',
      description: 'All players must have current AAU membership and eligibility',
      deadline: '2025-07-07',
      status: 'compliant',
      assignedTo: '102',
      documents: ['aau-cards.pdf', 'eligibility-forms.pdf']
    },
    {
      id: 'comp-pg2',
      type: 'safety',
      title: 'Physical Clearance Forms',
      description: 'Current physical forms required for all players',
      deadline: '2025-07-07',
      status: 'compliant',
      assignedTo: '104',
      documents: ['physicals-2025.pdf']
    }
  ],
  media: [],
  sponsors: [
    {
      id: 'sponsor-pg1',
      sponsor: 'Nike Basketball',
      activation: 'Equipment and Apparel Partnership',
      deadline: '2025-07-07',
      assignedTo: '102',
      status: 'completed',
      deliverables: ['Team shoes', 'Practice gear', 'Tournament uniforms'],
      notes: 'Official footwear and apparel sponsor'
    }
  ]
};

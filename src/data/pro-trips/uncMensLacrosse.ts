import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const uncMensLacrosse: ProTripData = {
  id: 'unc-lax-2025',
  title: 'UNC Men\'s Lacrosse 2025 Season',
  description: 'University of North Carolina Tar Heels Men\'s Lacrosse 2025 season coordination and game travel.',
  location: 'Chapel Hill NC',
  dateRange: 'Feb 1 - May 31, 2025',
  proTripCategory: 'Sports – Pro, Collegiate, Youth',
  tags: ['Sports', 'Lacrosse', 'NCAA Division I', 'UNC'],
  basecamp_name: 'Dorrance Field',
  basecamp_address: '104 Stadium Drive, Chapel Hill, NC 27514',
  broadcasts: [],
  participants: Array.from({ length: 45 }, (_, i) => {
    const id = 201 + i;
    
    if (i < 6) {
      const coaches = ['Joe Breschi', 'Jon Thompson', 'Dave Pietramala', 'Peter Murphy', 'Assistant Coach', 'Graduate Assistant'];
      const name = coaches[i] || `Coach ${i + 1}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Coaches' };
    } else if (i < 35) {
      const players = ['Michael Gianforcaro', 'James Matan', 'Owen Duffy', 'Antonio DeMarco', 'Cooper Frankenheimer', 'Dewey Egan', 'Tayden Bultman', 'Kai Prohaszka', 'Nick Pietramala', 'Dominic Pietramala', 'Hayden Downs', 'Colin Hannigan'];
      const playerIndex = (i - 6) % players.length;
      const playerNumber = Math.floor((i - 6) / 12) + 1;
      const name = players[playerIndex] || `Player ${i - 5}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Players' };
    } else {
      const staff = ['Team Manager', 'Logistics Manager', 'Athletic Trainer', 'Academic Coordinator', 'Video Coordinator', 'Strength Coach', 'Team Doctor', 'Bus Driver', 'Administrative Assistant', 'Compliance Officer'];
      const name = staff[i - 35] || `Staff ${i - 34}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Staff' };
    }
  }),
  budget: {
    total: 125000,
    spent: 45000,
    categories: [
      { name: 'Travel', budgeted: 45000, spent: 18000 },
      { name: 'Accommodation', budgeted: 35000, spent: 15000 },
      { name: 'Meals', budgeted: 25000, spent: 8000 },
      { name: 'Logistics', budgeted: 20000, spent: 4000 }
    ]
  },
  itinerary: [
    {
      date: '2025-03-20',
      events: [
        { time: '07:30', title: 'Team Breakfast', location: 'Hotel Ballroom', type: 'meeting' },
        { time: '09:00', title: 'Bus Departure', location: 'Boshamer Stadium', type: 'travel' },
        { time: '11:30', title: 'Arrival at Duke', location: 'Duke University', type: 'travel' },
        { time: '13:00', title: 'Pre-Game Meal', location: 'Duke Facilities', type: 'meeting' },
        { time: '15:00', title: 'UNC vs Duke', location: 'Koskinen Stadium', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '201',
      name: 'Joe Breschi',
      email: 'breschi@unc.edu',
      avatar: getMockAvatar('Joe Breschi'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'facility-access', 'medical-access'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '202',
      name: 'Jon Thompson',
      email: 'jthompson@unc.edu',
      avatar: getMockAvatar('Jon Thompson'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'offensive-coordination'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '203',
      name: 'Dave Pietramala',
      email: 'dpietramala@unc.edu',
      avatar: getMockAvatar('Dave Pietramala'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'defensive-coordination'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '204',
      name: 'Peter Murphy',
      email: 'pmurphy@unc.edu',
      avatar: getMockAvatar('Peter Murphy'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['team-management', 'assistant-coaching'],
      roomPreferences: ['single-room'],
      dietaryRestrictions: []
    },
    {
      id: '205',
      name: 'Michael Gianforcaro',
      email: 'mgianforcaro@unc.edu',
      avatar: getMockAvatar('Michael Gianforcaro'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '206',
      name: 'James Matan',
      email: 'jmatan@unc.edu',
      avatar: getMockAvatar('James Matan'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '207',
      name: 'Owen Duffy',
      email: 'oduffy@unc.edu',
      avatar: getMockAvatar('Owen Duffy'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '208',
      name: 'Antonio DeMarco',
      email: 'ademarco@unc.edu',
      avatar: getMockAvatar('Antonio DeMarco'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '209',
      name: 'Cooper Frankenheimer',
      email: 'cfrankenheimer@unc.edu',
      avatar: getMockAvatar('Cooper Frankenheimer'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '210',
      name: 'Dewey Egan',
      email: 'degan@unc.edu',
      avatar: getMockAvatar('Dewey Egan'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '211',
      name: 'Tayden Bultman',
      email: 'tbultman@unc.edu',
      avatar: getMockAvatar('Tayden Bultman'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '212',
      name: 'Kai Prohaszka',
      email: 'kprohaszka@unc.edu',
      avatar: getMockAvatar('Kai Prohaszka'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '213',
      name: 'Nick Pietramala',
      email: 'npietramala@unc.edu',
      avatar: getMockAvatar('Nick Pietramala'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '214',
      name: 'Dominic Pietramala',
      email: 'dpietramala2@unc.edu',
      avatar: getMockAvatar('Dominic Pietramala'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '215',
      name: 'Hayden Downs',
      email: 'hdowns@unc.edu',
      avatar: getMockAvatar('Hayden Downs'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    },
    {
      id: '216',
      name: 'Colin Hannigan',
      email: 'channigan@unc.edu',
      avatar: getMockAvatar('Colin Hannigan'),
      role: 'Players',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'locker-room'],
      roomPreferences: ['shared-room'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-unc1',
      room: 'Rooms 401-402',
      hotel: 'Graduate Chapel Hill',
      occupants: ['205', '206'],
      checkIn: '2025-03-19T15:00:00Z',
      checkOut: '2025-03-21T11:00:00Z',
      roomType: 'connecting',
      specialRequests: ['ground-floor', 'team-floor']
    },
    {
      id: 'room-unc2',
      room: 'Rooms 403-404',
      hotel: 'Graduate Chapel Hill',
      occupants: ['207', '208'],
      checkIn: '2025-03-19T15:00:00Z',
      checkOut: '2025-03-21T11:00:00Z',
      roomType: 'connecting',
      specialRequests: ['team-floor']
    }
  ],
  schedule: [
    {
      id: 'sched-unc1',
      type: 'meeting',
      title: 'Team Meeting & Pre-Game Prep',
      startTime: '2025-03-20T07:30:00Z',
      endTime: '2025-03-20T08:30:00Z',
      location: 'Hotel Conference Room',
      participants: ['201', '202', '203', '204'],
      priority: 'high',
      notes: 'Final game strategy and team prep meeting'
    },
    {
      id: 'sched-unc2',
      type: 'meeting',
      title: 'UNC vs Duke - ACC Conference Game',
      startTime: '2025-03-20T15:00:00Z',
      endTime: '2025-03-20T17:00:00Z',
      location: 'Koskinen Stadium, Duke University',
      participants: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '213', '214', '215', '216'],
      priority: 'critical',
      notes: 'ACC conference rivalry game - WHITE away jerseys'
    }
  ],
  perDiem: {
    dailyRate: 65,
    currency: 'USD',
    startDate: '2025-03-19',
    endDate: '2025-03-21',
    participants: [
      { participantId: '205', customRate: 65, advances: 0, deductions: 0, balance: 195 },
      { participantId: '206', customRate: 65, advances: 0, deductions: 0, balance: 195 },
      { participantId: '207', customRate: 65, advances: 0, deductions: 0, balance: 195 },
      { participantId: '208', customRate: 65, advances: 0, deductions: 0, balance: 195 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-unc1',
      type: 'NCAA',
      title: 'NCAA Eligibility Verification',
      description: 'All student-athletes must maintain NCAA eligibility standards',
      deadline: '2025-03-18',
      status: 'compliant',
      assignedTo: '201',
      documents: ['ncaa-eligibility.pdf', 'academic-standing.pdf']
    },
    {
      id: 'comp-unc2',
      type: 'safety',
      title: 'Medical Clearance & Insurance',
      description: 'Current medical clearance and insurance documentation',
      deadline: '2025-03-18',
      status: 'compliant',
      assignedTo: '204',
      documents: ['medical-clearance-2025.pdf', 'insurance-docs.pdf']
    }
  ],
  media: [],
  sponsors: [
    {
      id: 'sponsor-unc1',
      sponsor: 'Nike Lacrosse',
      activation: 'Official Equipment and Apparel Partner',
      deadline: '2025-03-15',
      assignedTo: '202',
      status: 'completed',
      deliverables: ['Team uniforms', 'Practice gear', 'Equipment bags'],
      notes: 'Official UNC Athletics Nike partnership'
    }
  ]
};

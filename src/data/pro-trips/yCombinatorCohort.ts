import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const yCombinatorCohort: ProTripData = {
  id: 'a16z-speedrun-2026',
  title: 'a16z Speedrun • 2026 Accelerator Cohort',
  description: 'Participation in Andreessen Horowitz Speedrun 2026 accelerator program in Menlo Park.',
  location: 'Menlo Park, CA',
  dateRange: 'Jan 15 - Mar 30, 2026',
  proTripCategory: 'Other',
  tags: ['Startup', 'Accelerator', 'Andreessen Horowitz'],
  basecamp_name: 'Andreessen Horowitz HQ',
  basecamp_address: '2865 Sand Hill Rd, Menlo Park, CA 94025',
  broadcasts: [],
  participants: Array.from({ length: 35 }, (_, i) => {
    const id = 24 + i;
    
    if (i < 5) {
      const partners = ['Marc Andreessen', 'Chris Dixon', 'Ben Horowitz', 'Jeff Jordan', 'Scott Weiss'];
      const name = partners[i] || `Partner ${i + 1}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Partners' };
    } else if (i < 25) {
      const founderNames = ['Alexis Rivera', 'Priya Krishnan', 'David Chen', 'Sarah Johnson', 'Michael Torres', 'Jessica Wang', 'Ryan Martinez', 'Emily Davis', 'Kevin Liu', 'Amanda Rodriguez'];
      const founderIndex = (i - 5) % founderNames.length;
      const companyNumber = Math.floor((i - 5) / 10) + 1;
      const name = `${founderNames[founderIndex]} (Startup ${companyNumber})`;
      return { id, name, avatar: getMockAvatar(name), role: 'Founders' };
    } else {
      const staff = ['Program Director', 'Venture Partner 1', 'Venture Partner 2', 'EIR 1', 'EIR 2', 'Operations Manager', 'Event Coordinator', 'Technical Advisor', 'Legal Counsel', 'Finance Manager'];
      const name = staff[i - 25] || `Staff ${i - 24}`;
      return { id, name, avatar: getMockAvatar(name), role: 'Staff' };
    }
  }),
  budget: {
    total: 120000,
    spent: 30000,
    categories: [
      { name: 'Accommodation', budgeted: 25000, spent: 8000 },
      { name: 'Living Expenses', budgeted: 15000, spent: 5000 },
      { name: 'Transportation', budgeted: 3000, spent: 1500 },
      { name: 'Program Fees', budgeted: 2000, spent: 500 }
    ]
  },
  itinerary: [
    {
      date: '2025-02-01',
      events: [
        { time: '09:00', title: 'a16z Orientation', location: 'Andreessen Horowitz HQ', type: 'meeting' },
        { time: '11:00', title: 'Founder Introductions', location: 'a16z Auditorium', type: 'meeting' },
        { time: '14:00', title: 'First Partner Meeting', location: 'Conference Room A', type: 'meeting' },
        { time: '17:00', title: 'Cohort Mixer', location: 'a16z Common Area', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '24',
      name: 'Marc Andreessen',
      email: 'marc@a16z.com',
      avatar: '/images/avatars/blank-05.png',
      role: 'Partners',
      credentialLevel: 'AllAccess',
      permissions: ['partner-access', 'a16z-facilities'],
      roomPreferences: ['shared-housing', 'san-francisco'],
      dietaryRestrictions: ['vegetarian']
    },
    {
      id: '25',
      name: 'Chris Dixon',
      email: 'chris@a16z.com',
      avatar: '/images/avatars/blank-06.png',
      role: 'Partners',
      credentialLevel: 'AllAccess',
      permissions: ['partner-access', 'a16z-facilities'],
      roomPreferences: ['shared-housing', 'san-francisco'],
      dietaryRestrictions: []
    },
    {
      id: '26',
      name: 'Alexis Rivera',
      email: 'alexis@synthai.com',
      avatar: '/images/avatars/blank-07.png',
      role: 'Founders',
      credentialLevel: 'AllAccess',
      permissions: ['founder-access', 'a16z-facilities'],
      roomPreferences: ['shared-housing', 'san-francisco'],
      dietaryRestrictions: ['gluten-free']
    },
    {
      id: '27',
      name: 'Priya Krishnan',
      email: 'priya@loomworks.com',
      avatar: '/images/avatars/blank-08.png',
      role: 'Founders',
      credentialLevel: 'AllAccess',
      permissions: ['founder-access', 'a16z-facilities'],
      roomPreferences: ['shared-housing', 'menlo-park'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-yc1',
      room: '3BR Apartment',
      hotel: 'Mission District Housing',
      occupants: ['24', '25', '26', '27'],
      checkIn: '2025-02-01T14:00:00Z',
      checkOut: '2025-03-31T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['startup-workspace', 'high-speed-internet']
    }
  ],
  schedule: [
    {
      id: 'sched-yc1',
      type: 'meeting',
      title: 'Demo Day Preparation',
      startTime: '2025-03-25T10:00:00Z',
      endTime: '2025-03-25T18:00:00Z',
      location: 'Andreessen Horowitz HQ',
      participants: ['24', '25', '26', '27'],
      priority: 'critical',
      notes: 'Final pitch preparation and rehearsal'
    }
  ],
  perDiem: {
    dailyRate: 75,
    currency: 'USD',
    startDate: '2025-02-01',
    endDate: '2025-03-31',
    participants: [
      { participantId: '24', customRate: 75, advances: 0, deductions: 0, balance: 4425 },
      { participantId: '25', customRate: 75, advances: 0, deductions: 0, balance: 4425 },
      { participantId: '26', customRate: 75, advances: 0, deductions: 0, balance: 4425 },
      { participantId: '27', customRate: 75, advances: 0, deductions: 0, balance: 4425 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-yc1',
      type: 'safety',
      title: 'a16z Program Compliance',
      description: 'Participants must attend required sessions and meet milestones',
      deadline: '2025-03-31',
      status: 'compliant',
      assignedTo: '24',
      documents: ['a16z-requirements.pdf']
    }
  ],
  media: [
    {
      id: 'media-yc1',
      type: 'interview',
      outlet: 'TechCrunch',
      contactPerson: 'Sarah Perez',
      scheduledTime: '2025-03-28T14:00:00Z',
      duration: 30,
      location: 'a16z Demo Day',
      participants: ['24', '25'],
      status: 'scheduled'
    }
  ],
  sponsors: []
};

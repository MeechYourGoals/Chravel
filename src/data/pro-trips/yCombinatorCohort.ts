import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const yCombinatorCohort: ProTripData = {
  id: 'creator-house-content-shoot-2026',
  title: 'Creator House — Multi-Day Content Shoot',
  description: 'Multi-day content production shoot with crew, talent, tight schedules, locations, releases, shoot times, payments, logistics, and file management.',
  location: 'Miami, FL',
  dateRange: 'Aug 3 - Aug 8, 2026',
  proTripCategory: 'productions',
  tags: [],
  basecamp_name: 'Miami Creator House',
  basecamp_address: '1200 Ocean Dr, Miami Beach, FL 33139',
  tasks: [
    {
      id: 'task-creator-1',
      title: 'Finalize content release forms',
      description: 'All talent must sign content release agreements before shooting',
      completed: true,
      due_at: '2026-08-02',
      assigned_to: 'production-manager',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-creator-2',
      title: 'Confirm camera equipment delivery',
      description: 'Verify all camera gear and lighting equipment arrives on site',
      completed: false,
      due_at: '2026-08-03',
      assigned_to: 'camera-lead',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-creator-1',
      question: 'Preferred shoot schedule for Day 3?',
      options: [
        { id: 'opt1', text: 'Morning (8 AM - 12 PM)', votes: 3 },
        { id: 'opt2', text: 'Afternoon (1 PM - 5 PM)', votes: 5 },
        { id: 'opt3', text: 'Evening (6 PM - 10 PM)', votes: 1 }
      ],
      total_votes: 9,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-creator-1',
      url: 'https://www.miamibeach.com',
      title: 'Miami Beach Tourist Info',
      description: 'Local attractions and filming locations',
      domain: 'miamibeach.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-creator-2',
      url: 'https://www.dropbox.com/shared/content-files',
      title: 'Shared Content Drive',
      description: 'Cloud storage for all shoot footage and files',
      domain: 'dropbox.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-creator-1',
      senderId: '1',
      message: 'Beach shoot moved to 3 PM due to weather. Talent please be ready by 2:30 PM.',
      targetTrips: ['creator-house-content-shoot-2026'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4', '5']
    },
    {
      id: 'bc-creator-2',
      senderId: '4',
      message: "Great work today everyone! Tomorrow's call time is 9 AM for indoor studio setup.",
      targetTrips: ['creator-house-content-shoot-2026'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['1', '2', '3']
    }
  ],
  participants: [
    { id: '1', name: 'Darren Watkins Jr.', avatar: getMockAvatar('Darren Watkins Jr.'), role: 'Talent' },
    { id: '2', name: 'Kai Cenat', avatar: getMockAvatar('Kai Cenat'), role: 'Talent' },
    { id: '3', name: 'Adin Ross', avatar: getMockAvatar('Adin Ross'), role: 'Talent' },
    { id: '4', name: 'Nicole Perez', avatar: getMockAvatar('Nicole Perez'), role: 'Production Manager' },
    { id: '5', name: 'Trevor Mills', avatar: getMockAvatar('Trevor Mills'), role: 'Camera & Editing' },
    { id: '6', name: 'Jamal Wright', avatar: getMockAvatar('Jamal Wright'), role: 'Logistics & Security' }
  ],
  budget: {
    total: 85000,
    spent: 55000,
    categories: [
      { name: 'Talent Fees', budgeted: 45000, spent: 30000 },
      { name: 'Production & Equipment', budgeted: 25000, spent: 18000 },
      { name: 'Lodging & Meals', budgeted: 10000, spent: 5000 },
      { name: 'Logistics & Security', budgeted: 5000, spent: 2000 }
    ]
  },
  itinerary: [
    {
      date: '2026-08-03',
      events: [
        { time: '09:00', title: 'Crew Arrival & Equipment Setup', location: 'Miami Creator House', type: 'meeting' },
        { time: '11:00', title: 'First Shoot — Outdoor Beach Scene', location: 'South Beach', type: 'meeting' },
        { time: '14:00', title: 'Studio Shoot — Indoor Content', location: 'Creator House Studio', type: 'meeting' },
        { time: '18:00', title: 'Dailies Review & Editing', location: 'Production Room', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Darren Watkins Jr.',
      email: 'darren@talent.com',
      avatar: getMockAvatar('Darren Watkins Jr.'),
      role: 'Talent',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Kai Cenat',
      email: 'kai@talent.com',
      avatar: getMockAvatar('Kai Cenat'),
      role: 'Talent',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'Adin Ross',
      email: 'adin@talent.com',
      avatar: getMockAvatar('Adin Ross'),
      role: 'Talent',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '4',
      name: 'Nicole Perez',
      email: 'nicole@production.com',
      avatar: getMockAvatar('Nicole Perez'),
      role: 'Production Manager',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '5',
      name: 'Trevor Mills',
      email: 'trevor@camera.com',
      avatar: getMockAvatar('Trevor Mills'),
      role: 'Camera & Editing',
      credentialLevel: 'Backstage',
      permissions: ['editor'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '6',
      name: 'Jamal Wright',
      email: 'jamal@logistics.com',
      avatar: getMockAvatar('Jamal Wright'),
      role: 'Logistics & Security',
      credentialLevel: 'Backstage',
      permissions: ['editor'],
      roomPreferences: [],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-creator1',
      room: 'Master Suite',
      hotel: 'Miami Creator House',
      occupants: ['1', '2', '3'],
      checkIn: '2026-08-03T12:00:00Z',
      checkOut: '2026-08-08T11:00:00Z',
      roomType: 'double',
      specialRequests: ['streaming-setup', 'soundproofing']
    }
  ],
  schedule: [
    {
      id: 'sched-creator1',
      type: 'show',
      title: 'Beach Content Shoot',
      startTime: '2026-08-03T11:00:00Z',
      endTime: '2026-08-03T15:00:00Z',
      location: 'South Beach, Miami',
      participants: ['1', '2', '3', '4', '5'],
      priority: 'high',
      notes: 'Main outdoor content shoot with all talent'
    }
  ],
  perDiem: {
    dailyRate: 150,
    currency: 'USD',
    startDate: '2026-08-03',
    endDate: '2026-08-08',
    participants: [
      { participantId: '4', customRate: 200, advances: 0, deductions: 0, balance: 1200 },
      { participantId: '5', customRate: 175, advances: 0, deductions: 0, balance: 1050 },
      { participantId: '6', customRate: 150, advances: 0, deductions: 0, balance: 900 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-creator1',
      type: 'safety',
      title: 'Content Release Agreements',
      description: 'All talent must sign content release forms and location permits secured',
      deadline: '2026-08-02',
      status: 'compliant',
      assignedTo: '4',
      documents: ['talent-releases.pdf', 'location-permits.pdf']
    }
  ],
  media: [],
  sponsors: []
};

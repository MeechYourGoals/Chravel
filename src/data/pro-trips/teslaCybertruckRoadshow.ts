import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const teslaCybertruckRoadshow: ProTripData = {
  id: 'chravel-first-company-offsite-2026',
  title: 'ChravelApp — First Company Off-Site',
  description: 'Internal company off-site for strategy planning, team bonding, and foundational work. Invite-only event with travel and lodging coordination.',
  location: 'Joshua Tree, CA',
  dateRange: 'Apr 17 - Apr 20, 2026',
  proTripCategory: 'Business Travel',
  tags: [],
  basecamp_name: 'The Ruin Venue',
  basecamp_address: '61896 Sunburst Ave, Joshua Tree, CA 92252',
  tasks: [
    {
      id: 'task-offsite-1',
      title: 'Confirm venue accommodations and catering',
      description: 'Finalize sleeping arrangements and meal plans for 14 attendees',
      completed: true,
      due_at: '2026-04-16',
      assigned_to: 'ops-lead',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-offsite-2',
      title: 'Prepare strategy session materials',
      description: 'Print agendas, presentation materials, and whiteboard supplies',
      completed: false,
      due_at: '2026-04-17',
      assigned_to: 'ceo',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-offsite-1',
      question: 'Preferred evening activity for Day 2?',
      options: [
        { id: 'opt1', text: 'Stargazing & Bonfire', votes: 9 },
        { id: 'opt2', text: 'Hiking at Sunset', votes: 3 },
        { id: 'opt3', text: 'Team Dinner & Games', votes: 2 }
      ],
      total_votes: 14,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-offsite-1',
      url: 'https://www.theruinvenue.com',
      title: 'The Ruin Venue - Joshua Tree',
      description: 'Venue information and amenities',
      domain: 'theruinvenue.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-offsite-2',
      url: 'https://www.joshuatreenp.com',
      title: 'Joshua Tree National Park',
      description: 'Nearby hiking and outdoor activities',
      domain: 'joshuatreenp.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-offsite-1',
      senderId: '1',
      message: 'Final headcount confirmed at 14. See you all Thursday morning at 9 AM!',
      targetTrips: ['chravel-first-company-offsite-2026'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4']
    },
    {
      id: 'bc-offsite-2',
      senderId: '4',
      message: 'Lodging assignments finalized. Shared rooms confirmed and dietary notes collected.',
      targetTrips: ['chravel-first-company-offsite-2026'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['1', '2']
    }
  ],
  participants: [
    { id: '1', name: 'Carlton Anderson', avatar: getMockAvatar('Carlton Anderson'), role: 'CEO' },
    { id: '2', name: 'Percy Quinton', avatar: getMockAvatar('Percy Quinton'), role: 'Head of Finance' },
    { id: '3', name: 'David Gerald', avatar: getMockAvatar('David Gerald'), role: 'Sports Marketing' },
    { id: '4', name: 'Cathy Sandiego', avatar: getMockAvatar('Cathy Sandiego'), role: 'Ops & People' },
    { id: '5', name: 'Jared Kincaid', avatar: getMockAvatar('Jared Kincaid'), role: 'Finance & Planning' }
  ],
  budget: {
    total: 25000,
    spent: 18500,
    categories: [
      { name: 'Venue & Lodging', budgeted: 12000, spent: 9500 },
      { name: 'Catering & Meals', budgeted: 8000, spent: 6000 },
      { name: 'Travel & Transport', budgeted: 3500, spent: 2500 },
      { name: 'Activities & Materials', budgeted: 1500, spent: 500 }
    ]
  },
  itinerary: [
    {
      date: '2026-04-17',
      events: [
        { time: '09:00', title: 'Team Arrival & Check-In', location: 'The Ruin Venue', type: 'meeting' },
        { time: '11:00', title: 'Opening Session & Vision Alignment', location: 'Main Hall', type: 'meeting' },
        { time: '14:00', title: 'Strategy Breakout Sessions', location: 'Conference Room', type: 'meeting' },
        { time: '18:00', title: 'Stargazing & Bonfire', location: 'Outdoor Area', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Carlton Anderson',
      email: 'carlton@chravelapp.com',
      avatar: getMockAvatar('Carlton Anderson'),
      role: 'CEO',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Percy Quinton',
      email: 'percy@chravelapp.com',
      avatar: getMockAvatar('Percy Quinton'),
      role: 'Head of Finance',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'David Gerald',
      email: 'david@chravelapp.com',
      avatar: getMockAvatar('David Gerald'),
      role: 'Sports Marketing',
      credentialLevel: 'AllAccess',
      permissions: ['editor'],
      roomPreferences: [],
      dietaryRestrictions: []
    },
    {
      id: '4',
      name: 'Cathy Sandiego',
      email: 'cathy@chravelapp.com',
      avatar: getMockAvatar('Cathy Sandiego'),
      role: 'Ops & People',
      credentialLevel: 'AllAccess',
      permissions: ['admin'],
      roomPreferences: [],
      dietaryRestrictions: ['vegetarian']
    },
    {
      id: '5',
      name: 'Jared Kincaid',
      email: 'jared@chravelapp.com',
      avatar: getMockAvatar('Jared Kincaid'),
      role: 'Finance & Planning',
      credentialLevel: 'AllAccess',
      permissions: ['editor'],
      roomPreferences: [],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-offsite1',
      room: 'Shared Cabin A',
      hotel: 'The Ruin Venue',
      occupants: ['1', '2'],
      checkIn: '2026-04-17T09:00:00Z',
      checkOut: '2026-04-20T12:00:00Z',
      roomType: 'double',
      specialRequests: []
    }
  ],
  schedule: [
    {
      id: 'sched-offsite1',
      type: 'meeting',
      title: 'Opening Session & Vision Alignment',
      startTime: '2026-04-17T11:00:00Z',
      endTime: '2026-04-17T13:00:00Z',
      location: 'The Ruin Venue - Main Hall',
      participants: ['1', '2', '3', '4', '5'],
      priority: 'high',
      notes: 'Kickoff session for company strategy and team alignment'
    }
  ],
  perDiem: {
    dailyRate: 0,
    currency: 'USD',
    startDate: '2026-04-17',
    endDate: '2026-04-20',
    participants: []
  },
  settlement: [],
  medical: [],
  compliance: [],
  media: [],
  sponsors: []
};
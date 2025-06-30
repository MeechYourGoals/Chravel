import { ProTripData } from '../../types/pro';

export const harrisElementaryFieldTrip: ProTripData = {
  id: 'harris-elementary-dc-field-trip-2025',
  title: 'Harris Elementary 8th-Grade DC Field Trip',
  description: 'Educational field trip to Washington DC for 8th grade students from Harris Elementary.',
  location: 'Washington DC',
  dateRange: 'Apr 10 - Apr 14, 2025',
  category: 'Education',
  proTripCategory: 'Education & Academic',
  tags: ['Education', 'Field Trip', 'Middle School'],
  participants: [
    { id: 16, name: 'Ms. Jennifer Wilson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', role: 'Teacher' },
    { id: 17, name: 'Mr. David Chen', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', role: 'Teacher' },
    { id: 18, name: 'Student Group A', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', role: 'Student' },
    { id: 19, name: 'Student Group B', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', role: 'Student' }
  ],
  budget: {
    total: 15000,
    spent: 5000,
    categories: [
      { name: 'Transportation', budgeted: 8000, spent: 3000 },
      { name: 'Accommodation', budgeted: 4000, spent: 1500 },
      { name: 'Meals', budgeted: 2000, spent: 500 },
      { name: 'Activities', budgeted: 1000, spent: 0 }
    ]
  },
  itinerary: [
    {
      date: '2025-04-10',
      events: [
        { time: '06:00', title: 'School Departure', location: 'Harris Elementary', type: 'travel' },
        { time: '12:00', title: 'Arrival in Washington DC', location: 'Union Station', type: 'travel' },
        { time: '14:00', title: 'Capitol Building Tour', location: 'US Capitol', type: 'meeting' },
        { time: '18:00', title: 'Hotel Check-in', location: 'Embassy Suites DC', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '16',
      name: 'Ms. Jennifer Wilson',
      email: 'jwilson@harriselementary.edu',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face',
      role: 'Teacher',
      credentialLevel: 'AllAccess',
      permissions: ['student-supervision', 'emergency-contact'],
      roomPreferences: ['single-room', 'near-students'],
      dietaryRestrictions: []
    },
    {
      id: '17',
      name: 'Mr. David Chen',
      email: 'dchen@harriselementary.edu',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      role: 'Teacher',
      credentialLevel: 'AllAccess',
      permissions: ['student-supervision', 'emergency-contact'],
      roomPreferences: ['single-room', 'near-students'],
      dietaryRestrictions: ['vegetarian']
    },
    {
      id: '18',
      name: 'Student Group A (13 students)',
      email: 'students@harriselementary.edu',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      role: 'Student',
      credentialLevel: 'Guest',
      permissions: ['supervised-access'],
      roomPreferences: ['quad-rooms'],
      dietaryRestrictions: ['various']
    },
    {
      id: '19',
      name: 'Student Group B (12 students)',
      email: 'students@harriselementary.edu',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      role: 'Student',
      credentialLevel: 'Guest',
      permissions: ['supervised-access'],
      roomPreferences: ['quad-rooms'],
      dietaryRestrictions: ['various']
    }
  ],
  roomAssignments: [
    {
      id: 'room-he1',
      room: 'Suite 401-404',
      hotel: 'Embassy Suites DC',
      occupants: ['16', '17', '18', '19'],
      checkIn: '2025-04-10T15:00:00Z',
      checkOut: '2025-04-14T10:00:00Z',
      roomType: 'connecting',
      specialRequests: ['student-supervision', 'extra-security']
    }
  ],
  equipment: [],
  schedule: [
    {
      id: 'sched-he1',
      type: 'meeting',
      title: 'Smithsonian Museum Visit',
      startTime: '2025-04-11T09:00:00Z',
      endTime: '2025-04-11T12:00:00Z',
      location: 'National Museum of Natural History',
      participants: ['16', '17', '18', '19'],
      priority: 'high',
      notes: 'Pre-arranged group tour'
    }
  ],
  perDiem: {
    dailyRate: 25,
    currency: 'USD',
    startDate: '2025-04-10',
    endDate: '2025-04-14',
    participants: [
      { participantId: '18', customRate: 25, advances: 0, deductions: 0, balance: 100 },
      { participantId: '19', customRate: 25, advances: 100, deductions: 0, balance: 0 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-he1',
      type: 'safety',
      title: 'Student Travel Authorization',
      description: 'All students must have signed permission slips and emergency contacts',
      deadline: '2025-04-08',
      status: 'compliant',
      assignedTo: '16',
      documents: ['permission-slips.pdf', 'emergency-contacts.pdf']
    }
  ],
  media: [],
  sponsors: []
};
